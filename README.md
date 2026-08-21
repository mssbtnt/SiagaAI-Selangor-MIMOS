# SiagaAI Selangor — Sistem Intelijen Aduan Jalan
**Selangor AI Hackathon 2026** · Team MIMOS

AI complaint-intelligence for road defects. Pilot deployment: Majlis Perbandaran Klang.
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
python etl/build_data.py     # -> src/data.json + etl/siaga.db
```

The ETL writes SQLite (`etl/siaga.db`); the app reads the precomputed `src/data.json`
cache for zero-latency demo rendering.

## Team

See **[_docs/DECISIONS.md](_docs/DECISIONS.md)** first — D1–D5 are settled, and each entry says
what it changes for your package.

**[_docs/EXECUTION.md](_docs/EXECUTION.md)** is the original hackathon blueprint, kept as a record
of the scoring model, playbook mapping and verified figures. Current work is split into four
packages (A–D) with the file-ownership map carried over from §3. Where the two disagree,
DECISIONS.md wins.
**Read only your lane (§5).**

## Data

Aduan Majlis Perbandaran Klang, kategori JALAN, 2025 + Q1 2026. 3,204 records,
10 columns, no personal data. Zones: Klang Utara / Klang Selatan. DUN N40–N49.
