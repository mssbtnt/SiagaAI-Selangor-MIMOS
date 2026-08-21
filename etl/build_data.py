"""
SiagaAI ETL — LANE 1 OWNS THIS FILE.
Reads JALAN 2025 + JALAN 2026 -> src/data.json (+ etl/siaga.db)

Usage:  python etl/build_data.py
Deps :  pip install pandas openpyxl
"""
import json, sqlite3, re
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "etl" / "raw"          # put JALAN 2025.xlsx / JALAN 2026.xlsx here
OUT = ROOT / "src" / "data.json"
DB = ROOT / "etl" / "siaga.db"

# --- Thresholds -------------------------------------------------------------
# A cluster needs enough of both signals before a drainage->pavement claim is
# fair. See _docs/DECISIONS.md D2.
MIN_WATER = 4
MIN_HOLES = 10
MAX_CLUSTERS = 20
# An emerging cluster needs a real recent count, not one or two complaints.
MIN_RECENT = 4
MAX_EMERGING = 15
# Hotspot scoring needs a minimum group size to be meaningful.
MIN_HOTSPOT_N = 3
MAX_HOTSPOTS = 60
# Backlog ageing cutoff, in days.
STALE_DAYS = 180

# Potholes are BERLUBANG only. ROSAK/MENDAP is attributed to utility cuts in
# PLAYBOOK below, so folding it in would contradict our own root cause.
POTHOLE = "BERLUBANG"
WATER = "AIR BERTAKUNG"

RISK = {
    "BERLUBANG": 1.0, "JAMBATAN": 1.0, "JEJAMBAT/TITI": 1.0,
    "ROSAK/MENDAP": 0.85, "AIR BERTAKUNG": 0.8,
    "BENTENG/PEMBAHAGI JALAN (DIVIDER)": 0.7, "BONGGOL": 0.6,
    "CAT GARISAN JALAN PUDAR": 0.55, "PALANG BESI": 0.5,
    "KOTOR/PASIR": 0.4, "GARISAN PETAK KENDERAAN": 0.3,
    "GARISAN PETAK KUNING": 0.3, "BERPAGAR": 0.3,
    "GATED & GUARDED / PONDOK PENGAWAL": 0.2,
}

PLAYBOOK = {
    "BERLUBANG": dict(
        root="Kegagalan struktur turapan berulang — bukan lubang tunggal",
        act="Milling & resurfacing seksyen penuh (bukan tampalan)",
        unit="Jabatan Kejuruteraan — Unit Jalan", sla=14,
        why="Kadar aduan berulang tinggi menunjukkan tampalan gagal bertahan; kos kitaran tampalan melebihi kos turap semula."),
    "AIR BERTAKUNG": dict(
        root="Saliran tersumbat / kecerunan jalan tidak memadai",
        act="Pemeriksaan & pembersihan perparitan, semak inlet longkang",
        unit="Jabatan Kejuruteraan — Unit Saliran", sla=7,
        why="Air bertakung mempercepat kegagalan turapan — selesaikan sebelum turap semula."),
    "ROSAK/MENDAP": dict(
        root="Mendapan sub-base / kerja utiliti tidak dipulihkan",
        act="Siasatan sub-base + pemulihan potong-gali utiliti",
        unit="Jabatan Kejuruteraan — Unit Jalan", sla=21,
        why="Mendapan berulang biasanya kesan kerja utiliti; perlu rujuk pemilik utiliti."),
    "BONGGOL": dict(
        root="Bonggol tidak mengikut spesifikasi / tanda amaran hilang",
        act="Ukur semula profil bonggol & cat tanda amaran",
        unit="Jabatan Kejuruteraan — Unit Trafik", sla=21,
        why="Bonggol tidak berspesifikasi menyebabkan kerosakan kenderaan dan aduan berulang."),
    "CAT GARISAN JALAN PUDAR": dict(
        root="Marking haus akibat trafik berat",
        act="Jadual semula cat garisan mengikut kelompok kawasan",
        unit="Jabatan Kejuruteraan — Unit Trafik", sla=30,
        why="Gabungkan kerja mengikut kawasan untuk jimat kos mobilisasi."),
    "JAMBATAN": dict(
        root="Struktur jambatan berisiko",
        act="Pemeriksaan struktur segera oleh jurutera bertauliah",
        unit="Jabatan Kejuruteraan — Unit Struktur", sla=3,
        why="Kegagalan struktur membawa risiko nyawa."),
}
DEFAULT_PLAY = dict(
    root="Aduan berulang di lokasi sama",
    act="Siasatan tapak & tentukan punca sistemik",
    unit="Jabatan Kejuruteraan", sla=14,
    why="Corak berulang menunjukkan punca belum diselesaikan.")


