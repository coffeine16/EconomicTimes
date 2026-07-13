"""Why is NO2 empty when AAI is not?

Distinguishes the two explanations, which have completely different consequences:

  A) THE COLLECTION IS EMPTY  (size == 0)
     -> our query is wrong. A code bug. Fixable.

  B) THE COLLECTION HAS IMAGES BUT EVERY PIXEL IS MASKED  (size > 0, value None)
     -> the satellite genuinely could not see the ground. S5P's NO2/SO2 products
        are quality-filtered (qa > 0.75) and clouds fail that filter. Bengaluru in
        July is monsoon. This is not a bug, it is the instrument telling us the
        truth, and it would be a real limitation of the platform in this season.

Run:  PYTHONPATH=. python scripts/diag_s5p.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd

from shared.config import BBOX, GEE_PROJECT
from ingestion.collectors.sentinel import _init_ee, S5P_LAG_DAYS

PROBES = [
    ("COPERNICUS/S5P/OFFL/L3_NO2", "tropospheric_NO2_column_number_density"),
    ("COPERNICUS/S5P/OFFL/L3_NO2", "NO2_column_number_density"),      # total, less QA-masked
    ("COPERNICUS/S5P/OFFL/L3_SO2", "SO2_column_number_density"),
    ("COPERNICUS/S5P/OFFL/L3_AER_AI", "absorbing_aerosol_index"),     # the one that works
    ("COPERNICUS/S5P/NRTI/L3_NO2", "tropospheric_NO2_column_number_density"),  # near-real-time
]


def main():
    ee = _init_ee()
    region = ee.Geometry.Rectangle(
        [BBOX["lon_min"], BBOX["lat_min"], BBOX["lon_max"], BBOX["lat_max"]])
    centre = ee.Geometry.Point([(BBOX["lon_min"] + BBOX["lon_max"]) / 2,
                                (BBOX["lat_min"] + BBOX["lat_max"]) / 2])

    end = pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=S5P_LAG_DAYS)
    for window in (7, 30, 90):
        start = end - pd.Timedelta(days=window)
        print(f"\n{'=' * 72}\nWINDOW: {start.date()} .. {end.date()}  ({window} days)"
              f"   project={GEE_PROJECT}\n{'=' * 72}")
        print(f"{'collection':<34}{'band':<42}{'imgs':>6}{'value@centre':>16}")
        print("-" * 100)
        for coll_id, band in PROBES:
            try:
                coll = (ee.ImageCollection(coll_id)
                        .filterDate(str(start.date()), str(end.date()))
                        .filterBounds(region))
                n = coll.size().getInfo()
                val = None
                if n:
                    v = (coll.select(band).mean()
                         .reduceRegion(ee.Reducer.mean(), centre, 1113.2).getInfo())
                    val = v.get(band)
                short = coll_id.replace("COPERNICUS/S5P/", "")
                shown = "MASKED (no data)" if val is None else f"{val:.3e}"
                print(f"{short:<34}{band:<42}{n:>6}{shown:>16}")
            except Exception as e:
                print(f"{coll_id:<34}{band:<42}  ERROR {type(e).__name__}: {e}")

    print("\nREADING THIS:")
    print("  imgs = 0            -> our query is wrong (a bug we can fix)")
    print("  imgs > 0, MASKED    -> the satellite saw only cloud. Real, not a bug.")
    print("  If NO2 is masked but AAI is not, that is the QA filter: S5P's NO2/SO2")
    print("  products drop pixels with qa <= 0.75, and monsoon cloud fails that test.")
    print("  Widening the window is the fix IF any clear days exist; if 90 days is")
    print("  still empty, industrial detection via NO2/SO2 is not available in this")
    print("  season and we must say so.")


if __name__ == "__main__":
    main()
