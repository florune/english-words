import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { StoredState } from '../types/word'

export interface SyncConfig {
  supabaseUrl: string
  supabasePublishableKey: string
}

interface ProgressResponse {
  state?: StoredState
  updatedAt?: number
}

async function readError(response: Response) {
  try {
    const value = await response.json() as { error?: string }
    return value.error || '同步服务暂时不可用。'
  } catch {
    return '同步服务暂时不可用。'
  }
}

export async function loadSyncConfig(): Promise<SyncConfig | undefined> {
  try {
    const response = await fetch('/api/sync-config', { cache: 'no-store' })
    if (!response.ok) return undefined
    const value = await response.json() as Partial<SyncConfig>
    if (typeof value.supabaseUrl !== 'string' || typeof value.supabasePublishableKey !== 'string') return undefined
    return { supabaseUrl: value.supabaseUrl, supabasePublishableKey: value.supabasePublishableKey }
  } catch {
    return undefined
  }
}

export function createAuthClient(config: SyncConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  })
}

async function progressRequest<T>(method: 'GET' | 'PUT', accessToken: string, body?: unknown): Promise<T> {
  const response = await fetch('/api/progress', {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!response.ok) throw new Error(await readError(response))
  return response.json() as Promise<T>
}

export function getRemoteProgress(accessToken: string) {
  return progressRequest<ProgressResponse>('GET', accessToken)
}

export function saveRemoteProgress(accessToken: string, state: StoredState) {
  return progressRequest<ProgressResponse>('PUT', accessToken, { state })
}
