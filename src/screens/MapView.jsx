// LANE 3 — Map. Owner: Lane 3 only.
//
// BUILD ORDER (see EXECUTION.md §5 Lane 3):
//   1. CHOROPLETH FIRST — needs zero geocoding. Aggregate data.meta.dun,
//      join to GeoJSON on the N\d+ code, colour by count/score.
//   2. THEN pins — geocode only the top 25 localities (data.meta.top_areas),
//      ~25s at Nominatim 1 req/sec. Commit etl/locality_geo.csv, never call again.
//   3. Boundary footnote: GeoJSON is 2015, names are post-2018. Join by KodDUN.
//      N44/N45/N48/N49 are approximate — SAY SO on the map. It reads as rigour.
//
// GeoJSON: github.com/TindakMalaysia/Selangor-Maps -> Selangor_DUN_2015.geojson
// Remember: import 'leaflet/dist/leaflet.css'
import { Placeholder, Card, Bar, cap } from '../ui'

export default function MapView({ data }) {
  const duns = Object.entries(data.meta.dun)
  const max = duns[0]?.[1] || 1
  return (
    <div className="space-y-5">
      <Placeholder
        lane={3}
        owner="Map — DUN choropleth + locality pins"
        todo={[
          'Choropleth first (no geocoding needed) — join GeoJSON on KodDUN',
          'Then pins for the top 25 localities only (~25s of geocoding)',
          'Add the "boundary approximate" footnote for N44/N45/N48/N49',
        ]}
      />
      <Card title="Data sedia untuk choropleth — agregat DUN">
        {duns.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3 py-1.5 text-sm">
            <span className="w-48 shrink-0 truncate">{cap(k.replace('DUN ', ''))}</span>
            <span className="flex-1"><Bar value={v} max={max} /></span>
            <span className="w-12 shrink-0 text-right tabular-nums text-stone-500">{v}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
