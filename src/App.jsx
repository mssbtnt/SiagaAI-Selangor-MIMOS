// ============================================================
//  LANE 2 OWNS THIS FILE. Nobody else edits it.
//  Other lanes: export default from your own screen file,
//  then tell Lane 2 in chat. Lane 2 wires it in below.
// ============================================================
import { useState } from 'react'
import DATA from './data.json'

import Home from './screens/Home'
import MapView from './screens/MapView'
import Priority from './screens/Priority'
import Action from './screens/Action'
import RootCause from './screens/RootCause'
import Chat from './screens/Chat'

const TABS = [
  { id: 'home', label: 'Command Centre' },
  { id: 'priority', label: 'Priority' },
  { id: 'action', label: 'Action Centre' },
  { id: 'root', label: 'Root Cause' },
  { id: 'map', label: 'Map' },
  { id: 'chat', label: 'Ask SiagaAI' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  // Shared selection: Priority (Lane 4) sets it, Action (Lane 4) reads it.
  const [selected, setSelected] = useState(DATA.hotspots[0])

  const go = (id) => setTab(id)

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-800 to-amber-500" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">SiagaAI Selangor</h1>
              <p className="text-xs text-stone-500">
                Sistem Intelijen Aduan Jalan &middot; Perintis: MPK Klang &middot; Selangor AI Hackathon 2026
              </p>
            </div>
          </div>
          <nav className="ml-auto flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tab === t.id ? 'bg-red-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {tab === 'home' && <Home data={DATA} go={go} />}
        {tab === 'priority' && (
          <Priority
            data={DATA}
            selected={selected}
            onSelect={(h) => { setSelected(h); go('action') }}
          />
        )}
        {tab === 'action' && <Action data={DATA} hotspot={selected} />}
        {tab === 'root' && <RootCause data={DATA} />}
        {tab === 'map' && <MapView data={DATA} />}
        {tab === 'chat' && <Chat data={DATA} />}
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-10 pt-4 text-xs text-stone-500">
        Data: aduan jalan Majlis Perbandaran Klang (JALAN 2025 &amp; 2026).
        Tiada data peribadi diproses.
      </footer>
    </div>
  )
}
