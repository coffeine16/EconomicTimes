"""Dump every served endpoint to static JSON for the frontend — demo insurance.

The frontend's api.ts already falls back to /data/*.json when the backend is
unreachable. Nobody was generating those files, so the fallback would have failed on
stage, which is the one moment it exists for.

This is architecture-doc Layer 8's "demo insurance", made real: if the API process
dies mid-demo, the map, the queue and the evidence panels still render from the last
batch output.

    PYTHONPATH=. python scripts/export_frontend_data.py

Writes app/frontend/public/data/*.json.

NOTE ON fusion_field.json: the full field is ~2.4M rows (cells x hours) and cannot be
a static file. We export the LATEST HOUR only (~1,700 cells), which is what the map
draws on load.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import warnings

warnings.filterwarnings("ignore")

from fastapi.testclient import TestClient

from app.backend.main import app

OUT = Path(__file__).parent.parent / "app" / "frontend" / "public" / "data"

# endpoint -> filename the frontend's FALLBACK_MAP expects
EXPORTS = {
    "/hotspots": "hotspots.json",
    "/attributions": "attributions.json",
    "/wards": "wards.json",
    "/loso": "loso.json",
    "/stations": "stations.json",
    "/fires": "fires.json",
    "/fusion?hour_offset=0": "fusion_field.json",
    # built by the prioritisation agent; exported once it exists
    "/actions": "actions.json",
    "/dispatch": "dispatch.json",
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    client = TestClient(app)

    ok, missing = 0, []
    for endpoint, name in EXPORTS.items():
        r = client.get(endpoint)
        if r.status_code != 200:
            missing.append((name, r.status_code))
            continue
        body = r.json()
        (OUT / name).write_text(json.dumps(body, indent=1), encoding="utf-8")
        n = len(body) if isinstance(body, list) else len(body.get("cells", body))
        size = (OUT / name).stat().st_size / 1024
        print(f"  {name:<22} {n:>6} items   {size:>8.1f} KB")
        ok += 1

    print(f"\n{ok} files -> {OUT}")
    if missing:
        print("\nNOT EXPORTED (the agent that produces them does not exist yet):")
        for name, code in missing:
            print(f"  {name:<22} HTTP {code}")
        print("The frontend degrades gracefully on these; re-run once the agent lands.")


if __name__ == "__main__":
    main()
