"""Bengaluru vs Delhi: which city can this platform actually see?

We picked Bengaluru by inertia (it was in config.BBOX on day one). Saumya suggested
Delhi. Rather than argue, measure — the choice should be made on whether the
satellite can resolve sources there, not on which city we typed first.

WHAT MATTERS IS NOT "IS THE AIR DIRTY". It is whether the SPATIAL STRUCTURE of the
column exceeds the INSTRUMENT NOISE, because detection scores a cell against the
annulus around it. A uniformly filthy city with no spatial contrast is undetectable;
a moderately polluted city with sharp local plumes is easy. So for each pollutant we
compute, per cell, over the same 60-day window:

  n_obs           how many cloud-free observations survived QA
  spatial_spread  robust spread (1.4826 x MAD) of the per-cell 60-day MEDIAN
                  -> this is the signal detection reads
  temporal_noise  median per-cell standard deviation across the window
                  -> the instrument's own scatter
  noise_on_median ~ 1.25 x temporal_noise / sqrt(n_obs)
                  -> how much of the spatial spread is just noise that survived averaging
  SNR             spatial_spread / noise_on_median

  SNR >> 1  the column has real, resolvable spatial structure. Detection can work.
  SNR ~= 1  we would be scoring noise, and manufacturing enforcement accusations
            against real places out of retrieval error.

Run:  PYTHONPATH=. python scripts/compare_cities.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

from ingestion.collectors.sentinel import _init_ee, PRODUCTS, S5P_SCALE_M, S5P_LAG_DAYS
import h3

CITIES = {
    "Bengaluru": {"lat_min": 12.85, "lat_max": 13.10, "lon_min": 77.45, "lon_max": 77.75},
    "Delhi":     {"lat_min": 28.45, "lat_max": 28.75, "lon_min": 76.95, "lon_max": 77.35},
}
H3_RES = 8
DAYS = 60


def cells_for(bbox) -> list[str]:
    poly = h3.LatLngPoly([
        (bbox["lat_min"], bbox["lon_min"]), (bbox["lat_min"], bbox["lon_max"]),
        (bbox["lat_max"], bbox["lon_max"]), (bbox["lat_max"], bbox["lon_min"]),
    ])
    return sorted(h3.polygon_to_cells(poly, H3_RES))


def main():
    ee = _init_ee()
    end = pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=S5P_LAG_DAYS)
    start = end - pd.Timedelta(days=DAYS)
    print(f"window: {start.date()} .. {end.date()}  ({DAYS} days)\n")

    rows = []
    for city, bbox in CITIES.items():
        cells = cells_for(bbox)
        region = ee.Geometry.Rectangle(
            [bbox["lon_min"], bbox["lat_min"], bbox["lon_max"], bbox["lat_max"]])
        pts = ee.FeatureCollection([
            ee.Feature(ee.Geometry.Point(list(reversed(h3.cell_to_latlng(c)))), {"cell": c})
            for c in cells])

        # One image carrying median / count / stdDev for every pollutant, so the
        # whole city is a single reduceRegions call.
        bands = []
        for coll_id, (band, out, scale) in PRODUCTS.items():
            coll = (ee.ImageCollection(coll_id)
                    .filterDate(str(start.date()), str(end.date()))
                    .filterBounds(region)
                    .select(band))
            bands += [
                coll.median().multiply(scale).rename(f"{out}_med"),
                coll.count().rename(f"{out}_n"),
                coll.reduce(ee.Reducer.stdDev()).multiply(scale).rename(f"{out}_sd"),
            ]
        img = ee.Image.cat(bands)

        feats = img.reduceRegions(collection=pts, reducer=ee.Reducer.mean(),
                                  scale=S5P_SCALE_M).getInfo()["features"]
        df = pd.DataFrame([f["properties"] for f in feats])
        print(f"{city}: {len(cells)} cells")

        for _, (_, out, _) in PRODUCTS.items():
            med = pd.to_numeric(df.get(f"{out}_med"), errors="coerce").dropna()
            n = pd.to_numeric(df.get(f"{out}_n"), errors="coerce").dropna()
            sd = pd.to_numeric(df.get(f"{out}_sd"), errors="coerce").dropna()
            if med.empty or n.empty or sd.empty:
                rows.append({"city": city, "pollutant": out, "n_obs": 0,
                             "level": np.nan, "spatial": np.nan,
                             "noise": np.nan, "snr": np.nan})
                continue
            spatial = 1.4826 * (med - med.median()).abs().median()
            n_obs = float(n.median())
            noise_on_med = 1.25 * float(sd.median()) / max(np.sqrt(max(n_obs, 1)), 1)
            rows.append({
                "city": city, "pollutant": out,
                "n_obs": round(n_obs, 1),
                "level": round(float(med.median()), 2),
                "spatial": round(float(spatial), 2),
                "noise": round(float(noise_on_med), 2),
                "snr": round(float(spatial / noise_on_med), 2) if noise_on_med else np.nan,
            })

    out = pd.DataFrame(rows)
    print("\n" + "=" * 84)
    print("CAN THE SATELLITE RESOLVE SPATIAL STRUCTURE HERE?")
    print("=" * 84)
    print(f"{'city':<12}{'pollutant':<10}{'n_obs':>7}{'level':>10}"
          f"{'spatial':>10}{'noise':>9}{'SNR':>8}   verdict")
    print("-" * 84)
    for r in out.itertuples():
        if not np.isfinite(r.snr):
            verdict = "NO DATA"
        elif r.snr >= 3:
            verdict = "strong — detection works"
        elif r.snr >= 1.5:
            verdict = "usable"
        else:
            verdict = "NOISE — do not detect on this"
        print(f"{r.city:<12}{r.pollutant:<10}{r.n_obs:>7}{r.level:>10}"
              f"{r.spatial:>10}{r.noise:>9}{r.snr:>8}   {verdict}")
    print("=" * 84)
    print("spatial = robust spread of per-cell 60d medians (the signal)")
    print("noise   = residual instrument scatter surviving the median (the floor)")
    print("SNR     = spatial / noise. Below ~1.5 we would be detecting retrieval error.")


if __name__ == "__main__":
    main()
