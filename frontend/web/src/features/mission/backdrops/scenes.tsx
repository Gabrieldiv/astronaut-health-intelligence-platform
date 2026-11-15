/**
 * Scenery of the mission backdrops, one SVG per profile (viewBox 1600 x 1000, sliced to fill).
 * The body stands in the middle third, so the scenery lives at the edges, the horizon and the
 * sky. Colors stay low in luminance: the vignette and dim layer in MissionBackdrop keep the
 * anatomy and its status colors readable on top.
 */
import type { MissionProfileId } from '../../../types/domain'

const W = 1600
const H = 1000

/** Deterministic star field (no Math.random at render, identical on every mount). */
function stars(seed: number, count: number, maxY: number): { x: number; y: number; r: number; o: number }[] {
  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  return Array.from({ length: count }, () => ({ x: rnd() * W, y: rnd() * maxY, r: 0.6 + rnd() * 1.1, o: 0.3 + rnd() * 0.55 }))
}

function Stars({ seed, count, maxY, color = '#ffffff' }: { seed: number; count: number; maxY: number; color?: string }) {
  return (
    <g fill={color}>
      {stars(seed, count, maxY).map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(2)} opacity={p.o.toFixed(2)} />
      ))}
    </g>
  )
}

function LaunchScene() {
  const lattice = Array.from({ length: 9 }, (_, i) => 430 + i * 60)
  return (
    <>
      <defs>
        <linearGradient id="bd-launch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a1a" />
          <stop offset="0.5" stopColor="#141b3a" />
          <stop offset="0.8" stopColor="#4a2a2e" />
          <stop offset="1" stopColor="#9a5a2c" />
        </linearGradient>
        <radialGradient id="bd-launch-plume" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1d0" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#ffb04a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6a1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bd-launch-dawn" cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor="#ffb15c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffb15c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#bd-launch-sky)" />
      <rect y={H * 0.45} width={W} height={H * 0.55} fill="url(#bd-launch-dawn)" />
      <Stars seed={7} count={40} maxY={380} />
      {/* launch tower, left edge */}
      <g stroke="#0b0d15" strokeWidth="6" fill="none" opacity="0.95">
        <path d={`M150 ${H} L150 380 M240 ${H} L240 380 M150 380 L240 380`} />
        {lattice.map((y) => (
          <path key={y} d={`M150 ${y} L240 ${y + 50} M240 ${y} L150 ${y + 50}`} strokeWidth="4" />
        ))}
        <path d="M240 520 L330 520" />
      </g>
      {/* rising vehicle and plume, right edge */}
      <g className="bd-anim-plume" style={{ transformOrigin: '1330px 640px' }}>
        <ellipse cx="1330" cy="640" rx="120" ry="300" fill="url(#bd-launch-plume)" />
      </g>
      <path d="M1330 260 L1350 300 L1350 440 L1310 440 L1310 300 Z" fill="#dfe4ec" opacity="0.9" />
      <path d="M1310 440 L1296 466 L1310 452 Z M1350 440 L1364 466 L1350 452 Z" fill="#b9bfca" opacity="0.9" />
      <path d="M1320 300 Q1260 560 1180 1000" stroke="#fff3df" strokeOpacity="0.12" strokeWidth="18" fill="none" />
      <rect y={H - 90} width={W} height="90" fill="#07080d" opacity="0.85" />
    </>
  )
}

function IssScene() {
  const cities: [number, number][] = [
    [190, 905], [222, 915], [260, 900], [300, 918], [120, 925], [1290, 896], [1330, 910], [1372, 902], [1410, 918], [1460, 925], [1240, 920],
  ]
  return (
    <>
      <defs>
        <linearGradient id="bd-iss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02060f" />
          <stop offset="0.7" stopColor="#051126" />
          <stop offset="1" stopColor="#081d3b" />
        </linearGradient>
        <radialGradient id="bd-iss-earth" cx="0.5" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#235f9e" />
          <stop offset="0.45" stopColor="#0f355f" />
          <stop offset="1" stopColor="#04122a" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#bd-iss-sky)" />
      <Stars seed={11} count={70} maxY={700} />
      <ellipse cx={W / 2} cy="2080" rx="1900" ry="1260" fill="url(#bd-iss-earth)" />
      {/* atmosphere glow on the limb */}
      <ellipse cx={W / 2} cy="2080" rx="1912" ry="1272" fill="none" stroke="#5fd3ff" strokeOpacity="0.18" strokeWidth="22" />
      <ellipse cx={W / 2} cy="2080" rx="1900" ry="1260" fill="none" stroke="#7fd4ff" strokeOpacity="0.7" strokeWidth="4" />
      <g fill="#ffd27a" className="bd-anim-twinkle">
        {cities.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.5} opacity={0.55 + (i % 4) * 0.1} />
        ))}
      </g>
      {/* solar array, top right */}
      <g stroke="#8fa6bf" strokeOpacity="0.5" strokeWidth="3" fill="#163352" fillOpacity="0.55">
        <path d="M1150 150 L1600 90" fill="none" />
        <rect x="1240" y="70" width="80" height="150" transform="rotate(-8 1280 145)" />
        <rect x="1380" y="52" width="80" height="150" transform="rotate(-8 1420 127)" />
        <path d="M1240 120 L1320 109 M1240 170 L1320 159 M1380 102 L1460 91 M1380 152 L1460 141" fill="none" strokeOpacity="0.35" />
      </g>
    </>
  )
}

