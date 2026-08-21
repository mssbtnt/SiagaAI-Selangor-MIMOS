// LANE 5 — Trends & Root Cause.
import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, Chip, cap } from '../ui'

const growthLabel = (pct) => (pct === 999 ? 'Baharu' : `${pct > 0 ? '+' : ''}${pct}%`)

export default function RootCause({ data }) {
  const [i, setI] = useState(0)
  const c = data.clusters[i]
  const emerging = data.emerging || []
  if (!c) return <p className="text-stone-500">Tiada kelompok punca dijumpai.</p>

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Trend dan hipotesis punca sistemik</h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          SiagaAI mengesan corak laporan yang meningkat dan hubungan berpotensi antara saliran
          dengan kerosakan turapan untuk disahkan melalui pemeriksaan tapak.
        </p>
      </div>

      <Card title="Isyarat awal — hotspot yang sedang meningkat">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wider text-stone-500">
                <th className="px-3 py-2">Kawasan</th>
                <th className="px-3 py-2">Isu</th>
                <th className="px-3 py-2 text-right">60 hari terkini</th>
                <th className="px-3 py-2 text-right">60 hari sebelumnya</th>
                <th className="px-3 py-2 text-right">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {emerging.map((x) => (
                <tr key={`${x.area}-${x.issue}`} className="border-b border-stone-100">
                  <td className="px-3 py-2 font-semibold">{cap(x.area)}</td>
                  <td className="px-3 py-2">{cap(x.issue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.recent_n}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{x.prior_n}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-red-700">
                    {growthLabel(x.pct_change)}
                  </td>
                </tr>
              ))}
              {emerging.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-3 py-6 text-center text-stone-500">
                    Tiada isu meningkat yang memenuhi ambang pengesanan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Isyarat awal membandingkan jumlah aduan dalam 60 hari terkini dengan 60 hari sebelumnya.
          Ia mengesan pecutan laporan, bukan semata-mata jumlah aduan tertinggi.
        </p>
      </Card>

      <div>
        <h3 className="text-lg font-bold">Corak saliran dan kerosakan turapan</h3>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Pilih kawasan untuk melihat trend laporan setempat dan menentukan keutamaan pemeriksaan.
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
          <p className="font-semibold">Hipotesis untuk disahkan di tapak</p>
          <p className="mt-1 text-stone-700">
            Aduan air bertakung pertama direkodkan pada <b>{c.first_water}</b>, diikuti oleh{' '}
            <b>{c.potholes_after}</b> laporan lubang atau mendap di kawasan yang sama. Corak ini
            konsisten dengan kemungkinan masalah saliran menyumbang kepada kegagalan turapan,
            tetapi belum membuktikan sebab-akibat.
          </p>
          <p className="mt-3 font-semibold text-red-800">
            Cadangan SiagaAI: periksa saliran, kecerunan dan keadaan sub-base sebelum meluluskan
            kerja turap semula.
          </p>
        </div>
      </Card>

      <Card title={`Trend laporan di ${cap(c.area)}`}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.timeline || []} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="water" name="Air bertakung" fill="#0369a1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pothole" name="Lubang / mendap" fill="#b91c1c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Carta ini membandingkan laporan pada tahap <b>Sub Kawasan</b>, bukan jajaran jalan yang
          tepat. Sahkan lokasi, aset dan sejarah pembaikan sebelum menetapkan punca atau skop kerja.
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
          Ini ialah corak berulang antara jenis aduan di beberapa kawasan, bukan bukti muktamad
          bahawa satu isu menyebabkan isu yang lain.
        </p>
      </Card>
    </div>
  )
}
