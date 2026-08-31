import { computed, reactive, ref, watch } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clearState, emptyState, isStoredState, loadState, saveState } from './services/storage'
import { loadWords } from './services/words'
import { loadPhonetics } from './services/phonetics'
import { loadTranslations } from './services/translations'
import { createAuthClient, getRemoteProgress, loadSyncConfig, saveRemoteProgress } from './services/sync'
import { dayKey, daysBetween } from './utils/dates'
import type { StoredState, StudyMode, WordEntry, WordProgress, WordStatus } from './types/word'

const state = reactive<StoredState>(loadState())
const words = ref<WordEntry[]>([])
const phonetics = ref<Record<string, string[]>>({})
const translations = ref<Record<string, string[]>>({})
const ready = ref(false)
const error = ref('')
const recentRanks = ref<number[]>([])
type SyncPhase = 'checking' | 'unavailable' | 'signed-out' | 'code-sent' | 'syncing' | 'synced' | 'error'
const syncPhase = ref<SyncPhase>('checking')
const syncEmail = ref('')
const syncMessage = ref('')
const lastSyncedAt = ref<number>()
let syncClient: SupabaseClient | undefined
let syncTimer: ReturnType<typeof window.setTimeout> | undefined
let scheduleSyncAction: () => void = () => undefined

function persist() { saveState(state); scheduleSyncAction() }
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
  const isDark = computed(() => state.settings.theme === 'dark' || (state.settings.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches))
  const recentProgress = computed(() => Object.entries(state.progress)
    .filter(([, item]) => item.viewedCount > 0)
    .sort(([, a], [, b]) => b.lastViewedAt - a.lastViewedAt).slice(0, 5)
    .map(([rank, progress]) => ({ word: words.value[Number(rank) - 1], progress })))

  function mergeCloudState(remote: StoredState) {
    const progress: StoredState['progress'] = {}
    const ranks = new Set([...Object.keys(state.progress), ...Object.keys(remote.progress)])
    for (const rank of ranks) {
      const local = state.progress[Number(rank)]
      const cloud = remote.progress[Number(rank)]
      if (!local && cloud) { progress[Number(rank)] = cloud; continue }
      if (local && !cloud) { progress[Number(rank)] = local; continue }
      if (!local || !cloud) continue
      const newest = cloud.lastViewedAt > local.lastViewedAt ? cloud : local
      progress[Number(rank)] = {
        status: newest.status,
        viewedCount: Math.max(local.viewedCount, cloud.viewedCount),
        lastViewedAt: Math.max(local.lastViewedAt, cloud.lastViewedAt)
      }
    }
    const activity: StoredState['activity'] = {}
    const days = new Set([...Object.keys(state.activity), ...Object.keys(remote.activity)])
    for (const day of days) {
      const local = state.activity[day]
      const cloud = remote.activity[day]
      activity[day] = { viewed: Math.max(local?.viewed ?? 0, cloud?.viewed ?? 0), marked: Math.max(local?.marked ?? 0, cloud?.marked ?? 0) }
    }
    Object.assign(state, { ...state, progress, activity })
    saveState(state)
  }

  function setSignedOut(message = '') {
    syncEmail.value = ''
    syncPhase.value = 'signed-out'
    syncMessage.value = message
  }

  async function syncNow() {
    if (!syncClient) { syncPhase.value = 'unavailable'; return false }
    const { data: { session } } = await syncClient.auth.getSession()
    if (!session) { setSignedOut('请登录后再同步。'); return false }
    syncEmail.value = session.user.email ?? ''
    syncPhase.value = 'syncing'
    syncMessage.value = '正在合并本机与云端进度…'
    try {
      const remote = await getRemoteProgress(session.access_token)
      if (remote.state) mergeCloudState(remote.state)
      const saved = await saveRemoteProgress(session.access_token, state)
      lastSyncedAt.value = saved.updatedAt ?? Date.now()
      syncPhase.value = 'synced'
      syncMessage.value = '已同步到云端。'
      return true
    } catch (cause) {
      syncPhase.value = 'error'
      syncMessage.value = cause instanceof Error ? cause.message : '同步失败，请稍后重试。'
      return false
    }
  }

  function scheduleSync() {
    if (!syncClient || !['synced', 'syncing'].includes(syncPhase.value)) return
    if (syncTimer) window.clearTimeout(syncTimer)
    syncTimer = window.setTimeout(() => { void syncNow() }, 1_200)
  }

  async function initializeSync() {
    const config = await loadSyncConfig()
    if (!config) {
      syncPhase.value = 'unavailable'
      syncMessage.value = '云端同步尚未配置；学习记录仍只保存在本机。'
      return
    }
    syncClient = createAuthClient(config)
    const { data: { session } } = await syncClient.auth.getSession()
    if (!session) { setSignedOut('登录后可在设备间自动同步进度。'); return }
    syncEmail.value = session.user.email ?? ''
    await syncNow()
  }

  async function requestSyncCode(email: string) {
    if (!syncClient) { syncMessage.value = '云端同步尚未配置。'; return false }
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) { syncMessage.value = '请输入有效的邮箱地址。'; return false }
    syncPhase.value = 'syncing'
    syncMessage.value = '正在发送验证码…'
    const { error: authError } = await syncClient.auth.signInWithOtp({ email: normalized, options: { emailRedirectTo: window.location.origin } })
    if (authError) { syncPhase.value = 'error'; syncMessage.value = authError.message; return false }
    syncEmail.value = normalized
    syncPhase.value = 'code-sent'
    syncMessage.value = '登录邮件已发送：可输入六码验证码，或直接点击邮件中的登录链接。'
    return true
  }

  async function verifySyncCode(code: string) {
    if (!syncClient || !syncEmail.value) { syncMessage.value = '请先填写邮箱并获取验证码。'; return false }
    const token = code.trim()
    if (!/^\d{6}$/.test(token)) { syncMessage.value = '请输入 6 位验证码。'; return false }
    syncPhase.value = 'syncing'
    const { data, error: authError } = await syncClient.auth.verifyOtp({ email: syncEmail.value, token, type: 'email' })
    if (authError || !data.session) { syncPhase.value = 'error'; syncMessage.value = authError?.message ?? '验证码无效或已过期。'; return false }
    return syncNow()
  }

  async function signOutSync() {
    if (syncClient) await syncClient.auth.signOut({ scope: 'local' })
    setSignedOut('已退出同步，本机学习记录不会被删除。')
  }

  async function initialize() {
    try {
      const [wordList, phoneticMap, translationMap] = await Promise.all([loadWords(), loadPhonetics(), loadTranslations()])
      words.value = wordList
      phonetics.value = phoneticMap
      translations.value = translationMap
      ready.value = true
      void initializeSync()
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
  function toggleTheme() {
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const isDark = state.settings.theme === 'dark' || (state.settings.theme === 'system' && systemDark)
    setTheme(isDark ? 'light' : 'dark')
  }
  function setVoice(voiceURI: string) { state.settings.voiceURI = voiceURI; persist() }

  watch(() => state.settings.theme, (theme) => document.documentElement.dataset.theme = theme, { immediate: true })
  scheduleSyncAction = scheduleSync
  return { state, words, phonetics, translations, ready, error, totals, today, streak, totalStudyDays, isDark, recentProgress, syncPhase, syncEmail, syncMessage, lastSyncedAt, initialize, initializeSync, syncNow, requestSyncCode, verifySyncCode, signOutSync, setRange, getProgress, trackView, setStatus, nextRank, wordFor, exportProgress, importProgress, reset, setTheme, toggleTheme, setVoice }
}
