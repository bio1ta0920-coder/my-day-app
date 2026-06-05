'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, Sparkles, Plus, Check, X } from 'lucide-react'
import {
  getTodayString,
  formatDate,
  addDays,
  getAllBudgetRecords,
  getEffectiveBudgetSettings,
  getHealthRecord,
  getPlannerRecord,
  getApiKey,
  getAllPlannerCategories,
  getDuration,
  formatDuration,
  getTodos,
  saveTodos,
  getTodosForDate,
} from '@/lib/storage'
import type { BudgetDayRecord, HealthDayRecord, PlannerDayRecord, TodoItem } from '@/lib/types'

function formatFeedback(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inUl = false
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    if (line.match(/^[•\-]\s/)) {
      if (!inUl) { result.push('<ul>'); inUl = true }
      result.push(`<li>${line.replace(/^[•\-]\s/, '')}</li>`)
    } else {
      if (inUl) { result.push('</ul>'); inUl = false }
      if (line.trim() === '') result.push('')
      else result.push(`<p>${line}</p>`)
    }
  }
  if (inUl) result.push('</ul>')
  return result.join('\n')
}

// Mini donut SVG for planner
function MiniDonut({ record }: { record: PlannerDayRecord | null }) {
  const allCats = getAllPlannerCategories()
  const activities = record?.activities ?? []
  if (activities.length === 0) {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" fill="#e2e8f0" />
        <circle cx="40" cy="40" r="18" fill="white" />
        <text x="40" y="44" textAnchor="middle" fontSize="10" fill="#94a3b8">없음</text>
      </svg>
    )
  }

  const totalMins = 24 * 60
  let currentAngle = -90

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="30" fill="#e2e8f0" />
      {activities.map((act) => {
        const dur = getDuration(act.startTime, act.endTime)
        const angle = (dur / totalMins) * 360
        const startRad = (currentAngle * Math.PI) / 180
        const endRad = ((currentAngle + angle) * Math.PI) / 180
        const x1 = 40 + 30 * Math.cos(startRad)
        const y1 = 40 + 30 * Math.sin(startRad)
        const x2 = 40 + 30 * Math.cos(endRad)
        const y2 = 40 + 30 * Math.sin(endRad)
        const largeArc = angle > 180 ? 1 : 0
        const path = `M 40 40 L ${x1} ${y1} A 30 30 0 ${largeArc} 1 ${x2} ${y2} Z`
        const cat = allCats.find(c => c.id === act.category)
        currentAngle += angle
        return (
          <path
            key={act.id}
            d={path}
            fill={cat?.color ?? '#6366f1'}
            opacity={0.85}
            stroke="white"
            strokeWidth={1}
          />
        )
      })}
      <circle cx="40" cy="40" r="18" fill="white" />
    </svg>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [today, setToday] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const [budgetRecord, setBudgetRecord] = useState<BudgetDayRecord | null>(null)
  const [healthRecord, setHealthRecord] = useState<HealthDayRecord | null>(null)
  const [plannerRecord, setPlannerRecord] = useState<PlannerDayRecord | null>(null)

  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [unifiedFeedback, setUnifiedFeedback] = useState<string | null>(null)
  const [diaryText, setDiaryText] = useState('')
  const [diarySaved, setDiarySaved] = useState(false)

  // 투두
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [todoInput, setTodoInput] = useState('')

  const loadDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr)

    // Budget
    const allBudget = getAllBudgetRecords()
    const bRec = allBudget[dateStr] ?? null
    setBudgetRecord(bRec)

    // Health
    const hRec = getHealthRecord(dateStr)
    setHealthRecord(hRec)

    // Planner
    const pRec = getPlannerRecord(dateStr)
    setPlannerRecord(pRec)

    // Unified feedback
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`unified_feedback_${dateStr}`)
      setUnifiedFeedback(saved)
      const savedDiary = localStorage.getItem(`unified_diary_${dateStr}`)
      setDiaryText(savedDiary ?? '')
    }

    setFeedbackError('')
  }, [])

  useEffect(() => {
    const dateStr = getTodayString()
    setToday(dateStr)
    loadDate(dateStr)
    setTodos(getTodosForDate(dateStr))
  }, [loadDate])

  const isToday = selectedDate === today

  // Budget stats
  const totalSpent = budgetRecord?.expenses.reduce((s, e) => s + e.amount, 0) ?? 0
  const impulseSpent = budgetRecord?.expenses
    .filter(e => e.purchaseType === 'impulse')
    .reduce((s, e) => s + e.amount, 0) ?? 0

  const [y, m] = selectedDate ? selectedDate.split('-') : ['2026', '01']
  const monthKey = `${y}-${m}`
  const effective = getEffectiveBudgetSettings(monthKey)
  const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate()
  const dailyBudget = daysInMonth > 0
    ? Math.floor((effective.income - effective.savingsGoal) / daysInMonth)
    : 0
  const spentPct = dailyBudget > 0 ? Math.min((totalSpent / dailyBudget) * 100, 100) : 0
  const budgetBarColor = spentPct > 90 ? '#ef4444' : spentPct > 70 ? '#f97316' : '#22c55e'

  // Health stats
  const totalCalEaten = healthRecord?.meals.reduce(
    (s, meal) => s + meal.foods.reduce((ss, f) => ss + f.calories, 0), 0
  ) ?? 0
  const totalExerciseMin = healthRecord?.exercises.reduce((s, e) => s + e.duration, 0) ?? 0

  // Planner stats
  const totalActivityMins = plannerRecord?.activities.reduce(
    (s, a) => s + getDuration(a.startTime, a.endTime), 0
  ) ?? 0

  const handleGetUnifiedFeedback = async () => {
    setIsLoadingFeedback(true)
    setFeedbackError('')
    try {
      const apiKey = getApiKey()
      const budgetSummary = `총 지출: ${totalSpent.toLocaleString()}원, 충동구매: ${impulseSpent.toLocaleString()}원, 지출 항목: ${budgetRecord?.expenses.length ?? 0}건`
      const healthSummary = `섭취 칼로리: ${totalCalEaten}kcal, 운동: ${totalExerciseMin}분, 체중: ${healthRecord?.weight ?? '미입력'}kg`
      const plannerSummary = `기록된 활동: ${plannerRecord?.activities.length ?? 0}개, 총 기록 시간: ${formatDuration(totalActivityMins)}`

      const res = await fetch('/api/feedback/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetSummary,
          healthSummary,
          plannerSummary,
          date: selectedDate,
          apiKey,
        }),
      })
      const data = await res.json() as { feedback?: string; error?: string }
      if (!res.ok || data.error) {
        setFeedbackError(data.error ?? '피드백 생성에 실패했습니다.')
        return
      }
      const fb = data.feedback ?? ''
      setUnifiedFeedback(fb)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`unified_feedback_${selectedDate}`, fb)
      }
    } catch {
      setFeedbackError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  function addTodo() {
    if (!todoInput.trim()) return
    const newTodo: TodoItem = { id: Date.now().toString(), text: todoInput.trim(), completed: false, createdDate: today }
    const all = getTodos()
    const updated = [...all, newTodo]
    saveTodos(updated)
    setTodos(getTodosForDate(today))
    setTodoInput('')
  }

  function toggleTodo(id: string) {
    const all = getTodos()
    const updated = all.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    saveTodos(updated)
    setTodos(getTodosForDate(today))
  }

  function deleteTodo(id: string) {
    const all = getTodos()
    saveTodos(all.filter(t => t.id !== id))
    setTodos(getTodosForDate(today))
  }

  const handleSaveDiary = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`unified_diary_${selectedDate}`, diaryText)
    }
    setDiarySaved(true)
    setTimeout(() => setDiarySaved(false), 2000)
  }

  if (!selectedDate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-pink-400 via-pink-300 to-rose-400 text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => loadDate(addDays(selectedDate, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => dateInputRef.current?.showPicker?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-all"
          >
            <Calendar size={14} />
            <span className="text-sm font-semibold">{formatDate(selectedDate)}</span>
            {isToday && (
              <span className="text-xs bg-white/25 px-1.5 py-0.5 rounded-full">오늘</span>
            )}
          </button>

          <button
            onClick={() => loadDate(addDays(selectedDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={e => { if (e.target.value) loadDate(e.target.value) }}
          className="sr-only"
        />
        <p className="text-center text-pink-200 text-xs mt-1">나의 하루 한눈에 보기</p>
      </div>

      <div className="px-4 mt-4 space-y-3">

        {/* 투두리스트 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              ✅ 오늘 할 일
              <span className="text-xs text-slate-400 font-normal">
                {todos.filter(t => t.completed).length}/{todos.length}
              </span>
            </h2>
            {todos.filter(t => !t.completed && t.createdDate < today).length > 0 && (
              <span className="text-xs text-amber-500 font-semibold">
                🔄 {todos.filter(t => !t.completed && t.createdDate < today).length}개 이월됨
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-50">
            {todos.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">오늘 할 일을 추가해보세요</p>
            )}
            {todos.map(todo => (
              <div key={todo.id} className="px-4 py-2.5 flex items-center gap-3">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    todo.completed ? 'bg-emerald-400 border-emerald-400' : todo.createdDate < today ? 'border-amber-300' : 'border-slate-300'
                  }`}
                >
                  {todo.completed && <Check size={10} color="white" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {todo.createdDate < today && !todo.completed && (
                    <span className="text-xs text-amber-400 mr-1">이월</span>
                  )}
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-50 flex gap-2">
            <input
              type="text"
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              placeholder="할 일 추가..."
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-300 bg-slate-50 focus:bg-white transition-colors"
            />
            <button
              onClick={addTodo}
              disabled={!todoInput.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-pink-400 text-white hover:bg-pink-500 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* 가계부 카드 */}
        <button
          onClick={() => router.push('/budget')}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <span className="font-bold text-slate-800">가계부</span>
            </div>
            <span className="text-xs text-pink-400 font-medium">자세히 보기 →</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">오늘 총 지출</span>
              <span className="font-bold text-slate-800">{totalSpent.toLocaleString()}원</span>
            </div>
            {impulseSpent > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">충동구매</span>
                <span className="font-semibold text-red-500">{impulseSpent.toLocaleString()}원</span>
              </div>
            )}
            {dailyBudget > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>일일 예산 {dailyBudget.toLocaleString()}원</span>
                  <span>{Math.round(spentPct)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${spentPct}%`, backgroundColor: budgetBarColor }}
                  />
                </div>
              </div>
            )}
          </div>
        </button>

        {/* 헬스 카드 */}
        <button
          onClick={() => router.push('/health')}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏃</span>
              <span className="font-bold text-slate-800">헬스</span>
            </div>
            <span className="text-xs text-pink-400 font-medium">자세히 보기 →</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">칼로리</p>
              <p className="font-bold text-slate-800 text-sm">{totalCalEaten.toLocaleString()}</p>
              <p className="text-xs text-slate-400">kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">운동</p>
              <p className="font-bold text-slate-800 text-sm">
                {totalExerciseMin > 0 ? `${totalExerciseMin}분` : '없음'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">체중</p>
              <p className="font-bold text-slate-800 text-sm">
                {healthRecord?.weight != null ? `${healthRecord.weight}kg` : '미입력'}
              </p>
            </div>
          </div>
        </button>

        {/* 일과표 카드 */}
        <button
          onClick={() => router.push('/planner')}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span className="font-bold text-slate-800">일과표</span>
            </div>
            <span className="text-xs text-pink-400 font-medium">자세히 보기 →</span>
          </div>
          <div className="flex items-center gap-4">
            <MiniDonut record={plannerRecord} />
            <div className="space-y-1.5">
              <div>
                <p className="text-xs text-slate-500">기록된 활동</p>
                <p className="font-bold text-slate-800">{plannerRecord?.activities.length ?? 0}개</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">총 기록 시간</p>
                <p className="font-bold text-slate-800">
                  {totalActivityMins > 0 ? formatDuration(totalActivityMins) : '없음'}
                </p>
              </div>
            </div>
          </div>
        </button>

        {/* 통합 AI 피드백 */}
        <div>
          {!unifiedFeedback ? (
            <button
              onClick={handleGetUnifiedFeedback}
              disabled={isLoadingFeedback}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-400 text-white rounded-2xl font-bold text-base shadow-lg shadow-violet-200 hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingFeedback ? (
                <>
                  <div className="spinner" />
                  <span>Claude가 오늘 하루를 종합 분석하고 있어요...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  ✨ 오늘 하루 종합 분석
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3">
                <Sparkles size={16} className="text-pink-400 flex-shrink-0" />
                <span className="text-sm text-violet-700 font-medium">종합 분석 완료</span>
              </div>
              <button
                onClick={handleGetUnifiedFeedback}
                disabled={isLoadingFeedback}
                className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-2xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-60"
              >
                다시
              </button>
            </div>
          )}

          {feedbackError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {feedbackError}
            </div>
          )}
        </div>

        {/* 피드백 내용 */}
        {unifiedFeedback && (
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 fade-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800">오늘 하루 종합 분석</h3>
            </div>
            <div
              className="feedback-text"
              dangerouslySetInnerHTML={{ __html: formatFeedback(unifiedFeedback) }}
            />
          </div>
        )}

        {/* 오늘의 총평 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3">오늘의 총평</h3>
          <textarea
            value={diaryText}
            onChange={e => setDiaryText(e.target.value)}
            placeholder="오늘 하루를 한 줄로..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors resize-none text-slate-700 leading-relaxed"
          />
          <button
            onClick={handleSaveDiary}
            className={`mt-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              diarySaved ? 'bg-emerald-500 text-white' : 'bg-pink-400 text-white hover:bg-pink-500'
            }`}
          >
            {diarySaved ? '✓ 저장됐어요!' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
