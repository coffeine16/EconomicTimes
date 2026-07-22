"""Road-distance routing via OSRM.

Wraps the OSRM public demo ``route`` endpoint to obtain real road distance,
travel time and route geometry for dispatch planning.  Falls back to
haversine × ROAD_FACTOR when the service is unreachable (offline, CI,
rate-limited).

Usage::

    from shared.routing import route_waypoints
    result = route_waypoints([(28.55, 77.09), (28.52, 77.14)])
    # result: {"distance_km": 12.4, "duration_min": 28,
    #          "geometry": [[77.09, 28.55], ...]}
"""
import json
import urllib.request
import urllib.error
from typing import List, Tuple, Dict, Any

from shared.grid import haversine_km

# OSRM public demo — free, rate-limited.  Good enough for batch pipeline
# runs (a few requests per run).  For production, self-host.
OSRM_BASE = "https://router.project-osrm.org"

# Delhi roads add ~40% to haversine (measured empirically across the bbox).
ROAD_FACTOR = 1.4
# Assume ~20 km/h average urban speed for the fallback duration estimate.
FALLBACK_SPEED_KMH = 20.0

# HTTP timeout — OSRM is usually fast; if it is not, fall back promptly.
_TIMEOUT_S = 8


def route_waypoints(
    waypoints: List[Tuple[float, float]],
) -> Dict[str, Any]:
    """Route through waypoints in order.

    Parameters
    ----------
    waypoints : list of (lat, lon) tuples
        At least two points.

    Returns
    -------
    dict with keys:
        distance_km : float
        duration_min : float
        geometry : list of [lon, lat] pairs  (GeoJSON order, ready for deck.gl)
    """
    if len(waypoints) < 2:
        return {"distance_km": 0.0, "duration_min": 0.0, "geometry": []}

    try:
        return _osrm_route(waypoints)
    except Exception as exc:
        print(f"[routing] OSRM unavailable ({exc}); falling back to haversine × {ROAD_FACTOR}")
        return _fallback_route(waypoints)


def _osrm_route(waypoints: List[Tuple[float, float]]) -> Dict[str, Any]:
    """Call OSRM ``/route/v1/driving`` with full geometry."""
    # OSRM expects lon,lat order in the URL
    coords_str = ";".join(f"{lon},{lat}" for lat, lon in waypoints)
    url = (
        f"{OSRM_BASE}/route/v1/driving/{coords_str}"
        "?overview=full&geometries=geojson"
    )

    req = urllib.request.Request(url, headers={"User-Agent": "AirCase/1.0"})
    with urllib.request.urlopen(req, timeout=_TIMEOUT_S) as resp:
        data = json.loads(resp.read())

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError(f"OSRM returned code={data.get('code')}")

    route = data["routes"][0]
    geometry = route["geometry"]["coordinates"]  # list of [lon, lat]

    return {
        "distance_km": round(route["distance"] / 1000.0, 1),
        "duration_min": round(route["duration"] / 60.0, 1),
        "geometry": geometry,
    }


def _fallback_route(
    waypoints: List[Tuple[float, float]],
) -> Dict[str, Any]:
    """Haversine × ROAD_FACTOR fallback with straight-line geometry."""
    total_km = 0.0
    for i in range(len(waypoints) - 1):
        total_km += haversine_km(
            waypoints[i][0], waypoints[i][1],
            waypoints[i + 1][0], waypoints[i + 1][1],
        )
    road_km = round(total_km * ROAD_FACTOR, 1)
    duration_min = round(road_km / FALLBACK_SPEED_KMH * 60, 1)

    # Straight-line geometry (no road snapping) in [lon, lat] order
    geometry = [[lon, lat] for lat, lon in waypoints]

    return {
        "distance_km": road_km,
        "duration_min": duration_min,
        "geometry": geometry,
    }
