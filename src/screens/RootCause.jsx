// LANE 5 — Root Cause. Owner: Lane 5 only.
//
// ⚠️ The feeder-pillar story from the v2 blueprint is DEAD — it lived in the
//    LAMPU dataset, which we dropped. Ship the drainage story below instead.
//    See EXECUTION.md §5 Lane 5.
//
// TODO (Lane 5):
//   1. Timeline chart for the selected cluster: complaints per month, with the
//      first AIR BERTAKUNG date marked (data.clusters[i].first_water).
//   2. Emerging-hotspot table from data.emerging (capability B).
//   3. Wire cluster selection so the officer can compare localities.
import { useState } from 'react'
import { Card, Chip, cap } from '../ui'

export default function RootCause({ data }) {
  const [i, setI] = useState(0)
  const c = data.clusters[i]
  if (!c) return <p className="text-stone-500">Tiada kelompok punca dijumpai.</p>

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Punca sistemik: saliran → lubang jalan</h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Papan pemuka biasa berkata "kawasan ini banyak lubang". NADI berkata{' '}
          <b>kenapa lubang itu sentiasa kembali</b>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.clusters.map((x, idx) => (
          <button
            key={x.area}
            onClick={() => setI(idx)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              idx === i ? 'bg-red-800 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {cap(x.area)}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-xl font-bold">{cap(c.area)}</h3>
          <Chip tone="bad">{c.pothole_reprate}% aduan lubang berulang</Chip>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          {[
            [c.water_n, 'Aduan air bertakung'],
            [c.pothole_n, 'Aduan lubang / mendap'],
            [c.first_water, 'Aduan air pertama'],
            [c.potholes_after, 'Lubang selepas tarikh itu'],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-bold">{v}</div>
              <div className="text-xs text-stone-500">{l}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 text-sm">
          <p className="font-semibold">Rantaian sebab akibat</p>
          <p className="mt-1 text-stone-700">
            Air bertakung merosakkan lapisan bawah jalan. Setiap tampalan yang dibuat di atas
            sub-base yang lembap akan gagal semula dalam beberapa minggu — itulah sebabnya{' '}
            {c.pothole_reprate}% aduan lubang di sini adalah aduan berulang.
          </p>
          <p className="mt-3 font-semibold text-red-800">
            Cadangan NADI: baiki perparitan SEBELUM turap semula. Turap dahulu, dan anda membeli
            permukaan jalan baharu yang akan gagal dengan cara yang sama.
          </p>
        </div>

        <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <b>Kejujuran data:</b> kami tidak dapat membuktikan sebab-akibat daripada data ini
          sahaja — tiada koordinat GPS untuk mengesahkan air bertakung dan lubang berada pada
          jajaran jalan yang sama. <b>Itulah medan data yang kami cadangkan MPK tambah.</b>
        </p>
      </Card>

      <Card title={`Corak yang sama dikesan di ${data.clusters.length} kawasan`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                <th className="px-3 py-2">Kawasan</th>
                <th className="px-3 py-2 text-right">Air bertakung</th>
                <th className="px-3 py-2 text-right">Lubang / mendap</th>
                <th className="px-3 py-2 text-right">% berulang</th>
              </tr>
            </thead>
            <tbody>
              {data.clusters.map((x) => (
                <tr key={x.area} className="border-b border-stone-100">
                  <td className="px-3 py-2">{cap(x.area)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.water_n}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.pothole_n}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.pothole_reprate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Ini bukan satu anekdot — corak saliran-ke-lubang berulang di seluruh daerah.
        </p>
      </Card>
    </div>
  )
}