function MoonScene() {
  return (
    <>
      <defs>
        <linearGradient id="bd-moon-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#010102" />
          <stop offset="1" stopColor="#0a0b0f" />
        </linearGradient>
        <linearGradient id="bd-moon-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#575a62" />
          <stop offset="1" stopColor="#1e2024" />
        </linearGradient>
        <radialGradient id="bd-moon-earth" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#9fd3ff" />
          <stop offset="0.5" stopColor="#2b6fc0" />
          <stop offset="1" stopColor="#0b2346" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#bd-moon-sky)" />
      <Stars seed={23} count={110} maxY={720} />
      <circle cx="1310" cy="210" r="56" fill="url(#bd-moon-earth)" />
      <path d="M1266 192 Q1296 178 1320 200 Q1342 214 1356 196" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="4" fill="none" />
      <circle cx="1310" cy="210" r="62" fill="none" stroke="#9fd3ff" strokeOpacity="0.3" strokeWidth="4" />
      <path d="M0 760 Q240 700 480 728 Q720 756 960 704 Q1240 650 1600 716 L1600 1000 L0 1000 Z" fill="url(#bd-moon-ground)" />
      <g fill="#1b1c20" opacity="0.6">
        <ellipse cx="230" cy="850" rx="90" ry="18" />
        <ellipse cx="1260" cy="880" rx="120" ry="22" />
        <ellipse cx="620" cy="930" rx="60" ry="12" />
        <ellipse cx="1430" cy="790" rx="44" ry="9" />
      </g>
    </>
  )
}

/** Quadratic Bezier point, for the ship on the transfer arc. */
function arcPoint(t: number, p0: [number, number], c: [number, number], p1: [number, number]): [number, number] {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]
}

const EARTH: [number, number] = [150, 690]
const CTRL: [number, number] = [800, -60]
const MARS: [number, number] = [1420, 300]

function MarsScene({ progress }: { progress: number }) {
  const [sx, sy] = arcPoint(Math.min(1, Math.max(0, progress)), EARTH, CTRL, MARS)
  return (
    <>
      <defs>
        <linearGradient id="bd-mars-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#040309" />
          <stop offset="0.6" stopColor="#0f0811" />
          <stop offset="1" stopColor="#220c0a" />
        </linearGradient>
        <radialGradient id="bd-mars-planet" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#e08a5c" />
          <stop offset="0.55" stopColor="#a63f26" />
          <stop offset="1" stopColor="#3f1308" />
        </radialGradient>
        <radialGradient id="bd-mars-earth" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#9fd3ff" />
          <stop offset="0.5" stopColor="#2b6fc0" />
          <stop offset="1" stopColor="#0b2346" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#bd-mars-sky)" />
      <Stars seed={41} count={140} maxY={H} />
      <path d={`M${EARTH[0]} ${EARTH[1]} Q${CTRL[0]} ${CTRL[1]} ${MARS[0]} ${MARS[1]}`} stroke="#f0a27a" strokeOpacity="0.5" strokeWidth="3" strokeDasharray="10 14" fill="none" />
      <circle cx={EARTH[0]} cy={EARTH[1]} r="18" fill="url(#bd-mars-earth)" />
      <circle cx={MARS[0]} cy={MARS[1]} r="72" fill="url(#bd-mars-planet)" />
      <circle cx={MARS[0]} cy={MARS[1]} r="98" fill="none" stroke="#f0a27a" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx={MARS[0]} cy={MARS[1]} r="128" fill="none" stroke="#f0a27a" strokeOpacity="0.16" strokeWidth="2" />
      <g transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
        <circle r="7" fill="#ffe2cf" />
        <circle r="16" fill="none" stroke="#ffe2cf" strokeOpacity="0.5" strokeWidth="2" className="bd-anim-ping" />
      </g>
    </>
  )
}

export function Scene({ id, progress = 0 }: { id: MissionProfileId; progress?: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden focusable="false">
      {id === 'LAUNCH' && <LaunchScene />}
      {id === 'ISS' && <IssScene />}
      {id === 'MOON' && <MoonScene />}
      {id === 'MARS_TRANSIT' && <MarsScene progress={progress} />}
    </svg>
  )
}
