import { readFile, writeFile } from 'node:fs/promises'

const [dictionaryPath, wordsPath, outputPath] = process.argv.slice(2)
if (!dictionaryPath || !wordsPath || !outputPath) {
  throw new Error('Usage: node scripts/build-phonetics.mjs <cmudict.dict> <words.json> <phonetics.json>')
}

const arpabetToIpa = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ',
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', EH: 'ɛ', ER: 'ɝ', EY: 'eɪ',
  F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'i', JH: 'dʒ', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p',
  R: 'ɹ', S: 's', SH: 'ʃ', T: 't', TH: 'θ', UH: 'ʊ', UW: 'u',
  V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ'
}
const vowels = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'])

function toIpa(phones) {
  return phones.reduce((ipa, phone) => {
    const match = phone.match(/^([A-Z]+)([012])?$/)
    if (!match || !arpabetToIpa[match[1]]) return ipa
    const [ , base, stress ] = match
    const symbol = base === 'ER' && stress === '0' ? 'ɚ' : base === 'AH' && stress === '0' ? 'ə' : arpabetToIpa[base]
    const stressMark = vowels.has(base) ? (stress === '1' ? 'ˈ' : stress === '2' ? 'ˌ' : '') : ''
    return `${ipa}${stressMark}${symbol}`
  }, '')
}

const dictionary = await readFile(dictionaryPath, 'utf8')
const source = new Map()
for (const line of dictionary.split(/\r?\n/)) {
  const [entry, ...phones] = line.trim().split(/\s+/)
  if (!entry || !phones.length) continue
  const word = entry.replace(/\(\d+\)$/, '')
  const ipa = toIpa(phones)
  if (!ipa) continue
  const variants = source.get(word) ?? []
  const vowelCount = phones.filter((phone) => vowels.has(phone.replace(/[012]$/, ''))).length
  const readableIpa = vowelCount <= 1 ? ipa.replace(/[ˈˌ]/g, '') : ipa
  if (!variants.includes(readableIpa)) variants.push(readableIpa)
  source.set(word, variants)
}

const words = JSON.parse(await readFile(wordsPath, 'utf8'))
const output = Object.fromEntries(words
  .filter(({ word }) => source.has(word))
  .map(({ word }) => [word, source.get(word)]))
await writeFile(outputPath, `${JSON.stringify(output)}\n`)
console.log(`Wrote ${Object.keys(output).length} IPA entries for ${words.length} words to ${outputPath}`)
