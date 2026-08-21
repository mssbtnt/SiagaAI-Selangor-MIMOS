# NADI — Execution Blueprint
**Repo:** `github.com/mssbtnt/nadi-ai-selangor-mimos` · **Team:** 5 devs · **Freeze:** 11:25 · **Submit:** 11:50
**Dataset: ROADS ONLY — `JALAN 2025.xlsx` + `JALAN 2026.xlsx`. Ignore all LAMPU files.**

> **Read only your lane (§5).** Everything else is reference. Total read time: 90 seconds.

---

## 1. The one rule that decides this

Five people merging at minute 80 is how teams lose. Everything below exists to prevent that.

| Rule | Why |
|---|---|
| **Lane 2 owns `App.jsx`. Nobody else touches it.** | ~80% of merge conflicts die here |
| **Only Lane 1 writes `src/data.json`.** Everyone else imports read-only | Single writer = no conflict |
| **One folder per lane. Never edit another lane's folder.** | Physical isolation |
| **Tailwind utility classes only. Zero custom CSS files.** | 2nd biggest conflict source |
| **Push to `main` every 20 min. No feature branches.** | Small conflicts beat one big one |
| **Duplicate a component rather than share one.** | Sharing costs more than duplication today |

---

## 2. Bootstrap — one person, right now (~4 min)

```bash
npm create vite@latest nadi -- --template react
cd nadi && npm i
npm i -D tailwindcss @tailwindcss/vite
npm i recharts leaflet react-leaflet
```

`vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [react(), tailwindcss()] })
```

`src/index.css` — replace entire contents with:
```css
@import "tailwindcss";
```

Then:
```bash
git init && git remote add origin https://github.com/mssbtnt/nadi-ai-selangor-mimos.git
git add -A && git commit -m "bootstrap" && git branch -M main && git push -u origin main
```

**Everyone else:** `git clone https://github.com/mssbtnt/nadi-ai-selangor-mimos.git && cd nadi && npm i && npm run dev`

---

## 3. Folder ownership map

```
etl/            → LANE 1 only     (Python, .db, data.json generator)
src/data.json   → LANE 1 only     (generated — never hand-edit)
src/App.jsx     → LANE 2 only     (wires all lanes together)
src/screens/
  Home.jsx      → LANE 2
  MapView.jsx   → LANE 3
  Priority.jsx  → LANE 4
  Action.jsx    → LANE 4
  RootCause.jsx → LANE 5
  Chat.jsx      → LANE 5
public/geo/     → LANE 3 only
```

Every screen exports default. Lane 2 imports them. That is the **only** integration point.

---

## 4. The data contract — LOCK THIS FIRST

Lane 1 pushes this file with **fake numbers** within 10 minutes so all lanes unblock immediately, then refines in place. Shape never changes after 10:35.

```jsonc
{
  "meta": {
    "total": 3204, "y2025": 2615, "y2026": 589,
    "repeat_rate": 40.1, "open_total": 920, "open_over180": 492, "blank_status": 196,
    "areas": 314, "duns": 10,
    "yoy": { "q1_2025": { "n": 758, "repeat": 31.1, "open": 22.8 },
             "q1_2026": { "n": 589, "repeat": 51.4, "open": 39.2 } },
    "status":  { "Selesai": 2273, "Tindakan": 623, "Belum Diproses": 196, "Penangguhan": 95, "Batal": 11, "Disemak": 6 },
    "dun":     { "DUN BANDAR BARU KLANG (N45)": 740, "...": 0 },
    "monthly": { "2025": [{ "m": "2025-01", "n": 258 }], "2026": [{ "m": "2026-01", "n": 301 }] }
  },
  "hotspots": [{
    "id": "HS-001", "area": "PELABUHAN KLANG", "issue": "BERLUBANG",
    "dun": "DUN SELAT KLANG (N44)", "zone": "KLANG SELATAN",
    "n": 80, "reps": 75, "depth": 6, "reprate": 94, "open_n": 10, "backlog": 13,
    "score": 73.7, "risk": 1.0, "first": "2025-01-03", "last": "2026-03-30",
    "root": "Kegagalan struktur turapan berulang",
    "act":  "Milling & resurfacing seksyen penuh",
    "unit": "Jabatan Kejuruteraan - Unit Jalan", "sla": 14,
    "why":  "Kadar aduan berulang tinggi menunjukkan tampalan gagal bertahan."
  }],
  "emerging": [{ "area": "...", "issue": "...", "recent_n": 12, "prior_n": 4, "pct_change": 200, "slope": 2.7 }],
  "forecast": [{ "month": "2026-04", "dun": "N45", "actual": null, "predicted": 71, "lo": 55, "hi": 88 }],
  "clusters": [{ "area": "BANDAR BUKIT RAJA", "water_n": 13, "pothole_n": 97,
                 "first_water": "2025-04-16", "potholes_after": 55, "pothole_reprate": 28,
                 "note": "Drainage failure precedes pavement failure — fix drainage first" }],
  "geo": [{ "locality": "BANDAR BUKIT RAJA", "lat": 3.09, "lng": 101.45, "n": 228, "score": 55.4 }]
}
```

