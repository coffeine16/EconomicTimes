"""Pull the two n8n-written Supabase tables down to the files the pipeline reads.

The pipeline is batch and file-based by design; Supabase is where the CHANNELS
write. This is the bridge, run before (or by) the pipeline:

    citizen_reports    -> data/outputs/citizen_reports.json
                          (attribution's citizen_corroboration evidence)
    inspection_status  -> data/outputs/inspection_status.json
                          (the EXACT file the ledger already reads — its contract
                          was proven with a hand-written copy before n8n existed)

Needs SUPABASE_URL + SUPABASE_ANON_KEY in .env. Absent -> skips gracefully:
the pipeline must never fail because the channel layer isn't configured
(principle 2), it just runs without citizen/inspector evidence — which is
exactly today's behaviour.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.config import DATA_OUT  # noqa: E402  (loads .env)

TABLES = {
    "citizen_reports": "citizen_reports.json",
    "inspection_status": "inspection_status.json",
}


def main() -> None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_ANON_KEY", "")
    if not url or not key:
        print("[supabase] SUPABASE_URL/SUPABASE_ANON_KEY not set — skipping sync "
              "(pipeline runs without citizen/inspector evidence)")
        return
    for table, fname in TABLES.items():
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}?select=*",
            headers={"apikey": key, "Authorization": f"Bearer {key}"})
        try:
            rows = json.loads(urllib.request.urlopen(req, timeout=30).read())
        except Exception as e:  # noqa: BLE001 — a dead channel must not kill batch
            print(f"[supabase] {table}: fetch failed ({type(e).__name__}: {e}) — skipped")
            continue
        (DATA_OUT / fname).write_text(json.dumps(rows, indent=1, default=str),
                                      encoding="utf-8")
        print(f"[supabase] {table}: {len(rows)} rows -> data/outputs/{fname}")


if __name__ == "__main__":
    main()
