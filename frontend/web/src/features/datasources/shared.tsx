import clsx from 'clsx'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { DataOrigin } from '../../types/domain'
import { t } from '../../i18n'

interface OriginMeta {
  /** Origin code, never translated. */
  label: string
  className: string
  /** Translated on read (getters, see src/i18n). */
  readonly meaning: string
  readonly inAhi: string
}

const origin = (o: DataOrigin, className: string): OriginMeta => ({
  label: o,
  className,
  get meaning() {
    return t(`datasources.origin.${o}.meaning`)
  },
  get inAhi() {
    return t(`datasources.origin.${o}.inAhi`)
  },
})

export const ORIGIN_META: Record<DataOrigin, OriginMeta> = {
  REAL_PUBLIC: origin('REAL_PUBLIC', 'bg-accent/10 text-accent ring-1 ring-accent/30'),
  DERIVED: origin('DERIVED', 'bg-sky-400/10 text-sky-200 ring-1 ring-sky-300/30'),
  SIMULATED: origin('SIMULATED', 'bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/30'),
  MANUAL: origin('MANUAL', 'bg-white/[0.06] text-ink-300 ring-1 ring-white/15'),
}

export function OriginBadge({ origin, className }: { origin: DataOrigin; className?: string }) {
  const m = ORIGIN_META[origin]
  return (
    <span
      title={m.meaning}
      className={clsx('inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap', m.className, className)}
    >
      {m.label}
    </span>
  )
}

export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('focus-ring inline-flex items-center gap-1 rounded text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent', className)}
    >
      {children}
      <ExternalLink size={11} aria-hidden className="shrink-0" />
      <span className="sr-only">{t('datasources.opensNewTab')}</span>
    </a>
  )
}

/** Short hash with a copy button for the full value. */
export function HashValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="tabular rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-ink-100" title={value}>
        {value.slice(0, 12)}…{value.slice(-6)}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t('datasources.shaCopied') : t('datasources.copySha')}
        title={copied ? t('datasources.copied') : t('datasources.copySha')}
        className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-500 ring-1 ring-white/[0.07] hover:bg-white/[0.06] hover:text-ink-100"
      >
        {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? t('datasources.copied') : ''}
      </span>
    </span>
  )
}

/** Definition list row. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('grid grid-cols-[112px_1fr] gap-3 py-1.5', className)}>
      <dt className="text-[11px] leading-5 font-medium text-ink-500">{label}</dt>
      <dd className="min-w-0 text-xs leading-5 break-words text-ink-300">{children}</dd>
    </div>
  )
}

export function NotStated() {
  return <span className="text-ink-500 italic">{t('datasources.notStated')}</span>
}

export function formatIsoUtc(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