Import anywhere: `import DATA from '../data.json'`

---

## 5. Lane briefs

### LANE 1 — Data & AI engine (strongest Python)
**Owns:** `etl/`, `src/data.json` · **Critical path — everyone waits on you**

| By | Ship |
|---|---|
| **10:32** | `data.json` with fake-but-correct-shaped data pushed to main. **Do this before writing any real logic.** |
| **10:50** | Real `meta` + `hotspots` (capability **A**) |
| **11:05** | `emerging` (**B**) + `clusters` (**D**) |
| **11:20** | `forecast` (**C**) — then stop |

**Files:** `JALAN 2025.xlsx` (2,615 rows) + `JALAN 2026.xlsx` (589 rows). **Ignore the LAMPU files entirely.**

**Ingest gotchas (verified against the files):**
- Header is **row 0**. `ADUAN KESELURUHAN` is the **LAST** row, preceded by 2 blanks → always `.dropna(subset=["No. Rujukan"])`
- Dates are `DD-MM-YYYY` strings → `pd.to_datetime(..., format="%d-%m-%Y", errors="coerce")` — 0 bad dates in both files
- Recurrence marker: `No. Rujukan` → `-\[(\d+)\]`. This is the whole insight.
- `Kategori` is **uniformly `JALAN`** in both files now — one domain, simpler. Same 10 columns, same schema, so `pd.concat` cleanly.
- **Add a `year` column** — the Q1-2025 vs Q1-2026 comparison (§7) is now your headline, so the ETL must support it.

**Scoring (capability A):**
```
score = 100 * (0.30*norm(log1p(volume)) + 0.25*repeat_rate + 0.15*norm(repeat_depth)
             + 0.15*backlog_ratio + 0.15*risk_weight)
```
`risk_weight` (road types only): `BERLUBANG`/`JAMBATAN`/`JEJAMBAT/TITI` = 1.0 · `ROSAK/MENDAP` = 0.85 · `AIR BERTAKUNG` = 0.8 · `BENTENG/PEMBAHAGI JALAN` = 0.7 · `BONGGOL` = 0.6 · `CAT GARISAN JALAN PUDAR` = 0.55 · `PALANG BESI` = 0.5 · `KOTOR/PASIR` = 0.4 · `GARISAN PETAK`/`BERPAGAR` = 0.3 · `GATED & GUARDED` = 0.2

**Emerging (B):** last-60-days count vs prior-60-days, per `Sub Kawasan × Jenis Masalah`, min 4 recent. Rank by `pct_change` where volume is still *moderate* — that's the "catch it before it becomes Area A" story.

**Forecast (C): do NOT `pip install prophet`.** Install can burn 5+ min and 12 monthly points can't support it. Seasonal-naive + linear trend, ~15 lines. **Label the chart:** *"12 months history — indicative trend, not a statistical forecast."* Honesty scores; an over-claimed Prophet chart is a question you can't answer.

**SQLite:** one line, keeps the architecture slide honest — `df.to_sql("complaints", sqlite3.connect("etl/nadi.db"), if_exists="replace")`. The app reads `data.json`, not the DB. Say so plainly: *"ETL writes SQLite; the demo reads a precomputed cache for speed."*

---

### LANE 2 — Shell + Command Centre (strongest React)
**Owns:** `src/App.jsx`, `src/screens/Home.jsx` · **You are the integrator**

- Nav across 6 screens (`useState`, not react-router — saves 10 min)
- Home: 4 KPI tiles — **3,204 complaints · 40% repeat · 920 open · 492 open >180 days**
- **Add the Q1-vs-Q1 comparison tile (§7) — repeat 31% → 51%.** That's the pitch's opening line; give it visual weight.
- Status donut + monthly bar chart (Recharts)
- Import every other lane's screen. **When a lane says "my file is pushed," you wire it in.** Nobody else edits `App.jsx`.