def load(path: Path, year: str) -> pd.DataFrame:
    df = pd.read_excel(path)
    # Header is row 0. "ADUAN KESELURUHAN" is the LAST row, preceded by blanks.
    df = df.dropna(subset=["No. Rujukan"]).copy()
    df["year"] = year
    df["dt"] = pd.to_datetime(df["Tarikh"], format="%d-%m-%Y", errors="coerce")
    df = df.dropna(subset=["dt"])
    df["depth"] = df["No. Rujukan"].str.extract(r"-\[(\d+)\]")[0].astype(float).fillna(0)
    df["is_repeat"] = df["depth"] > 0
    df["status"] = df["Tindakan"].fillna("Belum Diproses")
    df["is_open"] = ~df["status"].isin(["Selesai", "Batal"])
    df["risk"] = df["Jenis Masalah"].map(RISK).fillna(0.5)
    return df


def norm(s: pd.Series) -> pd.Series:
    s = s.astype(float)
    return (s - s.min()) / (s.max() - s.min()) if s.max() > s.min() else s * 0


def build_hotspots(df: pd.DataFrame) -> list:
    g = (df.groupby(["Sub Kawasan", "Jenis Masalah", "DUN", "Kawasan"], dropna=False)
           .agg(n=("is_repeat", "size"), reps=("is_repeat", "sum"),
                depth=("depth", "max"), open_n=("is_open", "sum"),
                first=("dt", "min"), last=("dt", "max"), risk=("risk", "max"))
           .reset_index())
    g = g[g.n >= MIN_HOTSPOT_N].copy()
    g["reprate"] = g.reps / g.n
    g["backlog"] = g.open_n / g.n
    g["score"] = (0.30 * norm(np.log1p(g.n)) + 0.25 * g.reprate
                  + 0.15 * norm(g.depth) + 0.15 * g.backlog + 0.15 * g.risk) * 100
    g = g.sort_values("score", ascending=False).head(MAX_HOTSPOTS)

    out = []
    for i, r in enumerate(g.itertuples(), 1):
        p = PLAYBOOK.get(r._2, DEFAULT_PLAY)
        out.append(dict(
            id=f"HS-{i:03d}", area=r._1, issue=r._2, dun=r.DUN, zone=r.Kawasan,
            n=int(r.n), reps=int(r.reps), depth=int(r.depth), reprate=round(r.reprate * 100),
            open_n=int(r.open_n), backlog=round(r.backlog * 100), score=round(float(r.score), 1),
            risk=float(r.risk), first=str(r.first.date()), last=str(r.last.date()),
            root=p["root"], act=p["act"], unit=p["unit"], sla=p["sla"], why=p["why"]))
    return out


def build_emerging(df: pd.DataFrame) -> list:
    """Acceleration, not volume: Q1 2026 vs Q1 2025 per locality x issue.

    The previous window (last 60 days vs prior 60) sat squarely on the 2026
    intake decline — Jan 301, Feb 176, Mar 112 — so it ranked *falling* clusters
    as though they were surging: 12 of its 14 rows were negative. Same-quarter
    year-over-year is the comparison the headline already rests on, and it is
    unaffected by that trend for the same reason the headline is. See
    _docs/DECISIONS.md D3.
    """
    q1 = df[df.dt.dt.quarter == 1]
    cur = q1[q1.year == "2026"].groupby(["Sub Kawasan", "Jenis Masalah"]).size()
    prior = q1[q1.year == "2025"].groupby(["Sub Kawasan", "Jenis Masalah"]).size()
    j = pd.concat([cur.rename("recent_n"), prior.rename("prior_n")], axis=1).fillna(0)
    j = j[j["recent_n"] >= MIN_RECENT].copy()

    # NB: bracket access — `.pct_change` collides with the DataFrame method.
    j["is_new"] = j["prior_n"] == 0
    j["pct_change"] = ((j["recent_n"] - j["prior_n"]) / j["prior_n"].replace(0, np.nan) * 100)
    # Keep only clusters that actually grew. A cluster with no Q1-2025 baseline
    # has no percentage to report — it is flagged as new instead of given a
    # sentinel figure the UI would have to special-case.
    j = j[j["is_new"] | (j["pct_change"] > 0)]
    # Rank new clusters by their own volume, above every measurable increase.
    j["rank"] = np.where(j["is_new"], np.inf, j["pct_change"])
    j = j.sort_values(["rank", "recent_n"], ascending=False).head(MAX_EMERGING).reset_index()

    # Explicit column access — itertuples renames "Sub Kawasan" positionally and
    # the offset shifts with index=True/False, which is easy to get silently wrong.
    return [dict(area=r["Sub Kawasan"], issue=r["Jenis Masalah"],
                 recent_n=int(r["recent_n"]), prior_n=int(r["prior_n"]),
                 is_new=bool(r["is_new"]),
                 pct_change=None if r["is_new"] else round(float(r["pct_change"])))
            for r in j.to_dict("records")]


# build_forecast was removed. Fifteen monthly points cannot support a projection,
# and the intake decline made the output actively misleading — it predicted 192
# for April immediately after an actual 112. Seasonality is the only real signal
# and it is already legible in the actuals: December 333 against September 125.
# See _docs/DECISIONS.md D4.


