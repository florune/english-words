import { computed, reactive, ref, watch } from 'vue'
import { clearState, emptyState, isStoredState, loadState, saveState } from './services/storage'
import { loadWords } from './services/words'
import { loadPhonetics } from './services/phonetics'
import { loadTranslations } from './services/translations'
import { dayKey, daysBetween } from './utils/dates'
import type { StoredState, StudyMode, WordEntry, WordProgress, WordStatus } from './types/word'

const state = reactive<StoredState>(loadState())
const words = ref<WordEntry[]>([])
const phonetics = ref<Record<string, string[]>>({})
const translations = ref<Record<string, string[]>>({})
const ready = ref(false)
const error = ref('')
const recentRanks = ref<number[]>([])

function persist() { saveState(state) }
function recordActivity(kind: 'viewed' | 'marked') {
  const key = dayKey()
  state.activity[key] ??= { viewed: 0, marked: 0 }
  state.activity[key][kind] += 1
}

export function useStudy() {
  const totals = computed(() => {
    const entries = Object.values(state.progress)
    return {
      total: words.value.length || 25_000,
      viewed: entries.filter((item) => item.viewedCount > 0).length,
      unknown: entries.filter((item) => item.status === 'unknown').length,
      fuzzy: entries.filter((item) => item.status === 'fuzzy').length,
      known: entries.filter((item) => item.status === 'known').length
    }
  })
  const today = computed(() => state.activity[dayKey()] ?? { viewed: 0, marked: 0 })
  const streak = computed(() => {
    const studied = Object.keys(state.activity).filter((key) => state.activity[key].viewed > 0).sort().reverse()
    if (!studied.length) return 0
    const todayOrYesterday = daysBetween(dayKey(), studied[0])
    if (todayOrYesterday > 1) return 0
    let count = 1
    for (let index = 1; index < studied.length; index += 1) {
      if (daysBetween(studied[index - 1], studied[index]) !== 1) break
      count += 1
    }
    return count
  })
  const totalStudyDays = computed(() => Object.values(state.activity).filter((item) => item.viewed > 0).length)
  const recentProgress = computed(() => Object.entries(state.progress)
    .filter(([, item]) => item.viewedCount > 0)
    .sort(([, a], [, b]) => b.lastViewedAt - a.lastViewedAt).slice(0, 5)
    .map(([rank, progress]) => ({ word: words.value[Number(rank) - 1], progress })))

  async function initialize() {
    try {
      const [wordList, phoneticMap, translationMap] = await Promise.all([loadWords(), loadPhonetics(), loadTranslations()])
      words.value = wordList
      phonetics.value = phoneticMap
      translations.value = translationMap
      ready.value = true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '词库读取失败'
    }
  }

  function setRange(max: number) {
    state.rangeMax = max
    if (state.frequencyCursor > max) state.frequencyCursor = 1
    persist()
  }
  function getProgress(rank: number): WordProgress {
    return state.progress[rank] ?? { status: 'new', viewedCount: 0, lastViewedAt: 0 }
  }
  function trackView(rank: number) {
    const prior = getProgress(rank)
    state.progress[rank] = { ...prior, viewedCount: prior.viewedCount + 1, lastViewedAt: Date.now() }
    recordActivity('viewed')
    recentRanks.value = [rank, ...recentRanks.value.filter((item) => item !== rank)].slice(0, 12)
    persist()
  }
  function setStatus(rank: number, status: Exclude<WordStatus, 'new'>) {
    const prior = getProgress(rank)
    state.progress[rank] = { ...prior, status, lastViewedAt: Date.now() }
    recordActivity('marked')
    persist()
  }
  function nextRank(mode: StudyMode) {
    const max = Math.min(state.rangeMax, words.value.length)
    if (mode === 'frequency') {
      const rank = state.frequencyCursor
      state.frequencyCursor = rank >= max ? 1 : rank + 1
      persist()
      return rank
    }
    const statusForMode: Partial<Record<StudyMode, WordStatus[]>> = {
      unknown: ['unknown'], fuzzy: ['fuzzy'], review: ['unknown', 'fuzzy']
    }
    const statuses = statusForMode[mode]
    const candidates = words.value.slice(0, max).filter((word) => !statuses || statuses.includes(getProgress(word.rank).status))
    if (!candidates.length) return undefined
    const fresh = candidates.filter((word) => !recentRanks.value.includes(word.rank))
    const pool = fresh.length ? fresh : candidates
    return pool[Math.floor(Math.random() * pool.length)].rank
  }
  function wordFor(rank: number | undefined) { return rank ? words.value[rank - 1] : undefined }
  function exportProgress() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href; link.download = 'english-progress.json'; link.click()
    URL.revokeObjectURL(href)
  }
  function importProgress(value: unknown) {
    if (!isStoredState(value)) throw new Error('这不是有效的 English Words 进度文件。')
    Object.assign(state, value)
    persist()
  }
  function reset() { clearState(); Object.assign(state, emptyState()) }
  function setTheme(theme: StoredState['settings']['theme']) { state.settings.theme = theme; persist() }
  function setVoice(voiceURI: string) { state.settings.voiceURI = voiceURI; persist() }

  watch(() => state.settings.theme, (theme) => document.documentElement.dataset.theme = theme, { immediate: true })
  return { state, words, phonetics, translations, ready, error, totals, today, streak, totalStudyDays, recentProgress, initialize, setRange, getProgress, trackView, setStatus, nextRank, wordFor, exportProgress, importProgress, reset, setTheme, setVoice }
}
