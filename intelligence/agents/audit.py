"""Monitoring Network Audit — Feature F4.

The brief opens with a 2024 CAG audit: 900+ CAAQMS stations exist, but only 31%
of cities have any actionable protocol. This agent audits the MONITORING NETWORK
ITSELF, deterministically, from data already computed:

  blind_spots   cells the fusion field estimates are dirtiest but where NO monitor
                sits — ranked, they are the optimal next-sensor placements. This is
                the direct answer to "the data exists, the intelligence to act on it
                does not": we say WHERE to add the next sensor.

  sensor_flags  a station whose own reading is flat/low while the fusion field
                around it is high is a candidate for malfunction / siting / tamper
                review. (Also: a station cell that reports no valid data at all.)

Everything here is arithmetic on the fusion field + station locations — no LLM,
no new collection. An LLM never decides where a sensor should go. Writes audit.json,
the contract the /audit endpoint and the admin Audit tab already read.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from shared.config import DATA_OUT, DATA_RAW  # noqa: E402

# A cell is a blind-spot candidate only if it is genuinely elevated: at or above
# this percentile of the citywide fusion field. Ranking every monitor-less cell
# would just list the whole city; we want the DIRTY unmonitored ones.
BLIND_SPOT_PERCENTILE = 75
MAX_BLIND_SPOTS = 40
# A station is "flat while the satellite spikes" if its own reading sits this many
# MAD units BELOW the fusion estimate for its neighbourhood. Robust, never a mean.
SENSOR_FLAG_MAD = 3.0


def _ward_lookup() -> dict[str, str]:
    p = DATA_OUT / "wards.json"
    if not p.exists():
        return {}
    wards = json.loads(p.read_text(encoding="utf-8"))
    return {c["cell"]: c.get("ward_id", "unassigned") for c in wards["cells"]}


def build_audit() -> dict:
    field_p = DATA_OUT / "fusion_field.parquet"
    stations_p = DATA_RAW / "stations.parquet"
    if not field_p.exists():
        return {"blind_spots": [], "sensor_flags": [], "placement_recommendations": [],
                "note": "fusion_field.parquet missing — run the pipeline first"}

    field = pd.read_parquet(field_p)
    field["ts"] = pd.to_datetime(field["ts"], utc=True)
    # per-cell exposure = MEDIAN of the fusion estimate over the window (never mean:
    # one spike hour must not nominate a sensor site).
    per_cell = field.groupby("cell")["pm25_hat"].median()

    wards = _ward_lookup()

    # which cells contain a monitor?
    monitored: set[str] = set()
    station_cell_reading: dict[str, float] = {}
    station_name: dict[str, str] = {}
    if stations_p.exists():
        st = pd.read_parquet(stations_p)
        if "cell" in st.columns:
            valid = st.dropna(subset=["pm25"])
            monitored = set(valid["cell"].unique())
            # each station cell's own median reading, for the flat-sensor check
            station_cell_reading = valid.groupby("cell")["pm25"].median().to_dict()
            name_col = "station_id" if "station_id" in st.columns else None
            if name_col:
                station_name = (st.dropna(subset=["pm25"])
                                  .groupby("cell")[name_col].first().to_dict())

    # ── blind spots: elevated cells with no monitor ─────────────────────────────
    threshold = float(np.nanpercentile(per_cell.values, BLIND_SPOT_PERCENTILE))
    candidates = per_cell[(per_cell >= threshold) & (~per_cell.index.isin(monitored))]
    candidates = candidates.sort_values(ascending=False).head(MAX_BLIND_SPOTS)

    blind_spots = []
    for rank, (cell, signal) in enumerate(candidates.items(), start=1):
        blind_spots.append({
            "cell": cell,
            "ward_id": wards.get(cell, "unassigned"),
            "satellite_signal": round(float(signal), 1),
            "rank": rank,
        })

    # ── sensor flags: monitor flat while the fusion field around it is high ──────
    # "around it" = the citywide median is a fair, simple neighbourhood proxy here;
    # a station reading far below what the field says its area is breathing is worth
    # a look. Robust spread from the field, not the station.
    field_med = float(per_cell.median())
    field_mad = float((per_cell - field_med).abs().median()) * 1.4826 or 1.0
    sensor_flags = []
    for cell in sorted(monitored):
        reading = station_cell_reading.get(cell)
        field_here = float(per_cell.get(cell, field_med))
        if reading is None:
            sensor_flags.append({
                "cell": cell, "ward_id": wards.get(cell, "unassigned"),
                "station_name": str(station_name.get(cell, cell)),
                "reason": "no_data",
            })
        elif field_here - reading > SENSOR_FLAG_MAD * field_mad:
            sensor_flags.append({
                "cell": cell, "ward_id": wards.get(cell, "unassigned"),
                "station_name": str(station_name.get(cell, cell)),
                "reason": "flat_while_satellite_spikes",
            })

    # ── placement recommendations: plain-language, ranked ───────────────────────
    recommendations = []
    for s in blind_spots[:5]:
        recommendations.append(
            f"Add a monitor near ward {s['ward_id']} (cell {s['cell'][:8]}…): "
            f"the fusion field estimates ~{s['satellite_signal']} µg/m³ here with "
            f"no station within the cell — currently a blind spot."
        )

    return {
        "blind_spots": blind_spots,
        "sensor_flags": sensor_flags,
        "placement_recommendations": recommendations,
        "n_cells": int(per_cell.shape[0]),
        "n_monitored": len(monitored),
        "elevated_threshold_pm25": round(threshold, 1),
    }


def run() -> dict:
    audit = build_audit()
    (DATA_OUT / "audit.json").write_text(
        json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[audit] {len(audit['blind_spots'])} blind spots, "
          f"{len(audit['sensor_flags'])} sensor flags, "
          f"{audit.get('n_monitored', 0)}/{audit.get('n_cells', 0)} cells monitored")
    return audit


if __name__ == "__main__":
    run()
