import clsx from 'clsx'
import { UserRound } from 'lucide-react'
import { useT } from '../../i18n'
import { useProfileStore } from './profileStore'

/**
 * Opens the crew profile of one astronaut. Three looks: a small icon button for the crew cards, a
 * compact text button for the stage header and the Crew view. The button is never nested in
 * another button: the crew card keeps its own select behavior.
 */
export function ProfileButton({ astronautId, callsign, variant = 'text', className }: { astronautId: string; callsign: string; variant?: 'icon' | 'text'; className?: string }) {
  const t = useT()
  const label = variant === 'icon' ? t('profile.open', { callsign }) : t('profile.openStage', { callsign })
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-keyshortcuts="I"
      onClick={() => useProfileStore.getState().open(astronautId)}
      className={clsx(
        'focus-ring inline-flex shrink-0 items-center justify-center text-ink-300 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.08] hover:text-ink-100',
        variant === 'icon' ? 'size-6 rounded-lg bg-white/[0.04]' : 'h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium',
        className,
      )}
    >
      <UserRound size={variant === 'icon' ? 13 : 14} aria-hidden />
      {variant === 'text' && <span>{t('profile.openShort')}</span>}
    </button>
  )
}
