'use client'

import { useEffect } from 'react'
import { pullFromCloud } from '@/lib/sync'

export default function SyncInitializer() {
  useEffect(() => {
    // 세션당 한 번만 동기화 (무한 리로드 방지)
    if (sessionStorage.getItem('cloud_synced')) return
    sessionStorage.setItem('cloud_synced', '1')

    pullFromCloud().then(synced => {
      if (synced) {
        // 클라우드 데이터 받아왔으면 페이지 새로고침으로 반영
        window.location.reload()
      }
    })
  }, [])

  return null
}
