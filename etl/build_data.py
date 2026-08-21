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

# Reference date for ageing. Bump if the dataset is extended.
NOW = pd.Timestamp("2026-04-01")

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
    df["age_days"] = (NOW - df["dt"]).dt.days
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
    g = g[g.n >= 3].copy()
    g["reprate"] = g.reps / g.n
    g["backlog"] = g.open_n / g.n
    g["score"] = (0.30 * norm(np.log1p(g.n)) + 0.25 * g.reprate
                  + 0.15 * norm(g.depth) + 0.15 * g.backlog + 0.15 * g.risk) * 100
    g = g.sort_values("score", ascending=False).head(60)

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
    """Acceleration, not volume: recent 60d vs prior 60d."""
    end = df.dt.max()
    recent = df[df.dt > end - pd.Timedelta(days=60)]
    prior = df[(df.dt <= end - pd.Timedelta(days=60)) & (df.dt > end - pd.Timedelta(days=120))]
    r = recent.groupby(["Sub Kawasan", "Jenis Masalah"]).size()
    p = prior.groupby(["Sub Kawasan", "Jenis Masalah"]).size()
    j = pd.concat([r.rename("recent_n"), p.rename("prior_n")], axis=1).fillna(0)
    j = j[j.recent_n >= 4]
    # NB: bracket access — `.pct_change` collides with the DataFrame method.
    j["pct_change"] = ((j["recent_n"] - j["prior_n"]) / j["prior_n"].replace(0, np.nan) * 100)
    j["pct_change"] = j["pct_change"].fillna(999)
    j = j.sort_values("pct_change", ascending=False).head(15).reset_index()
    return [dict(area=x[0], issue=x[1], recent_n=int(x[2]), prior_n=int(x[3]),
                 pct_change=round(float(x[4]))) for x in j.itertuples(index=False)]


def build_forecast(df: pd.DataFrame) -> list:
    """Seasonal-naive + linear trend. NOT Prophet — 12 points can't support it.
    Label the chart: 'indicative trend, not a statistical forecast'."""
    m = df.groupby(df.dt.dt.to_period("M")).size()
    hist = [dict(month=str(k), actual=int(v), predicted=None) for k, v in m.items()]
    y = m.values.astype(float)
    if len(y) >= 4:
        slope = np.polyfit(np.arange(len(y)), y, 1)[0]
        base = y[-3:].mean()
        last = m.index[-1]
        for i in range(1, 4):
            pred = max(0, base + slope * i)
            hist.append(dict(month=str(last + i), actual=None, predicted=round(pred),
                             lo=round(pred * 0.7), hi=round(pred * 1.3)))
    return hist


def build_clusters(df: pd.DataFrame) -> list:
    """Candidate drainage/pavement patterns, grouped by locality rather than road segment."""
    out = []
    water = df[df["Jenis Masalah"] == "AIR BERTAKUNG"]
    holes = df[df["Jenis Masalah"].isin(["BERLUBANG", "ROSAK/MENDAP"])]
    for area, w in water.groupby("Sub Kawasan"):
        h = holes[holes["Sub Kawasan"] == area]
        if len(w) < 4 or len(h) < 10:
            continue

        first_water = w.dt.min()
        water_monthly = w.groupby(w.dt.dt.to_period("M")).size()
        pothole_monthly = h.groupby(h.dt.dt.to_period("M")).size()
        months = water_monthly.index.union(pothole_monthly.index).sort_values()
        timeline = [
            dict(
                month=str(month),
                water=int(water_monthly.get(month, 0)),
                pothole=int(pothole_monthly.get(month, 0)),
            )
            for month in months
        ]

        out.append(dict(
            area=area, water_n=int(len(w)), pothole_n=int(len(h)),
            first_water=str(first_water.date()), potholes_after=int((h.dt > first_water).sum()),
            pothole_reprate=round(100 * h.is_repeat.mean()), timeline=timeline,
            note="Corak laporan air bertakung dan kerosakan turapan yang perlu disahkan di tapak"))
    return sorted(out, key=lambda x: -x["water_n"])[:10]


def main():
    files = {"2025": RAW / "JALAN 2025.xlsx", "2026": RAW / "JALAN 2026.xlsx"}
    missing = [str(p) for p in files.values() if not p.exists()]
    if missing:
        raise SystemExit(f"Missing input files:\n  " + "\n  ".join(missing)
                         + f"\nPut the two xlsx files in {RAW}")

    df = pd.concat([load(p, y) for y, p in files.items()], ignore_index=True)

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
        open_over180=int(((df.age_days > 180) & df.is_open).sum()),
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
    )

    payload = dict(
        meta=meta,
        hotspots=build_hotspots(df),
        emerging=build_emerging(df),
        forecast=build_forecast(df),
        clusters=build_clusters(df),
        geo=[],  # LANE 3 fills this from etl/locality_geo.csv
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
