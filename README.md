# NADI Klang — Sistem Intelijen Aduan Jalan
**Selangor AI Hackathon 2026** · Team MIMOS

AI complaint-intelligence for Majlis Perbandaran Klang road defects.
`Detect → Understand → Prioritise → Recommend → Act`

## The finding

Q1 2025 vs Q1 2026, same category, apples to apples:

| | Q1 2025 | Q1 2026 |
|---|---|---|
| Complaints | 758 | 589 (−22%) |
| **Repeat rate** | 31.1% | **51.4%** |
| Unresolved | 22.8% | **39.2%** |

Complaints went *down*; repeat complaints went *up 20 points*. MPK isn't receiving fewer
problems — it's closing fewer of them.

## Run it

```bash
npm install
npm run dev
```

## Rebuild the data

```bash
pip install pandas openpyxl
# put JALAN 2025.xlsx + JALAN 2026.xlsx in etl/raw/
python etl/build_data.py     # -> src/data.json + etl/nadi.db
```

The ETL writes SQLite (`etl/nadi.db`); the app reads the precomputed `src/data.json`
cache for zero-latency demo rendering.

## Team

See **EXECUTION.md** — lane assignments, file ownership, checkpoints.
**Read only your lane (§5).**

## Data

Aduan Majlis Perbandaran Klang, kategori JALAN, 2025 + Q1 2026. 3,204 records,
10 columns, no personal data. Zones: Klang Utara / Klang Selatan. DUN N40–N49.
