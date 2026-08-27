export const DICTIONARY_URL = 'https://dictionary.cambridge.org/dictionary/english/'

export function dictionaryUrl(word: string) {
  return `${DICTIONARY_URL}${encodeURIComponent(word)}`
}
