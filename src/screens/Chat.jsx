// LANE 5 — Ask NADI. Owner: Lane 5 only.
//
// CANNED FIRST, LIVE SECOND. These four answers must work with the network
// unplugged. Only wire the real API if you are ahead at 11:10.
// If you do: send AGGREGATES (data.meta / data.hotspots), never raw rows.
import { useState } from 'react'
import { Card } from '../ui'

const QA = (m) => [
  {
    q: 'Apa yang patut dibaiki dahulu minggu ini?',
    a: `Pelabuhan Klang — lubang jalan. 80 aduan, 94% berulang, ulangan sedalam -[6]. Tampalan di sini jelas gagal berulang kali; cadangan: milling & resurfacing seksyen penuh, SLA 14 hari.`,
  },
  {
    q: 'Kenapa Pelabuhan Klang sentiasa berulang?',
    a: `94% aduan di sana membawa penanda -[n], bermakna hampir setiap aduan adalah kali kedua atau lebih. Corak ini menunjukkan kegagalan struktur turapan, bukan lubang tunggal — tampalan tidak menyentuh punca.`,
  },
  {
    q: 'DUN mana paling kurang mendapat perkhidmatan?',
    a: `Taburan sangat tidak sekata: DUN tertinggi mencatat ${Object.values(m.dun)[0]} aduan berbanding ${Object.values(m.dun).slice(-1)[0]} di DUN terendah. Jurang ini perlu disemak — ia boleh bermakna keperluan sebenar berbeza, atau rakyat di kawasan tertentu tidak tahu cara membuat aduan.`,
  },
  {
    q: 'Data apa yang MPK masih tiada?',
    a: `Empat medan: (1) tarikh selesai — tanpanya SLA sebenar tidak boleh dikira; (2) koordinat GPS — tanpanya peta dan pengelompokan tepat mustahil; (3) ID aset — untuk mengaitkan aduan kepada aset fizikal; (4) foto. ${m.blank_status} aduan juga langsung tiada status.`,
  },
]

export default function Chat({ data }) {
  const qa = QA(data.meta)
  const [log, setLog] = useState([])
  const ask = (item) => setLog((l) => [...l, item])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Ask NADI</h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Soalan bahasa biasa di atas data agregat. Data kekal di dalam sistem MPK — hanya
          jadual agregat yang diproses, tiada rekod individu.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {qa.map((x) => (
          <button key={x.q} onClick={() => ask(x)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-50">
            {x.q}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {log.length === 0 && <p className="text-sm text-stone-400">Pilih satu soalan di atas.</p>}
        {log.map((x, i) => (
          <Card key={i}>
            <p className="text-sm font-semibold">{x.q}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">{x.a}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
