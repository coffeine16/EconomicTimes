# GCP + Google Earth Engine — setup runbook

**Owner:** Shyam (GCP account + $300 trial credits)
**Why this is urgent:** detection runs *entirely* on satellite + fire. Our satellite
is currently **synthetic**. Until this is done, every number the platform produces
is unvalidated on real data, and `--synthetic`-less runs silently join *real*
stations to a *fake* satellite and produce a confident, meaningless map.

The signup has **approval latency measured in days**. The clicking is ~20 minutes.
Do the clicking today; the code can wait.

---

## ⚠️ Read this before you click anything

**Earth Engine is FREE for non-commercial use.** When you register, you will be
asked to choose a usage type:

- **Non-commercial / research / education → free.** ✅ Pick this. Hackathon
  project, no revenue, no client.
- **Commercial → paid**, and it will start eating the $300 credits for compute
  that should cost us nothing.

Picking the wrong one is the single most expensive mistake available in this
runbook. **The $300 credits are for hosting** (a small VM for n8n, Cloud Run for
the API) — not for Earth Engine.

Second: **never commit the service-account JSON key.** It is a private credential.
`data/` and `*.json` keys are gitignored; if you leak one, revoke it in the console
immediately, don't just delete the commit.

---

## Part A — Earth Engine access (the critical path)

### A1. Create the Cloud project
1. <https://console.cloud.google.com> → project dropdown → **New Project**
2. Name it something like `aq-intelligence`. Note the **Project ID** (it is *not*
   the display name — it looks like `aq-intelligence-431207`). You will need it.
3. **Billing: Earth Engine does NOT require it on the Community Tier.** Link the
   trial billing account anyway — not for Earth Engine, but because **Cloud Storage
   exports do need it**, and it's what the $300 credits are attached to. Earth
   Engine itself stays free as long as the project is registered non-commercial.

### A2. Enable the APIs
In the project, enable:
- **Earth Engine API**
- **Cloud Storage API** (for exporting the satellite tables)

Console → *APIs & Services* → *Enable APIs and Services* → search → Enable.

### A3. Register the project for Earth Engine
1. Go to <https://code.earthengine.google.com/register> (this is a questionnaire in
   the Cloud console — since 2024-06-17 **every** Cloud project using Earth Engine
   must be registered as commercial or non-commercial, or it gets no access).
2. Select the Cloud project you just made.
3. Choose **non-commercial / unpaid** usage (see the warning above).
   - **Community Tier** → free, **no billing account required**. This is us.
   - *Contributor Tier* → also free for Earth Engine, but requires a billing
     account for identity verification. Either is fine; Community is simpler.
4. Submit. **This is the step with approval latency.** It may be instant, it may
   take a couple of days. Do it first and go do something else.

Verify it worked: <https://code.earthengine.google.com> should open the Code Editor
with your project selected, and this should run:

```javascript
var img = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2').first();
print(img);
```

If that prints an image, we have access. **Tell the team the moment it does.**

### A4. Service account (so the pipeline can run without a browser)
1. Console → *IAM & Admin* → *Service Accounts* → **Create Service Account**
2. Name: `aq-earthengine`
3. Grant it these roles — **all three**:
   - **Earth Engine Resource Viewer** (`roles/earthengine.viewer`)
   - **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`)
     ← ⚠️ **easy to miss, and nothing works without it.** The Earth Engine API needs
     `serviceusage.services.use` on the project. Without this role the smoke test in
     A6 fails with an opaque permissions error and you will waste an hour on it.
     (Owner/Editor also grant it, but don't hand a service account Owner.)
   - **Storage Object Admin** (`roles/storage.objectAdmin`) — for the export bucket
4. Open the service account → *Keys* → **Add Key → Create new key → JSON**
5. It downloads a `.json`. **Save it as `secrets/gee-service-account.json`** in the
   repo (that path is gitignored). Do not paste it in Discord.

Or just do it from the CLI:

```bash
PROJECT_ID=<your-project-id>
SA="aq-earthengine@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create aq-earthengine --project="$PROJECT_ID"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA}" --role="roles/earthengine.viewer"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA}" --role="roles/serviceusage.serviceUsageConsumer"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA}" --role="roles/storage.objectAdmin"

