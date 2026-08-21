// LANE 3 — Map. Owner: Lane 3 only. Fully isolated:
//   touches only src/screens/MapView.jsx, src/geo.json, public/geo/klang_dun.geojson.
//   Reads data.json read-only (counts/top_areas), never writes it.
//
// Spec (EXECUTION.md §5 Lane 3 + Lane 3 isolation brief):
//   1. Choropleth first — join the 2015 Klang DUN GeoJSON via an EXPLICIT
//      ten-row table in src/geo.json (not a runtime KodDUN match).
//        - 6 by name (code+name agree): N40, N41, N42, N43, N46, N47
//        - N49 by code (2015 = Seri Andalas -> post-2018 Sungai Kandis)
//        - N44, N45, N48: no faithful 2015 counterpart -> outline only
//   2. Then pins — geocoded by etl/geocode_localities.py into src/geo.json.
//   3. Footnote names N44, N45 and N48 specifically (rigour, not weakness).
//   4. import 'leaflet/dist/leaflet.css' is mandatory.
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import GEO from '../geo.json'
import { Card } from '../ui'

const MAX = Math.max(...GEO.dun_join.map((r) => r.count), 1)
// KodDUN (2015 polygon code) -> join row
const BY_GEO = Object.fromEntries(GEO.dun_join.map((r) => [r.geo_code, r]))

// Faithful DUNs: solid white border, red fill scaled by count.
function faithfulStyle(count) {
  return {
    fillColor: '#991b1b',
    weight: 1.5,
    color: '#ffffff',
    fillOpacity: 0.15 + 0.7 * (count / MAX),
  }
}
// N49 — coloured by code (best effort), dashed border to flag "approximate".
function byCodeStyle(count) {
  return {
    fillColor: '#991b1b',
    weight: 2,
    color: '#fbbf24',
    dashArray: '5 4',
    fillOpacity: 0.15 + 0.7 * (count / MAX),
  }
}
// N44 / N45 / N48 — no faithful 2015 counterpart: outline only, no count fill.
const NO_FAITH_STYLE = {
  fillColor: 'transparent',
  weight: 1.5,
  color: '#a8a29e',
  dashArray: '4 3',
  fillOpacity: 0,
}

function styleFor(feature) {
  const row = BY_GEO[feature.properties.KodDUN]
  if (!row) return NO_FAITH_STYLE
  if (row.method === 'name') return faithfulStyle(row.count)
  if (row.method === 'code') return byCodeStyle(row.count)
  return NO_FAITH_STYLE
}

const html = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

function tooltipFor(feature) {
  const row = BY_GEO[feature.properties.KodDUN]
  if (!row) return ''
  const head = `<strong>${html(row.name)}</strong> (N${row.geo_code.slice(1)})<br/>${row.count} aduan`
  if (row.method === 'code') {
    return `${head}<br/><em>≈ by code only — 2015 polygon is "Seri Andalas"</em>`
  }
  if (row.method === 'none') {
    return `${head}<br/><em>No faithful 2015 boundary — provenance unknown</em>`
  }
  return head
}

// Pin radius scales with complaint volume; ~sqrt so small ones stay visible.
function pinRadius(n) {
  return 4 + 10 * Math.sqrt(n / MAX)
}

export default function MapView({ data }) {
  const [geo, setGeo] = useState(null)

  useEffect(() => {
    fetch('/geo/klang_dun.geojson')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null))
  }, [])

  // Sanity check: pins reference localities that exist in data.meta.top_areas.
  const topNames = new Set((data.meta.top_areas || []).map((t) => t.area))
  const pins = (GEO.pins || []).filter((p) => topNames.has(p.locality))

  return (
    <div className="space-y-5">
      <Card title="Peta Choropleth DUN — aduan jalan MPK">
        <div className="overflow-hidden rounded-lg border border-stone-200">
          <MapContainer center={[3.04, 101.45]} zoom={11} scrollWheelZoom={false} style={{ height: 480 }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {geo && (
              <GeoJSON
                data={geo}
                style={styleFor}
                onEachFeature={(f, layer) => {
                  const t = tooltipFor(f)
                  if (t) layer.bindTooltip(t, { sticky: true })
                }}
              />
            )}
            {pins.map((p) => (
              <CircleMarker
                key={p.locality}
                center={[p.lat, p.lng]}
                radius={pinRadius(p.n)}
                pathOptions={{ color: '#b91c1c', weight: 1.5, fillColor: '#dc2626', fillOpacity: 0.6 }}
              >
                <Popup>
                  <strong>{html(p.locality)}</strong>
                  <br />
                  {p.n} aduan
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-600">
          <span className="font-semibold text-stone-700">Aduan per DUN</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded border border-white" style={{ background: 'rgba(153,27,27,0.85)' }} /> rendah → tinggi (max {MAX})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded border-2 border-dashed border-amber-400" style={{ background: 'rgba(153,27,27,0.7)' }} /> ≈ by code (N49)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-6 rounded border-2 border-dashed border-stone-400" /> tiada rujukan 2015
          </span>
          {pins.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-red-600" /> lokaliti (top {pins.length})
            </span>
          )}
        </div>

        {/* Boundary provenance — names N44, N45 and N48 specifically. */}
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <strong className="text-stone-600">Nota sempadan:</strong> sempadan DUN adalah versi 2015 (TindakMalaysia,{' '}
          <code className="rounded bg-stone-100 px-1">KodDUN</code>). Selepas pencerapan semula 2018, kod yang sama
          merujuk kawasan berbeza — jadi sertai dengan jadual eksplisit, bukan padanan nama masa jalan. Enam DUN
          bergabung dengan tepat (N40, N41, N42, N43, N46, N47); N49 disertai mengikut kod (2015 = Seri Andalas,
          kini Sungai Kandis). <strong>N44 (Selat Klang), N45 (Bandar Baru Klang) dan N48 (Sentosa) tiada sempadan
          2015 yang setia</strong> — poligon ditunjukkan sebagai rangka sahaja, tidak diwarnai mengikut kiraan.
        </p>
      </Card>
    </div>
  )
}