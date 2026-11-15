import { getLang } from '../../i18n'

/**
 * Lower case a label used inside a sentence ("heart rate, blood oxygen"). Only for languages that
 * write common nouns in lower case: German nouns keep their capital, Japanese has no case.
 */
export function lowerLabel(label: string): string {
  const lang = getLang()
  return lang === 'de' || lang === 'ja' ? label : label.toLowerCase()
}
