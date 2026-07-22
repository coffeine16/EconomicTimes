# Deploy the AirCase API to Cloud Run

**~15 minutes. The result: `Run full pipeline` in the console actually runs — the
nine agents execute server-side and the map refreshes with the new output.**

## Why this works in an HTTP request

The 9-agent chain does **not** include ingestion, the panel build, or fusion
training — those are heavy batch data-engineering and stay offline
(`intelligence/orchestrator.py` is explicit about the split). The agents read
**precomputed artifacts**, so a full chain run is **~15 seconds**. That is what
makes a live "Run pipeline" button honest rather than decorative.

The container therefore ships the panel + fusion field (~30 MB), not the data
platform. `data/raw/truth.parquet` (46 MB) is deliberately excluded — it exists
only to score the synthetic world in the eval scripts.

---

## Step 0 — make sure `data/` holds the city you want to serve

The image bakes whatever is in `data/outputs/` at build time. Serving synthetic
data behind a frontend showing live Delhi is exactly the sort of mismatch that
embarrasses on stage.

```powershell
$env:AQ_CITY="delhi"; $env:AQ_WINDOW_END="2025-11-30"; $env:PYTHONPATH="."
python scripts/run_pipeline.py --full
# sanity: hotspots should be around lat 28.x for Delhi
python -c "import json,h3;h=json.load(open('data/outputs/hotspots.json'));print(h3.cell_to_latlng(h[0]['cell']))"
```

## Step 1 — deploy (builds in the cloud; no local Docker needed)

```bash
gcloud config set project aq-intelligence
gcloud run deploy aircase-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars AQ_CITY=delhi
```

- **2 GiB / 2 CPU** — pandas + LightGBM need the headroom; 512 MiB OOMs on import.
- **timeout 300** — the chain is ~15s, but a cold start plus nine agents wants slack.
- First deploy takes ~5–8 minutes (image build). Later ones are faster.

It prints a service URL like `https://aircase-api-xxxxx.asia-south1.run.app`.

## Step 2 — verify before wiring the frontend

```bash
API=https://aircase-api-xxxxx.asia-south1.run.app
curl -s $API/health
curl -s $API/hotspots | head -c 200
curl -s -X POST $API/run/agent -H "Content-Type: application/json" \
     -d '{"agent":"detection"}'      # single agent, should return in seconds
```

If `/hotspots` 404s, the data did not reach the image — check `.gcloudignore`
(see the warning at the top of that file; it is the usual cause).

## Step 3 — point the frontend at it

In Vercel → the AirCase project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | your Cloud Run URL, no trailing slash |

Redeploy. The console now calls the live API and falls back to the committed
static JSON if it is ever unreachable — the demo cannot go dark either way.

---

## What the live button does and does not do

**Does:** re-runs the nine agents against the precomputed panel — detection,
attribution, forecast, prioritisation, memo, advisory, voice, ledger, audit — and
rewrites the JSON contracts the map reads.

**Does not:** re-ingest satellite/fire/station data or retrain the fusion model.
That is the batch pipeline, it takes minutes and needs GEE credentials, and it is
correctly kept out of a request path.

**City:** the container serves whichever city was baked in (`AQ_CITY`, default
`delhi`). Switching city in the UI still switches the *map* — that reads the
per-city static bundles — but a live agent run always runs against the baked city.

## Cost

Scale-to-zero. At demo traffic this is inside the free tier; idle costs nothing.
Tear down with `gcloud run services delete aircase-api --region asia-south1`.

## One thing to know before this outlives the demo

The API runs `--allow-unauthenticated` with `allow_origins=["*"]`. For read-only
endpoints serving public environmental data that is fine and deliberate. But
`POST /run/agent` changes state and costs ~15s of CPU per call, so anyone who
finds the URL can trigger it. Acceptable for a judged demo; **not** acceptable if
this ever runs unattended. Before that happens, either restrict CORS to the
Vercel origin and put the run endpoint behind a shared secret, or drop
`--allow-unauthenticated` and have the frontend call it through an authenticated
proxy. Stated here so it is a decision, not an oversight.
