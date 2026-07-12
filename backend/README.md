# AI-Powered Urban Air Quality Intelligence — Phase 1

Signal -> Attribution -> Action platform. This phase: ingestion, spatial fabric,
and the coverage-debiased fusion field with leave-one-station-out validation.

## Quickstart (zero keys needed)
    pip install -r requirements.txt
    PYTHONPATH=. python scripts/run_pipeline.py --synthetic
    PYTHONPATH=. python scripts/eval_hotspot_recovery.py

## Live mode
Set env vars, then drop `--synthetic` (each source falls back to synthetic on failure):
    OPENAQ_API_KEY   free: https://explore.openaq.org/register
    FIRMS_KEY        free: https://firms.modaps.eosdis.nasa.gov/api/area/
Sentinel-5P via Google Earth Engine: pending service-account setup (ingest/sentinel_gee.py TODO);
synthetic satellite is used until then.

## Layout
    config.py          city bbox, H3 res, paths (swap city here)
    ingest/pollers.py  OpenAQ, Open-Meteo, FIRMS, OSM (real APIs + synthetic fallback)
    ingest/synthetic.py hidden-source world model (demo insurance; enables truth-scored eval)
    spatial/grid.py    H3 fabric + bearings + wind alignment
    spatial/panel.py   cell x hour feature table
    models/fusion.py   LightGBM fusion field + LOSO validation
    scripts/           pipeline runner + hotspot-recovery eval

## Current results (synthetic world, 1210 cells x 336 h, 12 stations)
    LOSO: RMSE 4.81, R2 0.92
    Hotspot recovery: fusion cuts top-decile error 19% vs naive station-mean,
    understatement bias -14.5 -> -9.3 ug/m3
