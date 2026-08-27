import { readFile, writeFile } from 'node:fs/promises'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  throw new Error('Usage: node scripts/build-word-list.mjs <source.json> <output.json>')
}

const rows = JSON.parse(await readFile(input, 'utf8'))
const words = rows.map(([word, frequency], index) => ({ rank: index + 1, word, frequency }))
if (words.length !== 25_000) throw new Error(`Expected 25,000 words; got ${words.length}`)
await writeFile(output, `${JSON.stringify(words)}\n`)
console.log(`Wrote ${words.length} words to ${output}`)
