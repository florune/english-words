interface Env {
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
}

interface FunctionContext {
  env: Env
}

export const onRequestGet = ({ env }: FunctionContext): Response => {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return Response.json({ error: '云端同步尚未配置。' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  return Response.json({
    supabaseUrl: env.SUPABASE_URL,
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY
  }, { headers: { 'Cache-Control': 'no-store' } })
}
