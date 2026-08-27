export type PhoneticMap = Record<string, string[]>

let cache: PhoneticMap | undefined

export async function loadPhonetics() {
  if (cache) return cache
  const response = await fetch('/data/phonetics.json')
  if (!response.ok) throw new Error('音标数据读取失败')
  cache = await response.json() as PhoneticMap
  return cache
}
