// LANE 2 — Command Centre. Owner: Lane 2 only.
import { Card, Stat, Bar, cap } from '../ui'
import {
  BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// A DUN holding less than this share of all complaints is a boundary sliver of a
// neighbouring municipality, not an underserved Klang area. N40/N41 sit at 0.7% and
// 0.6%; the next lowest core DUN is at 5.9%, so the cut is unambiguous.
const SLIVER_SHARE = 0.02

export default function Home({ data, go }) {
  const m = data.meta
  const monthly = [
    ...(m.monthly['2025'] || []),
    ...(m.monthly['2026'] || []),
  ].map((x) => ({ month: x.m, n: x.n }))

  const issues = Object.entries(m.issues).slice(0, 8)
  const maxIssue = issues[0]?.[1] || 1
  const duns = Object.entries(m.dun).sort((a, b) => b[1] - a[1])
  const maxDun = duns[0]?.[1] || 1

  // Quoting the raw high/low ratio invites "those DUNs are barely MPK's". Lead with the
  // gap across core DUNs, and state the raw figure rather than hiding it.
  const core = duns.filter(([, v]) => v / m.total >= SLIVER_SHARE)
  const slivers = duns.filter(([, v]) => v / m.total < SLIVER_SHARE)
  const coreGap = (core[0][1] / core[core.length - 1][1]).toFixed(1)
  const rawGap = Math.round(duns[0][1] / duns[duns.length - 1][1])
  const sliverLabel = slivers.map(([k]) => cap(k.replace('DUN ', ''))).join(' dan ')
  const sliverTotal = slivers.reduce((sum, [, v]) => sum + v, 0)

  const q1a = m.yoy.q1_2025
  const q1b = m.yoy.q1_2026

  return (
    <div className="space-y-5">
      {/* ---------- THE HOOK ---------- */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="text-xs font-bold uppercase tracking-wider text-red-700">
          Suku 1 2025 lawan Suku 1 2026 — kategori sama, perbandingan setara
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <div className="text-sm text-stone-600">Jumlah aduan</div>
            <div className="text-2xl font-bold">
              {q1a.n} <span className="text-stone-400">→</span> {q1b.n}
            </div>
            <div className="text-sm font-semibold text-emerald-700">
              {Math.round(((q1b.n - q1a.n) / q1a.n) * 100)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-stone-600">Aduan berulang</div>
            <div className="text-2xl font-bold">
              {q1a.repeat}% <span className="text-stone-400">→</span>{' '}
              <span className="text-red-700">{q1b.repeat}%</span>
            </div>
            <div className="text-sm font-semibold text-red-700">
              +{(q1b.repeat - q1a.repeat).toFixed(1)} mata
            </div>
          </div>
          <div>
            <div className="text-sm text-stone-600">Belum selesai</div>
            <div className="text-2xl font-bold">
              {q1a.open}% <span className="text-stone-400">→</span>{' '}
              <span className="text-red-700">{q1b.open}%</span>
            </div>
            <div className="text-sm font-semibold text-red-700">
              +{(q1b.open - q1a.open).toFixed(1)} mata
            </div>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-stone-700">
          <b>Aduan berkurang, tetapi separuh daripadanya adalah orang yang mengadu semula.</b>{' '}
          MPK bukan menerima lebih sedikit masalah — MPK menyelesaikan lebih sedikit masalah.
        </p>
      </div>

      {/* ---------- KPI ROW ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          value={m.total.toLocaleString()}
          label="Jumlah aduan jalan"
          note={`2025: ${m.y2025.toLocaleString()} · 2026 S1: ${m.y2026}`}
        />
        <Stat
          value={`${m.repeat_rate}%`}
          label="Aduan berulang"
          tone="bad"
          note={`Penanda -[n] pada No. Rujukan, sedalam -[${m.max_depth}]`}
        />
        <Stat
          value={m.open_total}
          label="Masih belum selesai"
          tone="warn"
          note={`${m.blank_status} langsung tiada status`}
        />
        <Stat
          value={m.open_over180}
          label="Terbuka melebihi 180 hari"
          tone="bad"
          note={`${Math.round((m.open_over180 / m.open_total) * 100)}% daripada kes terbuka`}
        />
      </div>

      {/* ---------- TREND ---------- */}
      <Card title="Aduan bulanan — 2025 hingga Suku 1 2026">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <RBar dataKey="n" fill="#9a3412" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Puncak Disember 2025 (333) berbanding paras terendah September (125) — 2.7×. Monsun
          menyebabkan lubang meletus, jadi kerja turap semula perlu siap <b>sebelum Oktober</b>.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Jenis masalah">
          {issues.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-48 shrink-0 truncate" title={k}>{cap(k)}</span>
              <span className="flex-1"><Bar value={v} max={maxIssue} /></span>
              <span className="w-12 shrink-0 text-right tabular-nums text-stone-500">{v}</span>
            </div>
          ))}
          <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Lubang jalan sahaja = 60% daripada keseluruhan beban kerja.
          </p>
        </Card>

        <Card title="Beban mengikut DUN">
          {duns.map(([k, v]) => {
            const isSliver = v / m.total < SLIVER_SHARE
            return (
              <div
                key={k}
                className={`flex items-center gap-3 py-1.5 text-sm ${isSliver ? 'opacity-50' : ''}`}
              >
                <span className="w-48 shrink-0 truncate" title={k}>{cap(k.replace('DUN ', ''))}</span>
                <span className="flex-1"><Bar value={v} max={maxDun} /></span>
                <span className="w-12 shrink-0 text-right tabular-nums text-stone-500">{v}</span>
              </div>
            )
          })}
          <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Jurang <b>{coreGap}×</b> antara DUN teras tertinggi dan terendah — isu ekuiti
            perkhidmatan, bukan sekadar isu volum.
            {slivers.length > 0 && (
              <>
                {' '}{sliverLabel} (dikaburkan di atas) dikecualikan daripada nisbah:{' '}
                {sliverTotal} aduan keseluruhan, kawasan sempadan yang majoritinya di luar
                kawasan MPK. Jika dimasukkan, jurang membesar kepada {rawGap}×.
              </>
            )}
          </p>
        </Card>
      </div>

      <button
        onClick={() => go('priority')}
        className="rounded-lg bg-red-800 px-5 py-3 text-sm font-semibold text-white hover:bg-red-900"
      >
        Lihat senarai keutamaan →
      </button>
    </div>
  )
}
