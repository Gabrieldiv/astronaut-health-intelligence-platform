/**
 * Dev-only lab page for the anatomy viewer (served at /anatomy-lab.html by `vite`).
 * Fakes region statuses and vitals through useAppStore.setState so every visual state can be checked.
 */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../index.css'
import type { BodyRegionId, MetricCode, Status } from '../../types/domain'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import { REGION_LABELS } from '../../engine/catalog'
import { AnatomyViewer } from './index'
import { REGIONS } from './regions'
import type { Material, Mesh, Object3D } from 'three'

const CYCLE: Status[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'NO_DATA']

function setRegion(region: BodyRegionId, status: Status) {
  useAppStore.setState((s) => {
    const id = s.selectedAstronautId
    const h = s.health[id]
    if (!h) return {}
    return { health: { ...s.health, [id]: { ...h, regions: { ...h.regions, [region]: { ...h.regions[region], status } } } } }
  })
}

function setMetric(code: MetricCode, value: number | null) {
  useAppStore.setState((s) => {
    const id = s.selectedAstronautId
    const h = s.health[id]
    const m = h?.metrics[code]
    if (!h || !m) return {}
    return { health: { ...s.health, [id]: { ...h, metrics: { ...h.metrics, [code]: { ...m, current: value } } } } }
  })
}

function preset(map: Partial<Record<BodyRegionId, Status>>) {
  for (const r of REGIONS) setRegion(r, map[r] ?? 'LOW')
}

function Fps() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <span className="font-mono tabular">{fps} fps</span>
}

/** Triangles drawn this frame by visible meshes (reads the dev hook set by AnatomyViewer). */
function Tris() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      const scene = (window as unknown as { __ahiScene?: Object3D }).__ahiScene
      if (!scene) return
      let t = 0
      scene.traverseVisible((o) => {
        const m = o as Mesh
        if (!m.isMesh || !m.geometry) return
        const mat = m.material as Material
        if (!mat.visible) return
        const g = m.geometry
        t += (g.index ? g.index.count : g.attributes.position!.count) / 3
      })
      setN(Math.round(t))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])
  return <span className="font-mono tabular">{(n / 1000).toFixed(0)}k tris</span>
}

export interface LabView {
  size: string
  labelScale: number
  compact: boolean
  legend: boolean
}

const SIZES = ['fill', '700x560', '1000x800', '420x520']

function Panel({ view, setView }: { view: LabView; setView: (v: LabView) => void }) {
  const crew = useAppStore((s) => s.crew)
  const selectedId = useAppStore((s) => s.selectedAstronautId)
  const selectAstronaut = useAppStore((s) => s.selectAstronaut)
  const selected = useAppStore((s) => s.selectedRegion)
  const selectRegion = useAppStore((s) => s.selectRegion)
  const regions = useAppStore((s) => s.health[s.selectedAstronautId]?.regions)
  const hr = useAppStore((s) => s.health[s.selectedAstronautId]?.metrics.HEART_RATE?.current ?? 0)
  const rr = useAppStore((s) => s.health[s.selectedAstronautId]?.metrics.RESPIRATORY_RATE?.current ?? 0)
  return (
    <div className="absolute left-3 top-3 z-20 w-64 space-y-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-[12px] text-slate-200 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-wide text-cyan-100">Anatomy lab</span>
        <Tris />
        <Fps />
      </div>
      <div className="flex flex-wrap gap-1">
        {SIZES.map((sz) => (
          <button key={sz} type="button" onClick={() => setView({ ...view, size: sz })} className={`rounded-md px-2 py-1 ${view.size === sz ? 'bg-cyan-400/20 text-cyan-50' : 'bg-white/5 text-slate-400'}`}>
            {sz}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => setView({ ...view, labelScale: view.labelScale === 1 ? 1.3 : 1 })} className="rounded-md bg-white/5 px-2 py-1">
          labels x{view.labelScale}
        </button>
        <button type="button" onClick={() => setView({ ...view, compact: !view.compact })} className="rounded-md bg-white/5 px-2 py-1">
          compact {view.compact ? 'on' : 'off'}
        </button>
        <button type="button" onClick={() => setView({ ...view, legend: !view.legend })} className="rounded-md bg-white/5 px-2 py-1">
          legend {view.legend ? 'on' : 'off'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {crew.map((c) => (
          <button key={c.id} type="button" onClick={() => selectAstronaut(c.id)} className={`rounded-md px-2 py-1 ${c.id === selectedId ? 'bg-cyan-400/20 text-cyan-50' : 'bg-white/5 text-slate-400'}`}>
            {c.callsign} ({c.sex})
          </button>
        ))}
      </div>
      <div className="space-y-1">
        {REGIONS.map((r) => {
          const st = regions?.[r]?.status ?? 'NO_DATA'
          return (
            <div key={r} className="flex items-center gap-2">
              <button type="button" onClick={() => selectRegion(selected === r ? null : r)} className={`w-20 text-left ${selected === r ? 'text-cyan-200' : ''}`}>
                {REGION_LABELS[r].label}
              </button>
              <button
                type="button"
                onClick={() => setRegion(r, CYCLE[(CYCLE.indexOf(st) + 1) % CYCLE.length]!)}
                className="flex-1 rounded-md px-2 py-0.5 text-left"
                style={{ background: `${STATUS_META[st].color}22`, color: STATUS_META[st].color }}
              >
                {STATUS_META[st].label}
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className="rounded-md bg-white/5 px-2 py-1" onClick={() => preset({})}>All nominal</button>
        <button type="button" className="rounded-md bg-white/5 px-2 py-1" onClick={() => preset({ heart: 'CRITICAL', lungs: 'HIGH', brain: 'MODERATE' })}>Cardio event</button>
        <button type="button" className="rounded-md bg-white/5 px-2 py-1" onClick={() => preset({ muscles: 'MODERATE', bones: 'HIGH', kidneys: 'MODERATE', skin: 'HIGH' })}>Mixed</button>
        <button type="button" className="rounded-md bg-white/5 px-2 py-1" onClick={() => preset(Object.fromEntries(REGIONS.map((r) => [r, 'NO_DATA'])))}>Signal lost</button>
      </div>
      <label className="block">
        HR {hr.toFixed(0)} bpm
        <input type="range" min={0} max={180} value={hr} onChange={(e) => setMetric('HEART_RATE', +e.target.value)} className="w-full" />
      </label>
      <label className="block">
        RR {rr.toFixed(0)} br/min
        <input type="range" min={0} max={40} value={rr} onChange={(e) => setMetric('RESPIRATORY_RATE', +e.target.value)} className="w-full" />
      </label>
    </div>
  )
}

function Lab() {
  const [view, setView] = useState<LabView>({ size: '700x560', labelScale: 1, compact: false, legend: true })
  const [w, h] = view.size === 'fill' ? [0, 0] : view.size.split('x').map(Number)
  return (
    <div className="relative h-full w-full">
      <div
        className={view.size === 'fill' ? 'absolute inset-y-0 left-1/2 w-[min(760px,100%)] -translate-x-1/2' : 'absolute left-[300px] top-3 rounded-2xl ring-1 ring-white/10'}
        style={view.size === 'fill' ? undefined : { width: w, height: h }}
      >
        <AnatomyViewer labelScale={view.labelScale} compact={view.compact} legend={view.legend} />
      </div>
      <Panel view={view} setView={setView} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Lab />
  </StrictMode>,
)
