import type { StoredState } from '../types/word'

const STORAGE_KEY = 'word-pocket:state:v1'

export const emptyState = (): StoredState => ({
  version: 1,
  progress: {},
  frequencyCursor: 1,
  rangeMax: 1000,
  activity: {},
  settings: { theme: 'system' }
})

export function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const value = JSON.parse(raw) as Partial<StoredState>
    return {
      ...emptyState(),
      ...value,
      progress: value.progress ?? {},
      activity: value.activity ?? {},
      settings: { ...emptyState().settings, ...value.settings }
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}

export function isStoredState(value: unknown): value is StoredState {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<StoredState>
  return data.version === 1 && !!data.progress && !!data.activity && !!data.settings
}
