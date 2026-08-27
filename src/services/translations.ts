export type TranslationMap = Record<string, string[]>

let cache: TranslationMap | undefined

export async function loadTranslations() {
  if (cache) return cache
  const response = await fetch('/data/translations.json')
  if (!response.ok) throw new Error('中文释义读取失败')
  cache = await response.json() as TranslationMap
  return cache
}
