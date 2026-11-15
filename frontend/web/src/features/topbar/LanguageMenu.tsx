import clsx from 'clsx'
import { ChevronDown, Languages } from 'lucide-react'
import { useState } from 'react'
import { LANGS, langInfo, setLanguage, useI18n, useT } from '../../i18n'
import { MENU_ITEM, MenuRow } from './menu'

/**
 * Language picker inside the Tools menu (Display group). One "Language" item expands in place into
 * the five languages (menuitemradio, native names). English is the default; the browser language
 * is never applied automatically. Non English entries carry a "pending native review" tooltip.
 */
export function LanguageMenuItems() {
  const t = useT()
  const lang = useI18n((s) => s.lang)
  const loading = useI18n((s) => s.loading)
  const [expanded, setExpanded] = useState(false)
  const current = langInfo(lang)
  // Outside English the word "Language" is repeated in English, so anyone can find the way back.
  const label = lang === 'en' ? t('tools.language') : `${t('tools.language')} (Language)`
  return (
    <>
      <button
        type="button"
        role="menuitem"
        tabIndex={-1}
        data-keep-open
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className={MENU_ITEM}
      >
        <MenuRow
          icon={<Languages size={15} />}
          label={label}
          hint={loading ? t('tools.languageLoading') : current.native}
          right={<ChevronDown size={14} className={clsx('shrink-0 text-ink-500 transition-transform', expanded && 'rotate-180')} aria-hidden />}
        />
      </button>
      {expanded && (
        <div role="group" aria-label={t('tools.languageGroupAria')} className="ml-11 flex flex-col">
          {LANGS.map((l) => {
            const sel = l.id === lang
            const tip = l.pendingReview ? `${l.english}. ${t('tools.languagePending')}` : l.english
            return (
              <button
                key={l.id}
                type="button"
                role="menuitemradio"
                aria-checked={sel}
                tabIndex={-1}
                lang={l.id}
                title={tip}
                aria-description={l.pendingReview ? t('tools.languagePending') : undefined}
                onClick={() => void setLanguage(l.id)}
                className={clsx(MENU_ITEM, 'py-1.5')}
              >
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', sel ? 'bg-accent' : 'ring-1 ring-white/25')} aria-hidden />
                <span className={clsx('min-w-0 flex-1 text-[13px]', sel ? 'font-semibold text-ink-100' : 'text-ink-300')}>{l.native}</span>
                {l.pendingReview && (
                  <span className="shrink-0 text-[10px] text-ink-500" aria-hidden>
                    beta
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
