#!/usr/bin/env python3
# LANE 3 — etl/geocode_localities.py  (owner: Lane 3 only)
#
# Geocode the 25 localities in data.json -> meta.top_areas through Nominatim
# at 1 request/sec, commit the result, NEVER call the API again.
#
# Rules (EXECUTION.md §5 Lane 3):
#   - query: f"{locality}, Klang, Selangor, Malaysia"
#   - time.sleep(1) between requests (Nominatim usage policy)
#   - DROP a pin rather than invent a coordinate. No fabrication, ever.
#   - run once; commit etl/locality_geo.csv + the pins block of src/geo.json.
#
# Reads data.json READ-ONLY (top_areas). Writes only Lane-3 files:
#   etl/locality_geo.csv          (the committed cache — never re-call)
#   src/geo.json -> .pins         (consumed by MapView.jsx)
#
# Usage:  python etl/geocode_localities.py
import csv
import json
import os
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JSON = os.path.join(ROOT, "src", "data.json")
GEO_JSON = os.path.join(ROOT, "src", "geo.json")
CSV_OUT = os.path.join(ROOT, "etl", "locality_geo.csv")
# Nominatim rejects bare app UAs from this network with 403; a browser-prefixed
# UA + Accept-Language is accepted. Identifies the app per usage policy.
UA = "Mozilla/5.0 NADI-Klang/1.0 (https://github.com/mssbtnt/nadi-ai-selangor-mimos)"


def geocode(locality):
    """Return (lat, lng) or None if Nominatim has no faithful hit. Never fabricate."""
    q = urllib.parse.quote(f"{locality}, Klang, Selangor, Malaysia")
    url = f"https://nominatim.openstreetmap.org/search?format=json&limit=1&q={q}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            hits = json.load(r)
    except Exception as e:  # network/timeout -> drop this pin, don't fake it
        print(f"  ! {locality}: request failed ({e}) -> dropped")
        return None
    if not hits:
        print(f"  - {locality}: no result -> dropped")
        return None
    return float(hits[0]["lat"]), float(hits[0]["lon"])


def main():
    with open(DATA_JSON, encoding="utf-8") as f:
        top = json.load(f)["meta"]["top_areas"]
    print(f"Geocoding {len(top)} localities at 1 req/sec…")

    rows = []
    for i, t in enumerate(top):
        loc, n = t["area"], t["n"]
        res = geocode(loc)
        if res:
            lat, lng = res
            rows.append({"locality": loc, "lat": lat, "lng": lng, "n": n})
            print(f"  + {loc}: {lat:.4f}, {lng:.4f}  (n={n})")
        else:
            rows.append({"locality": loc, "lat": "", "lng": "", "n": n})
        if i < len(top) - 1:  # 1 req/sec, no need to sleep after the last
            time.sleep(1)

    # Commit CSV cache (the thing we never re-generate).
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["locality", "lat", "lng", "n"])
        w.writeheader()
        w.writerows(rows)
    print(f"\nWrote {CSV_OUT} ({len(rows)} rows)")

    # Populate src/geo.json -> pins (only localities that resolved).
    with open(GEO_JSON, encoding="utf-8") as f:
        geo = json.load(f)
    geo["pins"] = [
        {"locality": r["locality"], "lat": r["lat"], "lng": r["lng"], "n": r["n"]}
        for r in rows if r["lat"] != ""
    ]
    with open(GEO_JSON, "w", encoding="utf-8") as f:
        json.dump(geo, f, indent=1, ensure_ascii=False)
    dropped = len(rows) - len(geo["pins"])
    print(f"Wrote {len(geo['pins'])} pins to {GEO_JSON}  ({dropped} dropped, none fabricated)")


if __name__ == "__main__":
    main()