import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _lastConfig = ''

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  const url = localStorage.getItem('supabase_url') ?? ''
  const key = localStorage.getItem('supabase_anon_key') ?? ''
  if (!url || !key) return null
  const config = `${url}::${key}`
  if (config !== _lastConfig || !_client) {
    _client = createClient(url, key)
    _lastConfig = config
  }
  return _client
}

export function getSyncCode(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sync_code') || null
}

export function isCloudConfigured(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    localStorage.getItem('supabase_url') &&
    localStorage.getItem('supabase_anon_key') &&
    localStorage.getItem('sync_code')
  )
}
