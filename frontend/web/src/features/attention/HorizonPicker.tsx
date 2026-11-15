import clsx from 'clsx'
import { FORECAST_HORIZONS } from '../../engine/config'
import { horizonText, useForecastHorizon } from './forecastHorizon'
import { useT } from '../../i18n'

/** Segmented control: 24 h, 36 h, 72 h, 7 days, 15 days. Keyboard: Tab to a button, Enter or Space picks it. */
export function HorizonPicker({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'xs' }) {
  const hours = useForecastHorizon((s) => s.hours)
  const setHours = useForecastHorizon((s) => s.set)
  const t = useT()
  return (
    <div className={clsx('flex rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-white/[0.06]', className)} role="group" aria-label={t('attention.horizonGroup')}>
      {FORECAST_HORIZONS.options.map((h) => (
        <button
          key={h}
          type="button"
          aria-pressed={hours === h}
          onClick={() => setHours(h)}
          title={t('attention.horizonTitle', { horizon: horizonText(h) })}
          className={clsx(
            'focus-ring tabular rounded-md font-semibold whitespace-nowrap',
            size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]',
            hours === h ? 'bg-white/10 text-ink-100' : 'text-ink-500 hover:text-ink-300',
          )}
        >
          {horizonText(h)}
        </button>
      ))}
    </div>
  )
}
