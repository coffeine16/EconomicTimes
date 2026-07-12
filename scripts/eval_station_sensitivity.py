"""Is our detection recall an artefact of where we chose to put the stations?

It should not be — detection runs on satellite contrast + FIRMS fire persistence
and never reads a station. But "should not be" is an argument, and arguments are
what the 100% trap was made of. This measures it.

The synthetic world places monitors away from sources (CPCB siting norms), by
excluding each source's cell and its k-ring. That exclusion makes the companion
statistic "0 of 9 sources within 2 km of a monitor" true almost by construction —
so the obvious next question is whether it is also propping up the recall number.

This script re-runs detection with the exclusion dialled from k=2 (the default,
realistic siting) down to k=0 (stations may sit directly ON a source — the least
biased network you could possibly build). If recall moves, our headline depends
on an assumption we invented. If it does not, the headline is independent of
station siting, which is the whole point of detecting from uniformly-covering
instruments.

    PYTHONPATH=. python scripts/eval_station_sensitivity.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import warnings

import pandas as pd

warnings.filterwarnings("ignore")

from shared.config import DATA_RAW, DATA_OUT
from shared.grid import cell_center, haversine_km
import ingestion.synthetic as synth
from ingestion.preprocessing.panel import build_panel
from intelligence.models.fusion import run as fusion_run
from intelligence.agents.detect import detect

NEAR_KM = 2.0
OBSERVABLE = {"industrial", "waste_burning"}


def recall_at(exclusion_k: int) -> dict:
    """Regenerate the world with this station-exclusion radius; return recall."""
    orig = synth.STATION_EXCLUSION_K
    synth.STATION_EXCLUSION_K = exclusion_k
    try:
        out = synth.generate_all()
        for name, df in out.items():
            df.to_parquet(DATA_RAW / f"{name.lstrip('_')}.parquet", index=False)
        build_panel()
        fusion_run()
        hot = detect()

        hot_pts = [(c, *cell_center(c)) for c in hot.cell]
        found = 0
        observable = [s for s in synth.SOURCES if s[1] in OBSERVABLE]
        for _n, _k, lat, lon, *_ in observable:
            if any(haversine_km(lat, lon, la, lo) <= NEAR_KM for _c, la, lo in hot_pts):
                found += 1

        # how close did the monitors actually end up to a source?
        stations = pd.read_parquet(DATA_RAW / "stations.parquet").cell.unique()
        st_pts = [cell_center(c) for c in stations]
        min_d = min(min(haversine_km(s[2], s[3], la, lo) for la, lo in st_pts)
                    for s in synth.SOURCES)
        n_near = sum(any(haversine_km(s[2], s[3], la, lo) <= NEAR_KM for la, lo in st_pts)
                     for s in synth.SOURCES)

        loso = pd.read_json(DATA_OUT / "loso.json").to_dict()
        return {"k": exclusion_k, "found": found, "of": len(observable),
                "cells": len(hot), "closest_station_km": round(min_d, 2),
                "sources_near_a_station": n_near,
                "loso_r2": loso["overall"]["r2"]}
    finally:
        synth.STATION_EXCLUSION_K = orig


def unbiased_coverage(n_stations: int = 12, trials: int = 4000) -> None:
    """How many sources would an UNBIASED monitor network catch?

    This is the non-circular version of the coverage-bias claim. Forget CPCB
    siting entirely: scatter the same number of monitors uniformly at random over
    the city — the least biased network anyone could build — and count how many
    sources land within 2 km of one.

    The answer is the honest headline, and it is not a tautology, because nothing
    here avoids sources on purpose. It is pure geometry: a handful of monitors
    cannot cover a city. SPARSITY misses sources even before BIAS does.
    """
    import numpy as np

    cells = synth.city_cells()
    centres = np.array([cell_center(c) for c in cells])
    src = [(s[2], s[3]) for s in synth.SOURCES]

    # per-cell: is it within NEAR_KM of any source?
    near_src = np.array([
        any(haversine_km(sl, so, la, lo) <= NEAR_KM for sl, so in src)
        for la, lo in centres])

    # per-source: which cells cover it?
    covers = [np.array([haversine_km(sl, so, la, lo) <= NEAR_KM for la, lo in centres])
              for sl, so in src]

    rng = np.random.default_rng(0)
    caught = []
    for _ in range(trials):
        pick = rng.choice(len(cells), size=n_stations, replace=False)
        caught.append(sum(bool(c[pick].any()) for c in covers))
    caught = np.array(caught)

    print()
    print("=" * 76)
    print("COVERAGE UNDER *UNBIASED* (uniformly random) STATION PLACEMENT")
    print("=" * 76)
    print(f"  {n_stations} monitors, {len(cells)} cells, {len(src)} sources, "
          f"{trials} random networks")
    print(f"  cells within {NEAR_KM:.0f} km of some source: {near_src.sum()}/{len(cells)} "
          f"({100 * near_src.mean():.0f}% of the city)")
    print()
    print(f"  sources caught, median : {np.median(caught):.0f} of {len(src)}")
    print(f"  sources caught, mean   : {caught.mean():.2f} of {len(src)}")
    print(f"  P(a random network catches ZERO sources) = {(caught == 0).mean():.0%}")
    print(f"  P(it catches 2 or fewer)                = {(caught <= 2).mean():.0%}")
    print("-" * 76)
    print(f"  => Even with NO siting bias at all, a {n_stations}-monitor network misses a")
    print(f"     median of {len(src) - np.median(caught):.0f} of {len(src)} sources. This number owes nothing to")
    print("     CPCB norms and nothing to our world model's placement rule — it is")
    print("     what happens when you try to cover a city with a dozen sensors.")
    print("     Siting bias makes it worse. Sparsity alone already makes it bad.")
    print("=" * 76)


def main():
    rows = [recall_at(k) for k in (2, 1, 0)]
    df = pd.DataFrame(rows)

    print()
    print("=" * 76)
    print("DETECTION RECALL vs STATION SITING")
    print("=" * 76)
    print(f"{'exclusion':<14}{'closest stn':<13}{'srcs <2km':<11}"
          f"{'recall':<10}{'cells':<8}{'fusion LOSO R2'}")
    print("-" * 76)
    for r in df.itertuples():
        label = f"k={r.k}" + (" (default)" if r.k == 2 else " (none)" if r.k == 0 else "")
        print(f"{label:<14}{r.closest_station_km:<13}{r.sources_near_a_station:<11}"
              f"{f'{r.found}/{r.of}':<10}{r.cells:<8}{r.loso_r2:.3f}")
    print("=" * 76)

    if df.found.nunique() == 1:
        print(f"Recall is CONSTANT at {df.found.iloc[0]}/{df.of.iloc[0]} across every siting regime,")
        print("including k=0 where monitors may sit directly on a source. Detection does")
        print("not depend on the station-placement assumption: it reads satellite + FIRMS,")
        print("which cover every cell equally. The recall headline is NOT an artefact of a")
        print("rule we invented.")
    else:
        print("!! Recall MOVED with station siting. Detection is leaking station")
        print("   information from somewhere it should not be. Investigate before")
        print("   quoting the recall number.")
    print()
    print("The last column moves, and it SHOULD: the fusion field is trained on stations,")
    print("so where they sit is exactly what it depends on. That contrast is the point —")
    print("one number is siting-dependent, the other is not.")
    print()
    print("Caveat: 'closest stn' above is one RNG draw and proves little on its own.")
    print("The Monte Carlo below is the number to quote.")

    unbiased_coverage()

    recall_at(2)   # leave the tree in the default state


if __name__ == "__main__":
    main()
