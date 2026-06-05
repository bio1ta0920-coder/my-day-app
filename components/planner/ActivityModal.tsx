'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Clock } from 'lucide-react'
import type { Activity, PlannerCategory } from '@/lib/types'
import { PLANNER_CATEGORIES } from '@/lib/constants'
import { getDuration, formatDuration, timeToMinutes, getPlannerSettings } from '@/lib/storage'

interface Props {
  activity?: Activity | null
  onSave: (activity: Omit<Activity, 'id'>) => void
  onClose: () => void
}

const QUICK_DURATIONS = [
  { label: '30분', minutes: 30 },
  { label: '1시간', minutes: 60 },
  { label: '1시간 30분', minutes: 90 },
  { label: '2시간', minutes: 120 },
  { label: '3시간', minutes: 180 },
  { label: '8시간', minutes: 480 },
]

function minutesToTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function ActivityModal({ activity, onSave, onClose }: Props) {
  const [allCategories, setAllCategories] = useState<PlannerCategory[]>(PLANNER_CATEGORIES)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(PLANNER_CATEGORIES[0].id)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const settings = getPlannerSettings()
    setAllCategories([...PLANNER_CATEGORIES, ...settings.customCategories])
  }, [])

  useEffect(() => {
    if (activity) {
      setName(activity.name)
      setCategory(activity.category)
      setStartTime(activity.startTime)
      setEndTime(activity.endTime)
      setNotes(activity.notes)
    }
  }, [activity])

  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])

  const handleQuickDuration = useCallback((minutes: number) => {
    const startMins = timeToMinutes(startTime)
    setEndTime(minutesToTime(startMins + minutes))
  }, [startTime])

  const duration = getDuration(startTime, endTime)
  const selectedCat = allCategories.find(c => c.id === category) || allCategories[0]

  const handleSubmit = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      category,
      startTime,
      endTime,
      color: selectedCat?.color || '#6366f1',
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white slide-up">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-pink-400 to-rose-400">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white">
          <X size={20} />
        </button>
        <h2 className="text-base font-bold text-white">{activity ? '활동 수정' : '활동 추가'}</h2>
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="px-4 py-1.5 bg-white text-pink-400 font-semibold text-sm rounded-full disabled:opacity-40 transition-opacity"
        >
          저장
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">활동명</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="무엇을 했나요?"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {allCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl border-2 transition-all ${category === cat.id ? 'border-transparent shadow-md scale-105' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                  style={category === cat.id ? { backgroundColor: cat.color + '20', borderColor: cat.color } : {}}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className={`text-[11px] font-medium ${category === cat.id ? 'text-slate-800' : 'text-slate-500'}`}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">시간 설정</label>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">시작</p>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>
                <div className="mt-5 text-slate-400 font-medium">~</div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1.5 font-medium">종료</p>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-slate-200">
                <Clock size={13} className="text-pink-400" />
                <span className="text-xs font-semibold text-pink-400">{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2 font-medium">빠른 시간 선택</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_DURATIONS.map(qd => (
                  <button
                    key={qd.minutes}
                    onClick={() => handleQuickDuration(qd.minutes)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-pink-200 hover:text-pink-400 hover:bg-pink-50 transition-all"
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">메모 (선택)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="간단한 메모를 남겨보세요..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-100 bg-white">
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold text-base rounded-2xl shadow-lg shadow-pink-200 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95"
        >
          저장하기
        </button>
      </div>
    </div>
  )
}
