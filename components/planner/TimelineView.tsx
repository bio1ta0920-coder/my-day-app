'use client'

import { useEffect, useRef, useState } from 'react'
import type { Activity } from '@/lib/types'
import { timeToMinutes, getDuration, formatDuration, getAllPlannerCategories } from '@/lib/storage'

interface Props {
  activities: Activity[]
  isToday: boolean
  onEdit: (activity: Activity) => void
}

function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export default function TimelineView({ activities, isToday, onEdit }: Props) {
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null)
  const currentTimeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isToday) return
    setCurrentMinutes(getCurrentMinutes())
    const interval = setInterval(() => setCurrentMinutes(getCurrentMinutes()), 60000)
    return () => clearInterval(interval)
  }, [isToday])

  useEffect(() => {
    if (isToday && currentTimeRef.current) {
      currentTimeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isToday])

  const allCats = getAllPlannerCategories()
  const getCatEmoji = (catId: string): string => allCats.find(c => c.id === catId)?.emoji || '📌'

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="relative overflow-hidden">
      <div className="relative flex" style={{ height: '1440px' }}>
        {/* 시간 레이블 */}
        <div className="flex-shrink-0 w-10 relative">
          {hours.map(h => (
            <div key={h} className="absolute flex items-start justify-end pr-2" style={{ top: `${h * 60}px`, height: '60px' }}>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{h}시</span>
            </div>
          ))}
        </div>

        {/* 타임라인 */}
        <div className="flex-1 relative border-l border-slate-200">
          {hours.map(h => (
            <div key={h} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: `${h * 60}px` }} />
          ))}
          {hours.map(h => (
            <div key={`half-${h}`} className="absolute left-0 right-0 border-t border-dashed border-slate-100" style={{ top: `${h * 60 + 30}px` }} />
          ))}

          {/* 활동 블록 */}
          {activities.map(act => {
            const startMins = timeToMinutes(act.startTime)
            const duration = getDuration(act.startTime, act.endTime)
            const height = Math.max(duration, 24)
            const emoji = getCatEmoji(act.category)
            // 항상 현재 카테고리 색상 사용 (기존 저장 데이터도 새 파스텔 색 반영)
            const catColor = allCats.find(c => c.id === act.category)?.color ?? act.color

            return (
              <button
                key={act.id}
                onClick={() => onEdit(act)}
                className="absolute left-1 right-1 rounded-xl overflow-hidden transition-transform active:scale-95 text-left"
                style={{
                  top: `${startMins}px`,
                  height: `${height}px`,
                  backgroundColor: catColor + '55',
                  borderLeft: `3px solid ${catColor}`,
                }}
              >
                <div className="px-2 py-1 h-full flex flex-col justify-center">
                  {height >= 32 ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{emoji}</span>
                        <span className="text-xs font-bold truncate text-slate-700">{act.name}</span>
                      </div>
                      {height >= 44 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-500">{act.startTime} ~ {act.endTime}</span>
                          <span className="text-[10px] text-slate-400">· {formatDuration(duration)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">{emoji}</span>
                      <span className="text-[10px] font-bold truncate text-slate-700">{act.name}</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}

          {/* 현재 시각 라인 */}
          {currentMinutes !== null && (
            <div
              ref={currentTimeRef}
              className="absolute left-0 right-0 flex items-center z-10"
              style={{ top: `${currentMinutes}px` }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
              <div className="flex-1 h-0.5 bg-red-500 opacity-80" />
              <span className="text-[9px] font-bold text-red-500 px-1 flex-shrink-0">
                {String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:{String(currentMinutes % 60).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
