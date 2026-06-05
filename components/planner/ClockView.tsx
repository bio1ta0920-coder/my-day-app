'use client'

import { useMemo, useEffect, useState } from 'react'
import type { Activity } from '@/lib/types'
import { getAllPlannerCategories, getDuration, formatDuration } from '@/lib/storage'

interface Props {
  activities: Activity[]
  isToday: boolean
}

const CX = 190
const CY = 190
const R = 148

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function pieSegment(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const s = polarToCartesian(cx, cy, r, startAngle - 90)
  const e = polarToCartesian(cx, cy, r, endAngle - 90)
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0
  return [`M ${cx} ${cy}`, `L ${s.x} ${s.y}`, `A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`, 'Z'].join(' ')
}

function timeToAngle(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return ((h * 60 + m) / 1440) * 360
}

function getCurrentTimeAngle(): number {
  const now = new Date()
  return ((now.getHours() * 60 + now.getMinutes()) / 1440) * 360
}

function splitLabel(name: string, maxLen = 5): string[] {
  if (name.length <= maxLen) return [name]
  return [name.slice(0, maxLen), name.slice(maxLen, maxLen * 2)]
}

export default function ClockView({ activities, isToday }: Props) {
  const [currentAngle, setCurrentAngle] = useState<number | null>(null)

  useEffect(() => {
    if (!isToday) return
    setCurrentAngle(getCurrentTimeAngle())
    const interval = setInterval(() => setCurrentAngle(getCurrentTimeAngle()), 60000)
    return () => clearInterval(interval)
  }, [isToday])

  const allCats = useMemo(() => getAllPlannerCategories(), [])
  const getCatEmoji = (catId: string) => allCats.find(c => c.id === catId)?.emoji || '📌'

  const hourMarkers = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * 360 - 90
      const rad = (angle * Math.PI) / 180
      const isMajor = i % 6 === 0
      const isMid = i % 3 === 0
      const tickOuter = R + (isMajor ? 14 : isMid ? 10 : 6)
      const tickInner = R + 2
      const labelR = R + (isMajor ? 26 : 20)
      return {
        x1: CX + tickInner * Math.cos(rad),
        y1: CY + tickInner * Math.sin(rad),
        x2: CX + tickOuter * Math.cos(rad),
        y2: CY + tickOuter * Math.sin(rad),
        labelX: CX + labelR * Math.cos(rad),
        labelY: CY + labelR * Math.sin(rad),
        isMajor,
        isMid,
        hour: i,
      }
    })
  }, [])

  const handTip = useMemo(() => {
    if (currentAngle === null) return null
    const rad = ((currentAngle - 90) * Math.PI) / 180
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) }
  }, [currentAngle])

  const categorySummary = useMemo(() => {
    const map: Record<string, { color: string; emoji: string; minutes: number }> = {}
    for (const act of activities) {
      const dur = getDuration(act.startTime, act.endTime)
      if (!map[act.category]) {
        map[act.category] = { color: act.color, emoji: getCatEmoji(act.category), minutes: 0 }
      }
      map[act.category].minutes += dur
    }
    return Object.entries(map).map(([cat, v]) => ({ cat, ...v })).sort((a, b) => b.minutes - a.minutes)
  }, [activities, allCats])

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 380 380" className="w-full max-w-sm">
        {/* 배경 원 (미계획 시간) */}
        <circle cx={CX} cy={CY} r={R} fill="#e8edf5" />

        {/* 시간 구분선 */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i / 24) * 360 - 90
          const rad = (angle * Math.PI) / 180
          return (
            <line key={`grid-${i}`} x1={CX} y1={CY} x2={CX + R * Math.cos(rad)} y2={CY + R * Math.sin(rad)} stroke="white" strokeWidth={0.5} opacity={0.4} />
          )
        })}

        {/* 활동 파이 조각 */}
        {activities.map(act => {
          const startAngle = timeToAngle(act.startTime)
          let endAngle = timeToAngle(act.endTime)
          if (endAngle <= startAngle) endAngle += 360
          const span = endAngle - startAngle
          if (span < 1) return null

          // 항상 현재 카테고리 색상 사용 (기존 저장 데이터도 새 파스텔 색 반영)
          const catColor = allCats.find(c => c.id === act.category)?.color ?? act.color

          const path = pieSegment(CX, CY, R, startAngle, endAngle)
          const midAngle = startAngle + span / 2
          const midRad = ((midAngle - 90) * Math.PI) / 180
          const emojiR = R * 0.58
          const textR = R * 0.75
          const ex = CX + emojiR * Math.cos(midRad)
          const ey = CY + emojiR * Math.sin(midRad)
          const tx = CX + textR * Math.cos(midRad)
          const ty = CY + textR * Math.sin(midRad)
          const lines = splitLabel(act.name, 4)

          return (
            <g key={act.id}>
              <path d={path} fill={catColor} opacity={0.92} stroke="white" strokeWidth={1.5} />
              {span >= 12 && (
                <text x={ex} y={ey} textAnchor="middle" dominantBaseline="central" fontSize={span >= 25 ? 18 : 13}>
                  {getCatEmoji(act.category)}
                </text>
              )}
              {span >= 20 && lines.map((line, li) => (
                <text
                  key={li}
                  x={tx}
                  y={ty + li * 11}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={span >= 35 ? 10 : 8}
                  fontWeight="700"
                  fill="#374151"
                  fontFamily="Pretendard, Arial, sans-serif"
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}

        {/* 눈금 & 레이블 */}
        {hourMarkers.map((mk, i) => (
          <g key={i}>
            <line x1={mk.x1} y1={mk.y1} x2={mk.x2} y2={mk.y2} stroke={mk.isMajor ? '#334155' : mk.isMid ? '#64748b' : '#94a3b8'} strokeWidth={mk.isMajor ? 2.5 : mk.isMid ? 1.5 : 1} strokeLinecap="round" />
            {(mk.isMajor || mk.isMid) && (
              <text x={mk.labelX} y={mk.labelY} textAnchor="middle" dominantBaseline="central" fontSize={mk.isMajor ? 11 : 9} fontWeight={mk.isMajor ? '800' : '600'} fill={mk.isMajor ? '#1e293b' : '#475569'} fontFamily="Pretendard, Arial, sans-serif">
                {mk.hour}
              </text>
            )}
          </g>
        ))}

        {/* 원 테두리 */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#94a3b8" strokeWidth={1.5} />

        {/* 중심점 */}
        <circle cx={CX} cy={CY} r={7} fill="#1e293b" />
        <circle cx={CX} cy={CY} r={4} fill="white" />

        {/* 현재 시각 바늘 */}
        {handTip && (
          <>
            <line x1={CX} y1={CY} x2={handTip.x} y2={handTip.y} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" opacity={0.95} />
            <circle cx={handTip.x} cy={handTip.y} r={4} fill="#ef4444" />
          </>
        )}
      </svg>

      {/* 범례 */}
      {categorySummary.length > 0 && (
        <div className="w-full mt-3 px-1">
          <div className="grid grid-cols-2 gap-2">
            {categorySummary.map(({ cat, color, emoji, minutes }) => (
              <div key={cat} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-slate-100">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-700 truncate">{emoji} {cat}</span>
                  <span className="text-xs text-pink-400 font-bold flex-shrink-0">{formatDuration(minutes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <p className="text-slate-400 text-xs mt-3 font-medium">아래 + 버튼으로 활동을 추가해보세요</p>
      )}
    </div>
  )
}
