// LANE 4 — Priority list. Owner: Lane 4 only.
import { Card, Chip, Bar, cap, band } from '../ui'

const WEIGHTS = [
  ['Isipadu aduan', 30],
  ['Kadar berulang', 25],
  ['Kedalaman ulangan', 15],
  ['Nisbah tunggakan', 15],
  ['Risiko keselamatan', 15],
]

export default function Priority({ data, selected, onSelect }) {
  const rows = data.hotspots.slice(0, 20)
  const urgent = data.hotspots.filter((h) => h.score >= 55).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Utamakan dengan skor yang boleh dipertahankan</h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Setiap kelompok (kawasan × jenis masalah) diberi skor komposit. Formula terbuka —
          pegawai boleh melaraskan pemberat dan menerangkan kepada YB mengapa satu jalan
          didahulukan.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Pemberat skor">
          {WEIGHTS.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-40 shrink-0">{k}</span>
              <span className="flex-1"><Bar value={v} max={30} /></span>
              <span className="w-10 shrink-0 text-right tabular-nums text-stone-500">{v}%</span>
            </div>
          ))}
          <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Risiko mengikut jenis: lubang &amp; jambatan = 1.0; garisan petak = 0.3.
          </p>
        </Card>
        <Card>
          <div className="text-3xl font-bold">{data.hotspots.length}</div>
          <div className="mt-1 text-sm text-stone-600">Kelompok berskor</div>
          <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Dikecilkan daripada {data.meta.total.toLocaleString()} tiket individu — pengurangan
            beban kognitif {Math.round((1 - data.hotspots.length / data.meta.total) * 100)}%.
          </p>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-red-700">{urgent}</div>
          <div className="mt-1 text-sm text-stone-600">Perlu tindakan minggu ini</div>
          <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Senarai kerja yang muat dalam satu mesyuarat, bukan fail Excel {data.meta.total} baris.
          </p>
        </Card>
      </div>

      <Card title="Senarai kerja berskor — 20 teratas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                <th className="px-3 py-2">Skor</th>
                <th className="px-3 py-2">Kelompok</th>
                <th className="px-3 py-2 text-right">Aduan</th>
                <th className="px-3 py-2 text-right">Ulangan</th>
                <th className="px-3 py-2 text-right">Terbuka</th>
                <th className="px-3 py-2">Tahap</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const [tone, label] = band(h.score)
                const isSel = selected?.id === h.id
                return (
                  <tr
                    key={h.id}
                    onClick={() => onSelect(h)}
                    className={`cursor-pointer border-b border-stone-100 hover:bg-stone-50 ${
                      isSel ? 'bg-amber-50' : ''
                    }`}
                  >
                    <td className={`px-3 py-2.5 font-bold tabular-nums ${
                      tone === 'bad' ? 'text-red-700' : tone === 'warn' ? 'text-amber-600' : 'text-emerald-700'
                    }`}>
                      {h.score}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold">{cap(h.area)}</div>
                      <div className="text-xs text-stone-500">
                        {cap(h.issue)} &middot; {cap(h.dun.replace('DUN ', ''))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{h.n}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{h.reprate}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{h.open_n}</td>
                    <td className="px-3 py-2.5"><Chip tone={tone}>{label}</Chip></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Klik mana-mana baris → terus ke Action Centre dengan arahan kerja dijana.
        </p>
      </Card>
    </div>
  )
}
