// ============================================================
//  FROZEN SHARED PRIMITIVES — do not edit after bootstrap.
//  Safe to import from any lane. If you need a variant,
//  make it inside YOUR screen file, not here.
// ============================================================

export function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {title && (
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500">{title}</h3>
      )}
      {children}
    </div>
  )
}

export function Stat({ value, label, note, tone = 'default' }) {
  const tones = {
    default: 'text-stone-900',
    bad: 'text-red-700',
    warn: 'text-amber-600',
    good: 'text-emerald-700',
  }
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className={`text-3xl font-bold tracking-tight ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-sm text-stone-600">{label}</div>
      {note && <div className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-500">{note}</div>}
    </div>
  )
}

export function Chip({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-stone-100 text-stone-600',
    bad: 'bg-red-100 text-red-700',
    warn: 'bg-amber-100 text-amber-700',
    good: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Bar({ value, max }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div className="h-full rounded-full bg-red-800" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}

// Title-case Malay locality names: "BANDAR BUKIT RAJA" -> "Bandar Bukit Raja"
export const cap = (s) =>
  String(s)
    .toLowerCase()
    .replace(/(^|[\s/(&-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\bDun\b/, 'DUN')
    .replace(/\(n(\d+)\)/i, '(N$1)')

// Score banding used by Priority + Action
export const band = (s) =>
  s >= 60 ? ['bad', 'Kritikal'] : s >= 50 ? ['warn', 'Tinggi'] : ['good', 'Sederhana']

export function Placeholder({ lane, owner, todo }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-10 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-stone-400">Lane {lane}</div>
      <h2 className="mt-2 text-xl font-bold text-stone-700">{owner}</h2>
      <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-stone-600">
        {todo.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-stone-400">→</span>
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-stone-400">
        Data is already wired via the <code className="rounded bg-stone-100 px-1">data</code> prop. See EXECUTION.md §5.
      </p>
    </div>
  )
}
