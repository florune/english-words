import { readFile, writeFile } from 'node:fs/promises'

const [dictionaryPath, wordsPath, outputPath] = process.argv.slice(2)
if (!dictionaryPath || !wordsPath || !outputPath) {
  throw new Error('Usage: node scripts/build-translations.mjs <ecdict.csv> <words.json> <translations.json>')
}

function readCsv(text, onRow) {
  let field = ''
  let row = []
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1 }
      else quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field); field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(field); onRow(row); field = ''; row = []
    } else field += char
  }
  if (field || row.length) { row.push(field); onRow(row) }
}

const words = JSON.parse(await readFile(wordsPath, 'utf8'))
const targets = new Set(words.map(({ word }) => word))
const translations = {}
let header = []
readCsv(await readFile(dictionaryPath, 'utf8'), (row) => {
  if (!header.length) { header = row; return }
  const word = row[header.indexOf('word')]
  const translation = row[header.indexOf('translation')]
  if (!word || !translation || !targets.has(word)) return
  const lines = translation.replace(/\\n/g, '\n').replace(/\r/g, '').split('\n')
    .map((line) => line.trim()).filter((line) => line && !line.startsWith('[网络]')).slice(0, 4)
  if (lines.length) translations[word] = lines
})

await writeFile(outputPath, `${JSON.stringify(translations)}\n`)
console.log(`Wrote ${Object.keys(translations).length} Chinese entries for ${words.length} words to ${outputPath}`)
