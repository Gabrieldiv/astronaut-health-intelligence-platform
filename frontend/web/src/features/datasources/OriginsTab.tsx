import type { DataOrigin } from '../../types/domain'
import { ORIGIN_META, OriginBadge } from './shared'
import { useT } from '../../i18n'
import { tx } from '../../i18n/rich'

const ORDER: DataOrigin[] = ['REAL_PUBLIC', 'DERIVED', 'SIMULATED', 'MANUAL']

export function OriginsTab() {
  const t = useT()
  return (
    <div className="space-y-4">
      <p className="max-w-[760px] text-xs leading-relaxed text-ink-300">
        {tx('datasources.origins.intro', { code: <span className="font-mono text-[11px] text-ink-100">data_origin</span> })}
      </p>
      <div className="overflow-x-auto rounded-xl ring-1 ring-white/[0.07]">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
          <caption className="sr-only">{t('datasources.origins.caption')}</caption>
          <thead>
            <tr className="bg-white/[0.03] text-[11px] text-ink-500">
              <th scope="col" className="px-3 py-2 font-semibold">
                {t('datasources.origins.colLabel')}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t('datasources.origins.colMeaning')}
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                {t('datasources.origins.colWhere')}
              </th>
            </tr>
          </thead>
          <tbody>
            {ORDER.map((o) => (
              <tr key={o} className="border-t border-white/[0.05] align-top">
                <th scope="row" className="px-3 py-2.5 font-normal">
                  <OriginBadge origin={o} />
                </th>
                <td className="px-3 py-2.5 leading-relaxed text-ink-300">{ORIGIN_META[o].meaning}</td>
                <td className="px-3 py-2.5 leading-relaxed text-ink-500">{ORIGIN_META[o].inAhi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink-500">
        <li>{t('datasources.origins.rule1')}</li>
        <li>{t('datasources.origins.rule2')}</li>
        <li>{t('datasources.origins.rule3')}</li>
      </ul>
    </div>
  )
}