gcloud iam service-accounts keys create secrets/gee-service-account.json \
  --iam-account="$SA"
```

> **Note:** service accounts now inherit Earth Engine access from the *registered
> Cloud project* via these IAM roles. The old separate registration flow at
> `signup.earthengine.google.com/#!/service_accounts` is legacy — you should not
> need it. If you land on it, you're on the wrong path.

### A5. Create the export bucket
```bash
gcloud storage buckets create gs://aq-intel-s5p --location=asia-south1
```
(`asia-south1` = Mumbai. Keep everything in one region — cross-region egress costs
money and adds latency.)

### A6. Local install + smoke test
```bash
pip install earthengine-api google-cloud-storage
```

```python
import ee
creds = ee.ServiceAccountCredentials(
    "aq-earthengine@<PROJECT_ID>.iam.gserviceaccount.com",
    "secrets/gee-service-account.json",
)
ee.Initialize(creds, project="<PROJECT_ID>")

img = ee.ImageCollection("COPERNICUS/S5P/OFFL/L3_NO2").first()
print(img.bandNames().getInfo())     # should print a list of band names
```

**When this prints band names, you are done with Part A.** Post the Project ID and
say "GEE is live" — that unblocks the collector.

### If the smoke test fails
| error says | it means |
|---|---|
| `Permission 'serviceusage.services.use' denied` | missing **Service Usage Consumer** — step A4, role 2 |
| `not signed up for Earth Engine` / `project is not registered` | A3 hasn't been approved yet. Wait, don't debug. |
| `Earth Engine API has not been used in project ... before` | A2 — enable the Earth Engine API |
| `Caller does not have permission` on export | missing **Storage Object Admin**, or the bucket is in another project |

Ninety percent of failures here are A3 not being approved yet. **Check the
registration status before debugging anything else.**

---

## Part B — What we're pulling (context, not your job)

Four Sentinel-5P products, the same four the detector already expects:

| dataset | band we want | fingerprints |
|---|---|---|
| `COPERNICUS/S5P/OFFL/L3_NO2` | `tropospheric_NO2_column_number_density` | traffic, combustion, industry |
| `COPERNICUS/S5P/OFFL/L3_SO2` | `SO2_column_number_density` | **industry** (point-source tracer) |
| `COPERNICUS/S5P/OFFL/L3_CO` | `CO_column_number_density` | combustion |
| `COPERNICUS/S5P/OFFL/L3_AER_AI` | `absorbing_aerosol_index` | **smoke / burning** |

Two facts that shape the design and are worth knowing:

- **S5P's real footprint is ~5.5 × 3.5 km**, an order of magnitude coarser than our
  460 m H3 cells. The GEE L3 product is *gridded* to ~1113 m, but that does not
  create information that isn't there. Our synthetic world already blurs to match,
  so this is expected, not a surprise.
- **One overpass per day, ~13:30 local, with cloud gaps.** This is why the detector
  aggregates over 24 h / 7 d / 30 d medians instead of trusting any single day —
  and why S5P can *never* see a traffic rush-hour peak.

The plan: build a FeatureCollection of our 1,210 H3 cell polygons, `reduceRegions`
a daily 4-band composite over it, and `Export.table.toCloudStorage` as CSV — then
the collector reads the CSV into the same schema `panel.py` already consumes.
**I'll write that collector once the Project ID lands.**

