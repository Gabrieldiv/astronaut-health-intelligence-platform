import clsx from 'clsx'
import { Printer, UserRound } from 'lucide-react'
import { useAppStore } from '../../state/store'
import { Button } from '../../components/ui'
import { StatusDot } from '../../components/Status'
import { formatUtcDate } from '../../components/format'
import { useT } from '../../i18n'
import { roleLabel } from '../../i18n/catalog'
import { engineText, localMissionProfile } from '../../i18n/engineText'
import { Modal } from '../mission/Modal'
import { signalLostHeadline, useCrewStatus, useSignalLost } from '../shared/hooks'
import { useWearablePaused, wearablePausedHeadline } from '../vitals/deviceMeta'
import { useProfileStore } from './profileStore'
import { BaselinesSection, CheckInSection, DevicesSection, EventsSection, ExamsSection, IdentitySection, RadiationSection, SimBadge, TodaySection } from './sections'

/** Print rules of the profile: the shared print host (index.css) makes the panel white, this makes the text dark. */
const PROFILE_CSS = `
@media print {
  @page { margin: 12mm; }
  .ahi-profile * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .ahi-profile [class*="text-ink"], .ahi-profile h1 { color: #1f2937 !important; }
  .ahi-profile section { break-inside: avoid; border: 1px solid #d1d5db; background: #fff !important; box-shadow: none !important; }
  .ahi-profile .sr-only { position: static !important; width: auto !important; height: auto !important; margin: 2px 0 0 !important; clip: auto !important; overflow: visible !important; white-space: normal !important; color: #4b5563 !important; font-size: 11px; }
  .ahi-profile button[aria-expanded] { display: none !important; }
}
`

function Switcher({ current }: { current: string }) {
  const crew = useAppStore((s) => s.crew)
  const t = useT()
  return (
    <div role="group" aria-label={t('profile.switcher')} className="ahi-no-print mb-4 flex flex-wrap items-center gap-1.5">
      {crew.map((a) => (
        <SwitchButton key={a.id} id={a.id} callsign={a.callsign} color={a.color} active={a.id === current} />
      ))}
    </div>
  )
}

function SwitchButton({ id, callsign, color, active }: { id: string; callsign: string; color: string; active: boolean }) {
  const status = useCrewStatus(id)
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => useProfileStore.getState().open(id)}
      className={clsx(
        'focus-ring inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold tracking-wide ring-1 transition-colors',
        active ? 'bg-white/[0.09] text-ink-100 ring-white/25' : 'text-ink-300 ring-white/[0.08] hover:bg-white/[0.05] hover:text-ink-100',
      )}
    >
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
      {callsign}
      <StatusDot status={status} size={7} />
    </button>
  )
}

/** Profile and data view of one astronaut (identity, today, baselines, devices, check-in, exams, radiation, events). */
export function CrewProfileDialog({ astronautId }: { astronautId: string }) {
  const t = useT()
  const astronaut = useAppStore((s) => s.crew.find((c) => c.id === astronautId))
  const mission = useAppStore((s) => s.mission)
  const profileId = useAppStore((s) => s.missionProfileId)
  const health = useAppStore((s) => s.health[astronautId])
  const devices = useAppStore((s) => s.devices)
  const alerts = useAppStore((s) => s.alerts)
  const checkIns = useAppStore((s) => s.checkIns)
  const days = useAppStore((s) => s.missionDays?.[astronautId])
  const simNow = useAppStore((s) => s.clock.simNow)
  const status = useCrewStatus(astronautId)
  const signalLost = useSignalLost(astronautId)
  const paused = useWearablePaused(astronautId)
  const close = () => useProfileStore.getState().close()
  if (!astronaut) return null
  const override = signalLost && (health?.risk.risk_level == null || health.risk.risk_level === 'LOW')
  const sentence = override ? (paused ? wearablePausedHeadline() : signalLostHeadline()) : health?.risk.headline ? engineText('headline', health.risk.headline, health.risk.headlineMsg) : t('stage.waiting')
  const roleText = roleLabel(astronaut.role)
  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title={t('profile.titleFor', { callsign: astronaut.callsign })}
      hostClassName="ahi-print-host"
      icon={<UserRound size={17} className="text-accent" aria-hidden />}
      subtitle={t('profile.subtitle', { role: roleText, n: astronaut.missionDay })}
      headerExtra={
        <>
          <SimBadge />
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer size={13} aria-hidden /> {t('profile.print')}
          </Button>
        </>
      }
    >
      <style>{PROFILE_CSS}</style>
      <div className="ahi-profile">
        <h1 className="mb-3 hidden text-lg font-bold print:block">
          {t('profile.printTitle', { callsign: astronaut.callsign })} · {formatUtcDate(simNow)}
        </h1>
        <Switcher current={astronautId} />
        <div className="grid items-start gap-3 md:grid-cols-2">
          <IdentitySection astronaut={astronaut} roleText={roleText} missionName={mission.name} vehicle={localMissionProfile(profileId).vehicle} context={localMissionProfile(profileId).shortLabel} />
          <TodaySection
            astronautId={astronautId}
            status={status}
            statusLabel={paused && status === 'NO_DATA' ? t('devices.paused') : undefined}
            sentence={sentence}
            health={health}
            alerts={alerts}
          />
          <BaselinesSection astronautId={astronautId} health={health} devices={devices} />
          <DevicesSection astronautId={astronautId} devices={devices} />
          <CheckInSection checkIns={checkIns} astronautId={astronautId} />
          <ExamsSection health={health} />
          <RadiationSection health={health} days={days} profileId={profileId} />
          <EventsSection astronaut={astronaut} />
        </div>
      </div>
    </Modal>
  )
}

/** Mounted once at the app root: shows the profile of the astronaut in the profile store. */
export function CrewProfileHost() {
  const openId = useProfileStore((s) => s.openId)
  const exists = useAppStore((s) => (openId ? s.crew.some((c) => c.id === openId) : false))
  if (!openId || !exists) return null
  return <CrewProfileDialog astronautId={openId} />
}
