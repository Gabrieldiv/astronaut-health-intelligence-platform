import { Hourglass, Rocket, Stethoscope } from 'lucide-react'
import type { Recommendation } from '../../types/domain'
import { Badge } from '../../components/ui'
import { LARGE_DELAY_SEC, roundTripText, useCommDelaySec } from '../shared/hooks'
import { useT } from '../../i18n'

/**
 * Who can close the loop on a recommendation.
 * ONBOARD: the crew can act now. GROUND_REVIEW: needs the flight surgeon on Earth, so with a
 * large comm delay the earliest Earth reply time is shown too.
 */
export function AutonomyBadge({ rec, size = 'sm' }: { rec: Recommendation; size?: 'sm' | 'lg' }) {
  const delay = useCommDelaySec()
  const t = useT()
  const autonomy = rec.autonomy ?? (rec.requiresHumanReview ? 'GROUND_REVIEW' : null)
  if (!autonomy) return null
  const big = size === 'lg' ? 'px-2 py-1 text-[11px]' : undefined
  if (autonomy === 'ONBOARD') {
    return (
      <Badge tone="accent" className={big} icon={<Rocket size={size === 'lg' ? 12 : 10} aria-hidden />} title={t('attention.autonomy.onboardTitle')}>
        {t('attention.autonomy.onboard')}
      </Badge>
    )
  }
  const far = delay >= LARGE_DELAY_SEC
  return (
    <>
      <Badge tone="warn" className={big} icon={<Stethoscope size={size === 'lg' ? 12 : 10} aria-hidden />} title={t('attention.autonomy.groundTitle')}>
        {t('attention.autonomy.ground')}
      </Badge>
      {far && (
        <Badge tone="neutral" className={big} icon={<Hourglass size={size === 'lg' ? 12 : 10} aria-hidden />} title={t('attention.autonomy.replyTitle')}>
          {t('attention.autonomy.reply', { time: roundTripText(delay) })}
        </Badge>
      )}
    </>
  )
}
