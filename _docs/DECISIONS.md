# Decisions D1–D5

Settled. Packages A, B and C are unblocked. Each entry states the call, why, and what it
changes for whoever owns it.

---

## D1 — DUN boundary join → **solved outright, no compromise needed**

**Decision: use post-2018 boundaries. Ship `public/geo/klang_dun_2018.geojson`, join on
`properties.code`.**

The blueprint told Lane 3 to use Tindak Malaysia's `Selangor_DUN_2015.geojson`, join by
`KodDUN`, and add a "boundary approximate" footnote. That guidance existed because the file
predates the 2018 redelineation, and the mismatch was worse than the footnote implied:

- **N45 Bandar Baru Klang did not exist in 2015.** It was created in 2018 from parts of Meru,
  Sungai Pinang, Sementa, Selat Klang and Kota Anggerik. Joining by code would have painted its
  740 complaints — the most of any DUN, and the one the demo opens on — onto 2015's Selat Klang.
- 2015's N44 is Sungai Pinang, N48 is Kota Alam Shah. "Sentosa" and "Bandar Baru Klang" appear
  nowhere in the 2015 file under any code.
- Roughly half of all complaint volume sat in the three unmappable DUNs, so hatching them would
  have gutted the map.

**None of that applies any more.** ElectionData.MY publishes the 2018 delimitation (445 features,
Peninsular Malaysia). Filtered to Selangor N40–N49 it is **10 features, 46 KB, and every code and
name matches `data.json` exactly**:

| Code | Name | Complaints |
|---|---|---|
| N40 | Kota Anggerik | 23 |
| N41 | Batu Tiga | 19 |
| N42 | Meru | 389 |
| N43 | Sementa | 188 |
| N44 | Selat Klang | 270 |
| N45 | Bandar Baru Klang | 740 |
| N46 | Pelabuhan Klang | 369 |
| N47 | Pandamaran | 300 |
| N48 | Sentosa | 561 |
| N49 | Sungai Kandis | 345 |

**For package A:** the file is already committed. `properties.code` is normalised to `N44` form,
so it joins straight to the `N\d+` in `meta.dun`. Three tasks disappear — the hand-written join
table, the boundary footnote, and the decision about hatching. The map is simply correct.

**Cite the source on the map**, replacing the old footnote: *Sempadan DUN: delimitasi 2018,
ElectionData.MY.* Academic citation is Thevananthan & Chacko (2025).

---

## D2 — Pothole definition → **`BERLUBANG` only**

The ETL counts `BERLUBANG + ROSAK/MENDAP`; the pitch quotes `BERLUBANG` alone. Both are
defensible, but they cannot both be in the room.

**The deciding argument is our own playbook.** `build_data.py` already attributes
`ROSAK/MENDAP` to *"Mendapan sub-base / kerja utiliti tidak dipulihkan"* — utility cuts, a
different mechanism from drainage. Folding it into a drainage-causation story contradicts the
root cause we assign to it everywhere else. `BERLUBANG` is also the plain-language claim a judge
hears and can check.

**Canonical numbers from here on:**

| | Value |
|---|---|
| Bukit Raja water-pooling | 13 |
| Bukit Raja potholes | 97 |
| Potholes after 16 Apr 2025 | 55 |
| Localities with both | 62 |

**For B:** the `holes` filter in `build_clusters` becomes `["BERLUBANG"]`.
**For C:** Root Cause copy currently reads "Aduan lubang / mendap" — drop "/ mendap".

---

## D3 — Emerging hotspots → **keep, re-windowed to Q1-vs-Q1**

Today the 60-day-vs-prior-60-day window lands squarely on the months when intake collapsed
(Jan 301 → Feb 176 → Mar 112), so it ranks *declines* as though they were surges: 12 of its 14
rows are negative, down to −78%. Only Bandar Puteri actually grows, 1 → 5.

**Switch the comparison to same-quarter year-over-year per `Sub Kawasan × Jenis Masalah`
(Q1 2026 vs Q1 2025), filtered to positive growth, minimum 4 recent.** That is the exact
methodology the headline already rests on, and it is immune to the intake trend for the same
reason the headline is — it compares rates in like periods rather than raw volume across a
falling series.

**For B:** rewrite `build_emerging`. **For C:** the Trends screen renders whatever survives, and
the demo line must be rewritten to match it rather than the other way round.

---

## D4 — Forecast → **cut**

It is already first on the blueprint's own cut list (§9). Fifteen monthly points cannot support a
projection, and the intake decline makes any projection either implausible or uninterpretable —
the current one predicts 192 for April immediately after an actual 112.

Seasonality is the only real signal in it, and that is already legible in the actuals without a
model: December 333 against September 125, a 2.7× swing. §9's own fallback is to say *"December
was predictable"* over the monthly bars, which Home already footnotes.

**For B:** delete `build_forecast` and the `forecast` key. **For C:** Trends carries emerging
only; scope drops accordingly.

---

## D5 — Equity framing → **3.9× across core DUNs, 39× stated in the footnote**

Shipped in `f1a6597`. N40 and N41 hold 23 and 19 complaints because they are boundary slivers of
Shah Alam seats; quoting the raw 39× invites *"those DUNs are barely MPK's"* and loses the point.
Home now leads with 3.9× across the eight core DUNs, dims the two slivers in the list, and states
the 39× rather than hiding it. The threshold is a named constant at 2% — slivers sit at 0.72% and
0.59% against 5.87% for the lowest core DUN, so the cut has a wide margin.

---

## Implementation notes

Pulled from current library docs, not memory.

**react-leaflet 5 (package A)** — `GeoJSON` takes `style` as either `PathOptions` or a
`StyleFunction`, so colour by feature with `style={(f) => ({ fillColor: scale(byCode[f.properties.code]) })}`.
Its props other than `children` are effectively immutable after mount: changing `data` or `style`
does **not** restyle the layer. If the choropleth metric becomes switchable, remount with a
`key` that includes the metric. `MapContainer`'s props are immutable too — set `center`/`zoom`
once and drive later movement through the map instance. `import 'leaflet/dist/leaflet.css'` or
tiles render unstyled.

**recharts 3 (package C)** — for the Bukit Raja timeline, mark the first water complaint with
`<ReferenceLine x="2025-04" stroke="…" strokeDasharray="5 5"><Label value="Aduan air pertama"
position="insideTopRight" /></ReferenceLine>`. If water and pothole counts are shown together,
`ComposedChart` accepts `Bar` and `Line` as siblings over one dataset.
