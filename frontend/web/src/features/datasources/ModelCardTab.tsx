import { FlaskConical, Gauge, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import evaluationJson from '../../engine/evaluation.json'
import { useAppStore } from '../../state/store'
import type { EngineEvaluation } from '../../types/domain'
import { StatusPill } from '../../components/Status'
import { SectionLabel } from '../../components/ui'
import { t as tr, useT } from '../../i18n'
import { tx } from '../../i18n/rich'
import { scenarioName as catalogScenarioName } from '../../i18n/catalog'
import { formatIsoUtc } from './shared'

const evaluation = evaluationJson as unknown as EngineEvaluation

function minutes(v: number | null): string {
  if (v == null) return tr('datasources.model.notReached')
  if (v < 60) return tr('datasources.model.minutes', { n: Math.round(v) })
  const h = v / 60
  return h < 48 ? tr('datasources.model.hours', { n: h.toFixed(1) }) : tr('datasources.model.days', { n: (h / 24).toFixed(1) })
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3.5 py-3 ring-1 ring-white/[0.07]">
      <div className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{label}</div>
      <div className="tabular mt-1 text-lg font-semibold text-ink-100">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </section>
  )
}

export function ModelCardTab() {
  const t = useT()
  const scenarios = useAppStore((s) => s.scenarios)
  const crew = useAppStore((s) => s.crew)
  const placeholder = evaluation.engineVersion === 'placeholder'
  const scenarioName = (id: string) => {
    const s = scenarios.find((x) => x.id === id)
    return s ? catalogScenarioName(s) : id
  }
  const target = (id: string | null) => {
    if (!id) return t('datasources.model.wholeCabin')
    const a = crew.find((c) => c.id === id)
    return a ? `${a.callsign} (${a.id})` : id
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <Section title={t('datasources.model.evalTitle')}>
          {placeholder ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center">
              <Gauge size={20} className="mx-auto text-ink-500" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-ink-100">{t('datasources.model.evalMissingTitle')}</p>
              <p className="mt-1 text-xs text-ink-500">
                {tx('datasources.model.evalMissingBody', {
                  cmd: <code className="rounded bg-white/[0.05] px-1 py-0.5 font-mono text-[11px] text-ink-300">npm run evaluate</code>,
                  file: <span className="font-mono text-[11px]">src/engine/evaluation.json</span>,
                })}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tile label={t('datasources.model.tileFalseAlerts')} value={evaluation.nominal.falseAlertsPerCrewDay.toFixed(2)} sub={t('datasources.model.tileFalseAlertsSub')} />
                <Tile label={t('datasources.model.tileSimulated')} value={`${Math.round(evaluation.nominal.simulatedHours)} h`} sub={t('datasources.model.tileSimulatedSub')} />
                <Tile label={t('datasources.model.tileCrewHours')} value={Math.round(evaluation.nominal.crewHours)} sub={t('datasources.model.tileCrewHoursSub')} />
                <Tile
                  label={t('datasources.model.tileWorst')}
                  value={<StatusPill status={evaluation.nominal.maxLevel} variant="technical" size="sm" />}
                  sub={t('datasources.model.tileWorstSub')}
                />
              </div>
              <div className="overflow-x-auto rounded-xl ring-1 ring-white/[0.07]">
                <table className="tabular w-full min-w-[560px] border-collapse text-[11px]">
                  <caption className="sr-only">{t('datasources.model.tableCaption')}</caption>
                  <thead>
                    <tr className="bg-white/[0.03] text-left text-ink-500">
                      <th scope="col" className="px-3 py-1.5 font-semibold">{t('datasources.model.colScenario')}</th>
                      <th scope="col" className="px-3 py-1.5 font-semibold">{t('datasources.model.colTarget')}</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-semibold">{t('datasources.model.colFirstAlert')}</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-semibold">HIGH</th>
                      <th scope="col" className="px-3 py-1.5 text-right font-semibold">CRITICAL</th>
                      <th scope="col" className="px-3 py-1.5 font-semibold">{t('datasources.model.colPeak')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluation.scenarios.map((s) => (
                      <tr key={s.scenarioId} className="border-t border-white/[0.05]">
                        <th scope="row" className="px-3 py-1.5 text-left font-medium text-ink-100">
                          {scenarioName(s.scenarioId)}
                        </th>
                        <td className="px-3 py-1.5 text-ink-300">{s.target ? target(s.target) : t('datasources.model.none')}</td>
                        <td className="px-3 py-1.5 text-right text-ink-100">{minutes(s.timeToFirstAlertMin)}</td>
                        <td className="px-3 py-1.5 text-right text-ink-100">{minutes(s.timeToHighMin)}</td>
                        <td className="px-3 py-1.5 text-right text-ink-100">{minutes(s.timeToCriticalMin)}</td>
                        <td className="px-3 py-1.5">
                          <StatusPill status={s.peakLevel} variant="technical" size="sm" />
                        </td>
                      </tr>
                    ))}
                    {evaluation.scenarios.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-3 text-center text-ink-500">
                          {t('datasources.model.noScenarios')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-ink-500">{t('datasources.model.engineLine', { version: evaluation.engineVersion, when: formatIsoUtc(evaluation.generatedAt) })}</p>
            </>
          )}
          {evaluation.notes.length > 0 && !placeholder && (
            <ul className="list-disc space-y-1 pl-4 text-xs text-ink-300 marker:text-ink-500">
              {evaluation.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <p className="flex items-start gap-1.5 text-[11px] text-ink-500">
            <FlaskConical size={12} className="mt-0.5 shrink-0 text-violet-200" aria-hidden />
            {t('datasources.model.evalDisclaimer')}
          </p>
        </Section>

        <Section title={t('datasources.model.methodTitle')}>
          <ul className="space-y-1.5 text-xs leading-relaxed text-ink-300">
            <li>
              <span className="font-semibold text-ink-100">{t('datasources.model.baselineLabel')}</span> {t('datasources.model.baselineBody')}
            </li>
            <li>
              <span className="font-semibold text-ink-100">{t('datasources.model.anomalyLabel')}</span> {t('datasources.model.anomalyBody')}
            </li>
            <li>
              <span className="font-semibold text-ink-100">{t('datasources.model.riskLabel')}</span> {t('datasources.model.riskBody')}
            </li>
            <li>
              <span className="font-semibold text-ink-100">{t('datasources.model.forecastLabel')}</span> {t('datasources.model.forecastBody')}
            </li>
            <li>
              <span className="font-semibold text-ink-100">{t('datasources.model.recsLabel')}</span> {t('datasources.model.recsBody')}
            </li>
          </ul>
        </Section>
      </div>

      <aside className="space-y-6">
        <Section title={t('datasources.model.intendedTitle')}>
          <p className="text-xs leading-relaxed text-ink-300">{t('datasources.model.intendedBody')}</p>
        </Section>
        <Section title={t('datasources.model.limitationsTitle')}>
          <ul className="space-y-2 text-xs leading-relaxed text-ink-300">
            {(['limit1', 'limit2', 'limit3', 'limit4', 'limit5'] as const).map((k) => (
              <li key={k} className="flex gap-2">
                <ShieldAlert size={13} className="mt-0.5 shrink-0 text-ink-500" aria-hidden />
                {t(`datasources.model.${k}`)}
              </li>
            ))}
          </ul>
        </Section>
      </aside>
    </div>
  )
}
