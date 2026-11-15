import { Fragment, type ReactNode } from 'react'
import { t, type MessageKey } from '.'

/**
 * Translate a key whose `{slots}` hold React nodes (links, <strong>, <Kbd>), keeping word order
 * free per language. Plain string or number values are inserted as text.
 */
export function tx(key: MessageKey, slots: Record<string, ReactNode>): ReactNode {
  const raw = t(key)
  const parts = raw.split(/(\{\w+\})/g)
  return parts.map((p, i) => {
    const m = /^\{(\w+)\}$/.exec(p)
    if (m && m[1]! in slots) return <Fragment key={i}>{slots[m[1]!]}</Fragment>
    return p ? <Fragment key={i}>{p}</Fragment> : null
  })
}