### The other satellite — closing the construction blind spot
Construction dust is currently **0/3**: coarse PM, no S5P tracer, doesn't burn.
**Sentinel-2** (`COPERNICUS/S2_SR_HARMONIZED`) is 10 m optical, free, ~5-day
revisit — it can literally *see* excavation and cleared ground. A bare-soil index
differenced over a few months finds new construction sites. **Same GEE auth**, so
it costs nothing extra to set up. This is phase 2, but it is the only thing that
closes that gap.

---

## Part C — Deployment

> **Read this first: do not let infrastructure eat the hackathon.** We are judged
> on the platform, not the Terraform. The minimum viable deployment below is a few
> hours. Everything after it is optional. If you are choosing between "n8n is
> deployed" and "the demo works", choose the demo.

### C1. Minimum viable (recommended)

| piece | where | cost |
|---|---|---|
| Frontend | **Vercel** free tier | $0 |
| Serving API (FastAPI, read-only) | **Cloud Run** | ~$0 (scales to zero) |
| Batch pipeline | **Cloud Run Job** on a schedule, or just run it locally | ~$0 |
| n8n | **e2-small VM** + docker-compose + Caddy | ~$13/mo from credits |
| Postgres | **Supabase free tier** | $0 |

Supabase over Cloud SQL deliberately: it's free, it has auth and storage built in,
and Cloud SQL would quietly chew the credits.

**Deploy the API:**
```bash
gcloud run deploy aq-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "PYTHONPATH=."
```
The API is read-only and serves precomputed JSON, so it needs no secrets and no
database. That is by design (principle 3: heavy compute in batch, serving stays
read-only).

**n8n VM:**
```bash
gcloud compute instances create n8n \
  --machine-type=e2-small \
  --zone=asia-south1-a \
  --image-family=debian-12 --image-project=debian-cloud \
  --tags=http-server,https-server

gcloud compute addresses create n8n-ip --region=asia-south1   # static IP, needed for webhooks
```
Then docker-compose (n8n + Caddy for TLS) on the box. Keshav owns what runs on it;
you own that the box exists and has a static IP and a DNS name.

### C2. Terraform (optional, do it only if C1 is done)
If you want it in code rather than clicked, `infra/` should hold:

```hcl
# what actually needs to exist
google_project_service.earthengine      # + storage, run, compute
google_storage_bucket.s5p_exports       # asia-south1
google_service_account.earthengine      # + IAM bindings
google_compute_instance.n8n             # e2-small
google_compute_address.n8n_ip           # static, for webhooks
google_cloud_run_v2_service.api
```

Keep state in a GCS bucket so we're not passing `terraform.tfstate` around:
```hcl
terraform { backend "gcs" { bucket = "aq-intel-tfstate", prefix = "prod" } }
```

**Honest take:** for a 4-person hackathon, Terraform is a nice-to-have and `gcloud`
commands in a README get you there faster. Do it if you want it on your CV or if
you're rebuilding the environment more than twice. Don't do it instead of the demo.

### C3. Cost guardrails (you have $300, don't lose it to a mistake)
1. **Set a budget alert** at $50: Billing → Budgets & alerts. Do this now.
2. Earth Engine on the non-commercial tier should be **$0**. If you see EE charges,
   you registered as commercial — fix it immediately.
3. Cloud Run scales to zero. The VM does not — it bills whether or not anyone uses
   it. Stop it when you're not demoing: `gcloud compute instances stop n8n`.
4. Keep everything in **one region** (`asia-south1`). Cross-region egress is a
   silent cost.

---

## Checklist — what to report back

- [ ] Cloud project created → **post the Project ID**
- [ ] Earth Engine API enabled
- [ ] Project registered for EE as **non-commercial** → **post the moment it's approved**
- [ ] Service account created, JSON key saved to `secrets/` (never committed)
- [ ] `gs://aq-intel-s5p` bucket exists in `asia-south1`
- [ ] Python smoke test prints S5P band names ✅ **this is the unblock signal**
- [ ] Budget alert set at $50

**Once the smoke test passes, the collector gets written and live mode becomes real
for the first time.**
