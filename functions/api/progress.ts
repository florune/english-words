type Status = 'new' | 'unknown' | 'fuzzy' | 'known'

interface StoredState {
  version: 1
  progress: Record<string, { status: Status; viewedCount: number; lastViewedAt: number }>
  frequencyCursor: number
  rangeMax: number
  activity: Record<string, { viewed: number; marked: number }>
  settings: { theme: 'system' | 'light' | 'dark'; voiceURI: string }
}

interface D1Statement {
  bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> }
}

interface D1Database {
  prepare(query: string): D1Statement
  exec(query: string): Promise<unknown>
}

interface Env {
  PROGRESS_DB?: D1Database
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
}

interface FunctionContext {
  request: Request
  env: Env
}

interface StoredRow { state_json: string; updated_at: number }
interface AuthUser { id?: string }
type DatabaseAccess = { error: Response } | { userId: string; db: D1Database }

const MAX_STATE_BYTES = 2_000_000
const STATUSES = new Set<Status>(['new', 'unknown', 'fuzzy', 'known'])

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })

async function ensureTable(db: D1Database) {
  await db.exec('CREATE TABLE IF NOT EXISTS word_progress (user_id TEXT PRIMARY KEY NOT NULL, state_json TEXT NOT NULL, updated_at INTEGER NOT NULL)')
}

async function authenticatedUser(request: Request, env: Env): Promise<string | undefined> {
  const authorization = request.headers.get('Authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return undefined
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` }
  })
  if (!response.ok) return undefined
  const user = await response.json() as AuthUser
  return typeof user.id === 'string' ? user.id : undefined
}

function isPositiveInteger(value: unknown, maximum: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum
}

function isStoredState(value: unknown): value is StoredState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<StoredState>
  if (state.version !== 1 || !state.progress || !state.activity || !state.settings) return false
  if (!isPositiveInteger(state.frequencyCursor, 25_000) || !isPositiveInteger(state.rangeMax, 25_000)) return false
  if (!['system', 'light', 'dark'].includes(state.settings.theme) || typeof state.settings.voiceURI !== 'string') return false
  for (const [rank, progress] of Object.entries(state.progress)) {
    if (!/^([1-9]\d{0,4})$/.test(rank) || Number(rank) > 25_000 || !progress || typeof progress !== 'object') return false
    const item = progress as { status?: unknown; viewedCount?: unknown; lastViewedAt?: unknown }
    if (!STATUSES.has(item.status as Status) || !isPositiveInteger(item.viewedCount, 1_000_000) || !isPositiveInteger(item.lastViewedAt, 9_999_999_999_999)) return false
  }
  for (const activity of Object.values(state.activity)) {
    if (!activity || typeof activity !== 'object' || !isPositiveInteger(activity.viewed, 1_000_000) || !isPositiveInteger(activity.marked, 1_000_000)) return false
  }
  return true
}

async function requireUser(context: FunctionContext): Promise<DatabaseAccess> {
  if (!context.env.PROGRESS_DB) return { error: json({ error: '进度数据库尚未绑定。' }, 503) }
  const userId = await authenticatedUser(context.request, context.env)
  if (!userId) return { error: json({ error: '登录已失效，请重新验证邮箱。' }, 401) }
  return { userId, db: context.env.PROGRESS_DB }
}

export const onRequestGet = async (context: FunctionContext): Promise<Response> => {
  const access = await requireUser(context)
  if ('error' in access) return access.error
  await ensureTable(access.db)
  const row = await access.db.prepare('SELECT state_json, updated_at FROM word_progress WHERE user_id = ?').bind(access.userId).first<StoredRow>()
  if (!row) return json({})
  try {
    const state = JSON.parse(row.state_json)
    if (!isStoredState(state)) throw new Error('invalid state')
    return json({ state, updatedAt: row.updated_at })
  } catch {
    return json({ error: '云端进度格式无效。' }, 500)
  }
}

export const onRequestPut = async (context: FunctionContext): Promise<Response> => {
  const access = await requireUser(context)
  if ('error' in access) return access.error
  const raw = await context.request.text()
  if (raw.length > MAX_STATE_BYTES) return json({ error: '进度数据过大。' }, 413)
  let value: { state?: unknown }
  try { value = JSON.parse(raw) as { state?: unknown } } catch { return json({ error: '进度数据不是有效 JSON。' }, 400) }
  if (!isStoredState(value.state)) return json({ error: '进度数据格式不正确。' }, 400)
  await ensureTable(access.db)
  const updatedAt = Date.now()
  await access.db.prepare('INSERT INTO word_progress (user_id, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at').bind(access.userId, raw, updatedAt).run()
  return json({ updatedAt })
}
