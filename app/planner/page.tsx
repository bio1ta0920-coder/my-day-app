'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Sparkles, Clock4, LayoutList } from 'lucide-react'
import type { Activity, PlannerDayRecord } from '@/lib/types'
import {
  getPlannerRecord,
  savePlannerRecord,
  getTodayString,
  formatDate,
  addDays,
  timeToMinutes,
  getDuration,
  formatDuration,
  getApiKey,
  getAllPlannerCategories,
} from '@/lib/storage'
import ActivityModal from '@/components/planner/ActivityModal'
import ClockView from '@/components/planner/ClockView'
import TimelineView from '@/components/planner/TimelineView'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getTotalScheduledMinutes(activities: Activity[]): number {
  return activities.reduce((sum, act) => sum + getDuration(act.startTime, act.endTime), 0)
}

export default function PlannerPage() {
  const today = getTodayString()
  const [selectedDate, setSelectedDate] = useState(today)
  const [record, setRecord] = useState<PlannerDayRecord | null>(null)
  const [viewMode, setViewMode] = useState<'clock' | 'timeline'>('clock')
  const [showModal, setShowModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const isToday = selectedDate === today

  useEffect(() => {
    const r = getPlannerRecord(selectedDate)
    setRecord(r)
    setReflectionText(r?.reflection || '')
    setReflectionSaved(false)
    setFeedbackError(null)
  }, [selectedDate])

  const activities = record?.activities || []
  const sortedActivities = [...activities].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  )
  const totalMinutes = getTotalScheduledMinutes(activities)

  const ensureRecord = useCallback((date: string): PlannerDayRecord => {
    return record || { date, activities: [], feedback: null, reflection: null }
  }, [record])

  const handleSaveActivity = useCallback((data: Omit<Activity, 'id'>) => {
    const rec = ensureRecord(selectedDate)
    let updatedActivities: Activity[]
    if (editingActivity) {
      updatedActivities = rec.activities.map(a => a.id === editingActivity.id ? { ...data, id: editingActivity.id } : a)
    } else {
      updatedActivities = [...rec.activities, { ...data, id: generateId() }]
    }
    const updated: PlannerDayRecord = { ...rec, activities: updatedActivities }
    savePlannerRecord(updated)
    setRecord(updated)
    setShowModal(false)
    setEditingActivity(null)
  }, [selectedDate, editingActivity, ensureRecord])

  const handleDeleteActivity = useCallback((id: string) => {
    if (!record) return
    const updated: PlannerDayRecord = { ...record, activities: record.activities.filter(a => a.id !== id) }
    savePlannerRecord(updated)
    setRecord(updated)
  }, [record])

  const handleEditActivity = useCallback((activity: Activity) => {
    setEditingActivity(activity)
    setShowModal(true)
  }, [])

  const handleGetFeedback = async () => {
    if (activities.length === 0) { setFeedbackError('활동을 먼저 추가해주세요.'); return }
    setIsLoadingFeedback(true)
    setFeedbackError(null)
    try {
      const apiKey = getApiKey()
      const res = await fetch('/api/feedback/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, activities, apiKey }),
      })
      const data = await res.json() as { feedback?: string; error?: string }
      if (!res.ok) throw new Error(data.error || '피드백 생성에 실패했습니다.')
      const rec = ensureRecord(selectedDate)
      const updated: PlannerDayRecord = { ...rec, feedback: data.feedback || null }
      savePlannerRecord(updated)
      setRecord(updated)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.'
      setFeedbackError(msg)
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  const handleSaveReflection = () => {
    const rec = ensureRecord(selectedDate)
    const updated: PlannerDayRecord = { ...rec, reflection: reflectionText || null }
    savePlannerRecord(updated)
    setRecord(updated)
    setReflectionSaved(true)
    setTimeout(() => setReflectionSaved(false), 2000)
  }

  const showReflection = !!(record?.feedback || record?.reflection)

  const allCats = getAllPlannerCategories()
  const getCatEmoji = (catId: string) => allCats.find(c => c.id === catId)?.emoji || '📌'
  const getCatColor = (catId: string) => allCats.find(c => c.id === catId)?.color || '#64748b'

  return (
    <div className="max-w-lg mx-auto">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-pink-400 via-pink-300 to-rose-400 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => dateInputRef.current?.showPicker?.()} className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">{formatDate(selectedDate)}</span>
              {isToday && <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">오늘</span>}
            </div>
          </button>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        <input ref={dateInputRef} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="sr-only" />
        <div className="text-center">
          <span className="text-white/80 text-sm font-medium">
            {totalMinutes > 0 ? `${formatDuration(totalMinutes)} 기록됨` : '아직 기록이 없어요'}
          </span>
        </div>
      </div>

      {/* 뷰 토글 */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-5 py-3 border-b border-slate-100 shadow-sm">
        <div className="flex bg-slate-100 rounded-full p-1 gap-1">
          <button
            onClick={() => setViewMode('clock')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-all ${viewMode === 'clock' ? 'bg-pink-400 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock4 size={15} />
            시계 뷰
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-all ${viewMode === 'timeline' ? 'bg-pink-400 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutList size={15} />
            타임라인
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* 시각화 */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
          {viewMode === 'clock' ? (
            <div>
              <ClockView activities={activities} isToday={isToday} />
              <button
                onClick={() => { setEditingActivity(null); setShowModal(true) }}
                className="mt-4 w-full py-3 bg-pink-50 hover:bg-pink-100 border-2 border-dashed border-pink-200 text-pink-400 font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} strokeWidth={2.5} />
                활동 추가하기
              </button>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
              <TimelineView activities={activities} isToday={isToday} onEdit={handleEditActivity} />
            </div>
          )}
        </div>

        {/* 활동 목록 */}
        <div>
          <h2 className="text-sm font-bold text-slate-600 mb-3 px-1">오늘의 활동</h2>
          {sortedActivities.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-600 font-semibold text-sm">아직 활동이 없어요</p>
              <p className="text-slate-400 text-xs mt-1">+ 추가 버튼을 눌러 하루를 채워보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedActivities.map(act => {
                const emoji = getCatEmoji(act.category)
                const color = getCatColor(act.category)
                const duration = getDuration(act.startTime, act.endTime)
                return (
                  <div key={act.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex">
                    <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 px-3 py-3 flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg flex-shrink-0">{emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{act.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{act.startTime} ~ {act.endTime} · {formatDuration(duration)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEditActivity(act)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-pink-50 hover:text-pink-400 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteActivity(act.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AI 피드백 */}
        <div>
          <button
            onClick={handleGetFeedback}
            disabled={isLoadingFeedback || activities.length === 0}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-400 text-white font-bold text-sm rounded-2xl shadow-lg shadow-violet-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoadingFeedback ? (
              <><div className="spinner" />분석 중...</>
            ) : (
              <><Sparkles size={16} />AI 피드백 받기</>
            )}
          </button>

          {feedbackError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-medium">{feedbackError}</div>
          )}

          {record?.feedback && (
            <div className="mt-3 bg-gradient-to-br from-pink-50 to-pink-50 border border-pink-100 rounded-3xl p-5 fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-rose-400" />
                <span className="text-sm font-bold text-violet-800">AI 피드백</span>
              </div>
              <div
                className="feedback-text text-sm"
                dangerouslySetInnerHTML={{
                  __html: record.feedback.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>'),
                }}
              />
            </div>
          )}
        </div>

        {/* 소감 */}
        {showReflection && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 fade-in">
            <h3 className="text-sm font-bold text-slate-700 mb-3">오늘 하루 소감 💭</h3>
            <textarea
              rows={3}
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder="오늘 하루를 돌아보며..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all resize-none"
            />
            <button
              onClick={handleSaveReflection}
              className="mt-3 w-full py-3 bg-pink-400 text-white font-semibold text-sm rounded-xl transition-all active:scale-95"
            >
              {reflectionSaved ? '✓ 저장됨' : '저장'}
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingActivity(null); setShowModal(true) }}
        className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-full shadow-xl shadow-pink-200 flex items-center justify-center z-30 hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {showModal && (
        <ActivityModal
          activity={editingActivity}
          onSave={handleSaveActivity}
          onClose={() => { setShowModal(false); setEditingActivity(null) }}
        />
      )}
    </div>
  )
}