**At 11:20 you stop coding** and become integrator + pitcher: pull main, click every screen, pick the exact hotspot row the demo opens on, own the 5-min script. A team that codes to 11:50 and improvises the pitch loses to a team with one fewer feature and a rehearsed story.

---

### LANE 3 — Map
**Owns:** `src/screens/MapView.jsx`, `public/geo/`

**Build choropleth FIRST — it needs zero geocoding.** Aggregate by the `dun` field, join to GeoJSON on the `N\d+` code, colour by score. Working map in 20 min, no external API.

**Then** pins. **Geocode only the top 25 localities — they cover 53% of all 3,402 complaints.** At Nominatim's 1 req/sec that's **25 seconds**, not 5 minutes, and a flaky response costs one pin instead of the whole map. Run once, **commit `etl/locality_geo.csv`**, never call the API again.

Ask Lane 1 for the exact top-25 list from the road data (`df['Sub Kawasan'].value_counts().head(25)`) — don't hardcode it from the old lamp dataset.

Query format: `f"{locality}, Klang, Selangor, Malaysia"` · `time.sleep(1)` · **never fabricate a coordinate** — drop the pin instead.

**GeoJSON:** [TindakMalaysia/Selangor-Maps](https://github.com/TindakMalaysia/Selangor-Maps) → `Selangor_DUN_2015.geojson`, filter to N40–N49. **Boundaries are 2015; your names are post-2018.** Join by `KodDUN`, not name. N44/N45/N48/N49 are approximate — **put a "boundary approximate" footnote on the map.** That footnote is a credibility signal, not a weakness.

Leaflet CSS must be imported: `import 'leaflet/dist/leaflet.css'`

---

### LANE 4 — Priority + Action Centre
**Owns:** `src/screens/Priority.jsx`, `src/screens/Action.jsx` · **This is the core demo loop**

- **Priority:** scored table, top 20, colour-banded (≥60 Kritikal / ≥50 Tinggi / else Sederhana). Row click → sets selected hotspot.
- **Action:** selected hotspot → root cause, recommended action, assigned unit, SLA, generated work-order number, and the **citizen close-the-loop SMS draft**.

**Start from the working reference, don't start blank:** `nadi-klang.html` already has this exact flow — scoring bands, playbook mapping, work-order layout, SMS copy — built and validated. Port the markup to JSX. That's your lane 30 minutes early; spend the surplus helping Lane 2.

**The line that wins this screen:** 196 complaints have **no status at all**, and 492 have been open more than 180 days. People re-complain because nobody ever told them anything — that is the mechanism behind repeat rate climbing 31% → 51%. Closing the loop is the fix.

---

### LANE 5 — Root-Cause + Ask NADI
**Owns:** `src/screens/RootCause.jsx`, `src/screens/Chat.jsx`

**⚠️ The feeder-pillar story is DEAD — it lived in the lamp dataset, which is dropped.** Do not ship it.

**The road replacement is stronger, and it's provable: drainage → potholes.**

> **Bandar Bukit Raja** logged **13 water-pooling (`AIR BERTAKUNG`) complaints and 97 potholes**. The first water complaint lands **16 Apr 2025**; **55 pothole complaints follow it** at the same locality. Standing water destroys road base — so every patch laid here fails, and 28% of these potholes are already repeat complaints.
>
> NADI's recommendation: **inspect and clear the drainage BEFORE resurfacing.** Resurface first and you buy a new road surface that fails the same way.
>
> We can't prove causation from this data alone — there are no GPS coordinates to confirm the water and the potholes are on the same stretch. **That's exactly the field we're asking MPK to add.**

**62 localities carry both water-pooling and potholes** — this is a systematic pattern, not one anecdote. Worst offenders by water-complaint count: Bandar Bukit Raja (13), Bandar Parkland (10), Bandar Sultan Suleiman (7), Bandar Botanik (6).

Build the screen around this **one** story: a timeline of Bukit Raja complaints with the 16 Apr water complaint marked, potholes accumulating after it. Not a generic cluster explorer.

Why this beats the feeder pillar: it's an engineering causal chain any judge intuitively believes, it's visible in 62 localities rather than 1, and the fix (drainage before resurfacing) is a **real money-saving recommendation**, not a diagnostic.

**Chat: canned first, live second.** 4 hardcoded Q&A pairs so it demos with the network unplugged. Wire the real API only if you're ahead at 11:10. Suggested questions:
- *"What should Klang Selatan crews fix first this week?"*
- *"Why does Pelabuhan Klang keep recurring?"*
- *"Which DUN is most underserved?"*
- *"What data is MPK missing?"*

Note on your slide: **data stays local; only aggregated tables would ever leave the machine.** Given the hackathon's data-handling rules that's a compliance point in your favour.

---

## 6. Checkpoints — cut, don't debug

Call these out loud. Anything not working at a checkpoint gets **cut**, not fixed.

| Time | Must be true | If not → |
|---|---|---|
| **10:32** | Vite runs, `data.json` (fake) on main, all 5 cloned | Stop designing, ship fake data NOW |
| **10:50** | Real `data.json` live; every lane renders something | Lane 3 drops pins, choropleth only |
| **11:05** | **Lanes 2 + 4 done = minimum viable demo** | All hands to 2/4, cut 3 and 5 |
| **11:25** | **FEATURE FREEZE.** Integration only | Cut whatever isn't merged |
| **11:35** | Fallback video recorded | — |
| **11:50** | Submitted | — |

**11:25 is hard.** Nothing merges after it. The most common 5-person failure is a beautiful feature landing at 11:52 that breaks the build.

**Record the fallback at 11:35, not 11:50.** Venue Wi-Fi + a live API is exactly the combination that dies on stage.

---

## 7. Verified numbers — ROADS ONLY (`JALAN 2025` + `JALAN 2026`)

Recomputed from the two road files. **`JALAN 2025.xlsx` is byte-identical to the old `LAMPU 2025.xlsx`** (2,611 refs, 100% overlap) — it was mislabeled. The lamp dataset is dropped entirely.

| Fact | Value |
|---|---|
| Total records | **3,204** (2025 **2,615** + 2026 Q1 **589**) |
| Repeat rate | **40.1%** overall · deepest **-[6]** |
| Still open | **920** · **492** open >180 days |
| No status at all | **196** |
| Potholes (`BERLUBANG`) | **1,935 = 60%** of everything |
| Localities | **314** · DUNs **10** · departments **1** (no cross-dept comparison possible) |
| Dec 2025 spike | **333** vs Sept low **125** (2.7×) |
| Pelabuhan Klang potholes | 80 complaints, **94% repeat** |
| DUN spread | N45 **740** ↔ N41 **19** (39× — the equity angle) |

### ⚡ The new headline — Q1 vs Q1, same category, apples to apples

| | Q1 2025 | Q1 2026 | Move |
|---|---|---|---|
| Complaints | 758 | 589 | **−22%** |
| **Repeat rate** | 31.1% | **51.4%** | **+20 pts** |
| **Unresolved** | 22.8% | **39.2%** | **+16 pts** |

> **Fewer complaints, but half of them are people complaining again.** MPK isn't receiving fewer problems — it's closing fewer of them. This is a far stronger hook than a flat 40%.

**One caveat to state before a judge finds it:** 2026 monthly counts fall steeply (Jan 301 → Feb 176 → Mar 112). That could be a real decline, reporting lag, or incomplete March data. Say *"Q1-over-Q1 rates, not raw volume"* — the ratios hold regardless of intake.

---

## 8. Demo script (5 min) — Lane 2 owns this

1. **Hook (30s)** — "MPK logged 3,204 road complaints. 60% are potholes. Here's the part that should worry us: **complaints fell 22% year-on-year, but repeat complaints rose from 31% to 51%.** MPK isn't getting fewer problems. It's closing fewer of them."
2. **Command Centre (40s)** — drop the Excel, dashboard populates.
3. **Map (50s)** — N45 lights up. **39× service gap** across DUNs. Note the boundary footnote.
4. **Emerging (40s)** — "few complaints, but tripled in 8 weeks — flagged before it blows up."
5. **Root-Cause ⭐ (80s)** — Bukit Raja: 13 water-pooling complaints, then 55 potholes. **"Fix the drainage before you resurface, or you're buying a road that fails twice."** 62 localities show the same pattern.
6. **Action Centre (40s)** — work order + citizen SMS. "196 complaints have no status at all. 492 are older than 180 days. That's why people complain twice."
7. **Close (20s)** — "The success metric isn't tickets closed — it's **repeat rate**. It went 31 to 51 while everyone watched a spreadsheet. Runs on MPK's existing data, scales to every PBT in Selangor."

---

## 9. If you fall behind

Cut in this order. Each cut is survivable; the demo still works.

1. Forecast chart (**C**) → say "December was predictable" over the monthly bars
2. Live chat → canned answers only
3. Map pins → choropleth only
4. Emerging (**B**) → mention it as roadmap
5. Map entirely → screenshot on the roadmap slide

**Never cut:** Command Centre, Priority list, Action Centre, Root-Cause story. Those four are the pitch.