def build_clusters(df: pd.DataFrame) -> list:
    """Root-cause: drainage failure precedes pavement failure."""
    out = []
    water = df[df["Jenis Masalah"] == WATER]
    holes = df[df["Jenis Masalah"] == POTHOLE]
    for area, w in water.groupby("Sub Kawasan"):
        h = holes[holes["Sub Kawasan"] == area]
        if len(w) < MIN_WATER or len(h) < MIN_HOLES:
            continue
        first_water = w.dt.min()
        after = int((h.dt > first_water).sum())
        out.append(dict(
            area=area, water_n=int(len(w)), pothole_n=int(len(h)),
            first_water=str(first_water.date()), potholes_after=after,
            pothole_reprate=round(100 * h.is_repeat.mean()),
            note="Saliran gagal mendahului kegagalan turapan — baiki perparitan sebelum turap semula"))
    return sorted(out, key=lambda x: -x["water_n"])[:MAX_CLUSTERS]


def count_water_pothole_localities(df: pd.DataFrame) -> int:
    """Localities carrying BOTH signals at any volume — the '62 kawasan' claim.

    Deliberately unfiltered: build_clusters applies MIN_WATER/MIN_HOLES to pick
    defensible examples, but the systemic-pattern claim rests on how widespread
    the pairing is, not on how many clear the evidence bar.
    """
    areas = df.groupby("Sub Kawasan")["Jenis Masalah"].agg(set)
    return int(sum(1 for s in areas if WATER in s and POTHOLE in s))


def main():
    files = {"2025": RAW / "JALAN 2025.xlsx", "2026": RAW / "JALAN 2026.xlsx"}
    missing = [str(p) for p in files.values() if not p.exists()]
    if missing:
        raise SystemExit(f"Missing input files:\n  " + "\n  ".join(missing)
                         + f"\nPut the two xlsx files in {RAW}")

    df = pd.concat([load(p, y) for y, p in files.items()], ignore_index=True)

    # Age everything against the day after the last complaint, rather than a
    # hardcoded date that silently goes stale when the dataset is extended.
    now = df.dt.max() + pd.Timedelta(days=1)
    df["age_days"] = (now - df.dt).dt.days

    # --- Q1 vs Q1, the headline ---
    def slice_q1(sub):
        s = sub[sub.dt.dt.month <= 3]
        return dict(n=int(len(s)), repeat=round(100 * s.is_repeat.mean(), 1),
                    open=round(100 * s.is_open.mean(), 1))

    meta = dict(
        total=int(len(df)),
        y2025=int((df.year == "2025").sum()), y2026=int((df.year == "2026").sum()),
        repeat_rate=round(100 * df.is_repeat.mean(), 1),
        open_total=int(df.is_open.sum()),
        open_over180=int(((df.age_days > STALE_DAYS) & df.is_open).sum()),
        blank_status=int((df.status == "Belum Diproses").sum()),
        areas=int(df["Sub Kawasan"].nunique()), duns=int(df["DUN"].nunique()),
        max_depth=int(df.depth.max()),
        yoy=dict(q1_2025=slice_q1(df[df.year == "2025"]), q1_2026=slice_q1(df[df.year == "2026"])),
        status={k: int(v) for k, v in df.status.value_counts().items()},
        issues={k: int(v) for k, v in df["Jenis Masalah"].value_counts().items()},
        dun={k: int(v) for k, v in df["DUN"].value_counts().items()},
        zone={k: int(v) for k, v in df["Kawasan"].value_counts().items()},
        monthly={y: [dict(m=str(k), n=int(v))
                     for k, v in sub.groupby(sub.dt.dt.to_period("M")).size().items()]
                 for y, sub in df.groupby("year")},
        top_areas=[dict(area=k, n=int(v)) for k, v in df["Sub Kawasan"].value_counts().head(25).items()],
        water_pothole_areas=count_water_pothole_localities(df),
        as_of=str(df.dt.max().date()),
    )

    payload = dict(
        meta=meta,
        hotspots=build_hotspots(df),
        emerging=build_emerging(df),
        clusters=build_clusters(df),
        geo=[],  # Package A fills this from etl/locality_geo.csv
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    # Architecture-slide honesty: the ETL really does write SQLite.
    con = sqlite3.connect(DB)
    flat = df.copy()
    flat["Tarikh"] = flat["dt"].dt.strftime("%Y-%m-%d")
    flat.drop(columns=["dt"]).to_sql("complaints", con, if_exists="replace", index=False)
    pd.DataFrame(payload["hotspots"]).to_sql("hotspots", con, if_exists="replace", index=False)
    con.close()

    print(f"OK  {OUT}  ({len(df)} rows)")
    print(f"    repeat {meta['repeat_rate']}%  open {meta['open_total']}  "
          f"Q1 repeat {meta['yoy']['q1_2025']['repeat']}% -> {meta['yoy']['q1_2026']['repeat']}%")
    print(f"OK  {DB}")


if __name__ == "__main__":
    main()
