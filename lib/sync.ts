import { getSupabaseClient, getSyncCode } from './supabase'

// 앱 데이터 키 식별
function isAppKey(key: string): boolean {
  return (
    key.startsWith('gaegyebu_') ||
    key.startsWith('health_diary_') ||
    key.startsWith('record_') ||
    key.startsWith('study_') ||
    key === 'book_records' ||
    key === 'home_todos' ||
    key.startsWith('unified_') ||
    key === 'settings' ||
    key === 'sync_code'
  )
}

/** 단일 키를 클라우드에 저장 (fire-and-forget) */
export function pushToCloud(dataKey: string, value: string): void {
  const client = getSupabaseClient()
  const userId = getSyncCode()
  if (!client || !userId) return

  client
    .from('app_data')
    .upsert(
      { user_id: userId, data_key: dataKey, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,data_key' }
    )
    .then(({ error }) => {
      // 오프라인 등으로 실패해도 앱 동작은 막지 않되, 콘솔에는 남긴다
      if (error) console.error('클라우드 저장 실패:', dataKey, error)
    })
}

/** 클라우드에서 모든 데이터를 가져와 localStorage에 저장 */
export async function pullFromCloud(): Promise<boolean> {
  const client = getSupabaseClient()
  const userId = getSyncCode()
  if (!client || !userId) return false

  try {
    const { data, error } = await client
      .from('app_data')
      .select('data_key, value')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) return false

    for (const row of data) {
      localStorage.setItem(row.data_key as string, row.value as string)
    }
    return true
  } catch {
    return false
  }
}

/** 현재 localStorage의 모든 앱 데이터를 클라우드에 업로드
 *  반환값: 업로드한 항목 수(>=0), 실패 시 -1 (0은 "저장할 데이터 없음"과 구분됨) */
export async function pushAllToCloud(): Promise<number> {
  const client = getSupabaseClient()
  const userId = getSyncCode()
  if (!client || !userId) return -1

  const rows: { user_id: string; data_key: string; value: string; updated_at: string }[] = []
  const now = new Date().toISOString()

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !isAppKey(key)) continue
    const value = localStorage.getItem(key)
    if (value) rows.push({ user_id: userId, data_key: key, value, updated_at: now })
  }

  if (rows.length === 0) return 0

  try {
    const { error } = await client.from('app_data').upsert(rows, { onConflict: 'user_id,data_key' })
    if (error) {
      console.error('클라우드 업로드 실패:', error)
      return -1
    }
    return rows.length
  } catch (e) {
    console.error('클라우드 업로드 실패:', e)
    return -1
  }
}
