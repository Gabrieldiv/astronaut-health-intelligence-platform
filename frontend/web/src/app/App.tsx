import { useEffect } from 'react'
import { startTicker, useAppStore } from '../state/store'

export default function App() {
  useEffect(() => startTicker(), [])
  const crew = useAppStore((s) => s.crew)
  return <div className="p-6 text-ink-100">AHI shell placeholder. Crew: {crew.map((c) => c.callsign).join(', ')}</div>
}
