// LANE 4 — Action Centre. Owner: Lane 4 only.
import { useState } from 'react'
import { Card, Chip, cap, band } from '../ui'

export default function Action({ data, hotspot: h }) {
  const [sent, setSent] = useState(false)
  const [notified, setNotified] = useState(false)
  if (!h) return <p className="text-stone-500">Pilih satu kelompok di tab Priority.</p>

  const [tone, label] = band(h.score)
  const code = (h.dun.match(/N\d+/) || ['MPK'])[0]
  const wo = `WO/${code}/2026/${h.id.split('-')[1]}`

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Laksana — dan tutup gelung</h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Cadangan tanpa pelaksanaan hanyalah papan pemuka lain. Peringkat ini menjana arahan
          kerja, memaklumkan wakil rakyat, dan memberitahu semula setiap pengadu asal.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{cap(h.area)}</h3>
            <p className="text-sm text-stone-500">
              {cap(h.issue)} &middot; {cap(h.dun.replace('DUN ', ''))} &middot; {cap(h.zone)}
            </p>
          </div>
          <Chip tone={tone}>Skor {h.score} &middot; {label}</Chip>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          {[
            [h.n, 'Aduan'],
            [`${h.reprate}%`, `Berulang (${h.reps})`],
            [`-[${h.depth}]`, 'Ulangan terdalam'],
            [h.open_n, 'Masih terbuka'],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-bold">{v}</div>
              <div className="text-xs text-stone-500">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Punca yang dikenal pasti">
          <p className="font-semibold">{h.root}</p>
          <p className="mt-2 text-sm text-stone-600">{h.why}</p>
          <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Aduan pertama <b>{h.first}</b> → terkini <b>{h.last}</b>. Masalah ini hidup dalam
            sistem sepanjang tempoh tersebut tanpa penyelesaian kekal.
          </p>
        </Card>

        <Card title="Draf arahan kerja">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">No. WO</dt>
            <dd className="font-mono text-xs">{wo}</dd>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">Skop</dt>
            <dd>{h.act}</dd>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">Unit</dt>
            <dd>{h.unit}</dd>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">SLA</dt>
            <dd>{h.sla} hari bekerja</dd>
            <dt className="text-xs font-bold uppercase tracking-wider text-stone-500">Gabung</dt>
            <dd>{h.n} aduan &middot; {h.open_n} terbuka ditutup serentak</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSent(true)}
              disabled={sent}
              className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-700"
            >
              {sent ? '✓ Dihantar ke Jabatan Kejuruteraan' : 'Hantar arahan kerja'}
            </button>
            <button
              onClick={() => setNotified(true)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold"
            >
              {notified ? `✓ Makluman YB ${code} dihantar` : 'Maklum wakil DUN'}
            </button>
          </div>
        </Card>
      </div>

      <Card title="Tutup gelung rakyat">
        <div className="rounded-lg bg-amber-50 p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
            SMS / WhatsApp automatik &middot; {h.n} penerima
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            Salam sejahtera. Aduan anda di <b>{cap(h.area)}</b> telah digabungkan ke dalam kerja
            pembaikan menyeluruh <span className="font-mono text-xs">{wo}</span>.
            <br /><br />
            Punca dikenal pasti: {h.root.toLowerCase()}.<br />
            Tindakan: {h.act.toLowerCase()}.<br />
            Sasaran siap: {h.sla} hari bekerja.
            <br /><br />
            Terima kasih kerana melaporkan. — Majlis Perbandaran Klang
          </p>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          <b>Inilah bahagian yang hilang hari ini.</b> {data.meta.blank_status} aduan langsung
          tiada status, dan {data.meta.open_over180} telah terbuka melebihi 180 hari. Rakyat
          mengadu semula kerana mereka tidak pernah diberitahu apa-apa — itulah mekanisme di
          sebalik kenaikan kadar ulangan {data.meta.yoy.q1_2025.repeat}% →{' '}
          {data.meta.yoy.q1_2026.repeat}%.
        </p>
      </Card>
    </div>
  )
}
