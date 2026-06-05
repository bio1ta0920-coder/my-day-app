'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Sparkles, RefreshCw, BookOpen, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { BudgetDayRecord, Expense } from '@/lib/types'
import {
  getBudgetRecord,
  saveBudgetRecord,
  getBudgetSettings,
  getApiKey,
  getTodayString,
  formatDate,
  getEffectiveBudgetSettings,
  getAllBudgetRecords,
  addDays,
} from '@/lib/storage'
import { BUDGET_EMOTIONS } from '@/lib/constants'
import ExpenseModal from '@/components/budget/ExpenseModal'
import ExpenseCard from '@/components/budget/ExpenseCard'

const SATISFACTION_OPTIONS = [
  { emoji: '😊', label: '매우만족', value: '매우만족' },
  { emoji: '🙂', label: '만족', value: '만족' },
  { emoji: '😐', label: '보통', value: '보통' },
  { emoji: '😞', label: '아쉬움', value: '아쉬움' },
  { emoji: '😤', label: '후회됨', value: '후회됨' },
]

function emptyRecord(date: string): BudgetDayRecord {
  return { date, expenses: [], feedback: null, diary: null, satisfaction: null, emotion: null }
}

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

export default function BudgetPage() {
  const [today, setToday] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [record, setRecord] = useState<BudgetDayRecord | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [showDiary, setShowDiary] = useState(false)
  const [diaryText, setDiaryText] = useState('')
  const [satisfaction, setSatisfaction] = useState('')
  const [emotion, setEmotion] = useState('')
  const [diarySaved, setDiarySaved] = useState(false)
  const [monthBudget, setMonthBudget] = useState(0)
  const [monthSpent, setMonthSpent] = useState(0)

  const loadDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr)
    const existing = getBudgetRecord(dateStr) ?? emptyRecord(dateStr)
    setRecord(existing)
    setDiaryText(existing.diary ?? '')
    setSatisfaction(existing.satisfaction ?? '')
    setEmotion(existing.emotion ?? '')
    setShowDiary(!!(existing.feedback || existing.diary))
    setFeedbackError('')

    const [y, m] = dateStr.split('-')
    const monthKey = `${y}-${m}`
    const effective = getEffectiveBudgetSettings(monthKey)
    const totalBudget = Object.values(effective.categoryBudgets).reduce((a, b) => a + b, 0)
    setMonthBudget(totalBudget)

    const allRecords = getAllBudgetRecords()
    const monthSpentTotal = Object.entries(allRecords)
      .filter(([date]) => date.startsWith(monthKey))
      .reduce((sum, [, rec]) => sum + rec.expenses.reduce((s, e) => s + e.amount, 0), 0)
    setMonthSpent(monthSpentTotal)
  }, [])

  useEffect(() => {
    const dateStr = getTodayString()
    setToday(dateStr)
    loadDate(dateStr)
  }, [loadDate])

  const updateRecord = useCallback((updater: (prev: BudgetDayRecord) => BudgetDayRecord) => {
    setRecord(prev => {
      if (!prev) return prev
      const updated = updater(prev)
      saveBudgetRecord(updated)
      return updated
    })
  }, [])

  const handleSaveExpense = (expense: Expense) => {
    updateRecord(prev => {
      const isEdit = prev.expenses.some(e => e.id === expense.id)
      const expenses = isEdit
        ? prev.expenses.map(e => (e.id === expense.id ? expense : e))
        : [...prev.expenses, expense]
      return { ...prev, expenses }
    })
    setShowAddModal(false)
    setEditingExpense(null)
  }

  const handleDeleteExpense = (id: string) => {
    if (!confirm('이 지출 항목을 삭제할까요?')) return
    updateRecord(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }))
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setShowAddModal(true)
  }

  const handleGetFeedback = async () => {
    if (!record || record.expenses.length === 0) { alert('지출 내역을 먼저 입력해주세요.'); return }
    setIsLoadingFeedback(true)
    setFeedbackError('')
    try {
      const settings = getBudgetSettings()
      const apiKey = getApiKey()
      const res = await fetch('/api/feedback/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: record.expenses, date: selectedDate, settings, apiKey }),
      })
      const data = await res.json() as { feedback?: string; error?: string }
      if (!res.ok) { setFeedbackError(data.error ?? '피드백 생성에 실패했습니다.'); return }
      updateRecord(prev => ({ ...prev, feedback: data.feedback ?? null }))
      setShowDiary(true)
    } catch {
      setFeedbackError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoadingFeedback(false)
    }
  }

  const handleSaveDiary = () => {
    updateRecord(prev => ({ ...prev, diary: diaryText, satisfaction, emotion }))
    setDiarySaved(true)
    setTimeout(() => setDiarySaved(false), 2000)
  }

  const isToday = selectedDate === today

  if (!record) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
      </div>
    )
  }

  const totalSpent = record.expenses.reduce((sum, e) => sum + e.amount, 0)
  const [y, m] = selectedDate.split('-')
  const monthKey = `${y}-${m}`
  const effective = getEffectiveBudgetSettings(monthKey)
  const dailyBudget = Math.floor(
    (effective.income - effective.savingsGoal) /
    new Date(parseInt(y), parseInt(m), 0).getDate()
  )
  const remaining = dailyBudget - totalSpent
  const spentPct = dailyBudget > 0 ? Math.min((totalSpent / dailyBudget) * 100, 100) : 0
  const barColor = spentPct > 90 ? '#ef4444' : spentPct > 70 ? '#f97316' : '#22c55e'

  return (
    <div className="pb-24">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-pink-400 via-pink-300 to-rose-400 text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => loadDate(addDays(selectedDate, -1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setTimeout(() => dateInputRef.current?.showPicker?.(), 50) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all"
          >
            <Calendar size={14} />
            <span className="text-sm font-semibold">{formatDate(selectedDate)}</span>
            {isToday && <span className="text-xs bg-white/25 px-1.5 py-0.5 rounded-full">오늘</span>}
          </button>
          <button onClick={() => loadDate(addDays(selectedDate, 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all">
            <ChevronRight size={18} />
          </button>
        </div>
        <input ref={dateInputRef} type="date" value={selectedDate} onChange={e => { if (e.target.value) loadDate(e.target.value) }} className="sr-only" />

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-pink-200 text-xs mb-0.5">{isToday ? '오늘 지출' : '지출'}</p>
            <p className="text-3xl font-bold tracking-tight">{totalSpent.toLocaleString('ko-KR')}원</p>
          </div>
          <div className="text-right">
            <p className="text-pink-200 text-xs mb-0.5">{remaining >= 0 ? '남은 예산' : '초과'}</p>
            <p className={`text-xl font-semibold ${remaining < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
              {Math.abs(remaining).toLocaleString('ko-KR')}원
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-pink-200 mb-1.5">
            <span>일일 예산 {dailyBudget.toLocaleString('ko-KR')}원</span>
            <span>{Math.round(spentPct)}% 사용</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${spentPct}%`, backgroundColor: barColor }} />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/20 flex gap-4">
          <div>
            <p className="text-pink-200 text-xs">이번달 지출</p>
            <p className="text-white font-semibold text-sm">{monthSpent.toLocaleString('ko-KR')}원</p>
          </div>
          <div>
            <p className="text-pink-200 text-xs">월 예산</p>
            <p className="text-white font-semibold text-sm">{monthBudget.toLocaleString('ko-KR')}원</p>
          </div>
          <div>
            <p className="text-pink-200 text-xs">저축 목표</p>
            <p className="text-white font-semibold text-sm">{effective.savingsGoal.toLocaleString('ko-KR')}원</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {/* 지출 내역 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800">
              {isToday ? '오늘 지출 내역' : '지출 내역'}
              {record.expenses.length > 0 && (
                <span className="ml-2 text-sm font-medium text-pink-400">{record.expenses.length}건</span>
              )}
            </h2>
            <button
              onClick={() => { setEditingExpense(null); setShowAddModal(true) }}
              className="flex items-center gap-1.5 bg-pink-400 text-white px-3 py-1.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-pink-500 active:scale-95 transition-all"
            >
              <Plus size={14} />
              추가
            </button>
          </div>

          {record.expenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 flex flex-col items-center gap-2">
              <span className="text-4xl">💸</span>
              <p className="text-slate-500 text-sm font-medium">오늘 지출이 없어요</p>
              <p className="text-slate-400 text-xs">상단 추가 버튼으로 지출을 입력해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {record.expenses.map(expense => (
                <ExpenseCard key={expense.id} expense={expense} onEdit={handleEditExpense} onDelete={handleDeleteExpense} />
              ))}
            </div>
          )}
        </div>

        {/* AI 피드백 버튼 */}
        <div>
          {!record.feedback ? (
            <button
              onClick={handleGetFeedback}
              disabled={isLoadingFeedback || record.expenses.length === 0}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-400 text-white rounded-2xl font-bold text-base shadow-lg shadow-pink-200 hover:shadow-xl active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingFeedback ? (
                <>
                  <div className="spinner" />
                  Claude가 분석하고 있어요...
                </>
              ) : (
                <><Sparkles size={18} /> AI 피드백 받기</>
              )}
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-2xl px-4 py-3">
                <Sparkles size={16} className="text-pink-400 flex-shrink-0" />
                <span className="text-sm text-pink-500 font-medium">AI 피드백 완료</span>
              </div>
              <button
                onClick={handleGetFeedback}
                disabled={isLoadingFeedback}
                className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-2xl text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-60"
              >
                {isLoadingFeedback ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <RefreshCw size={14} />}
                다시 받기
              </button>
            </div>
          )}
          {feedbackError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{feedbackError}</div>
          )}
        </div>

        {/* AI 피드백 내용 */}
        {record.feedback && (
          <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 fade-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-pink-400 rounded-lg flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800">AI 피드백</h3>
            </div>
            <div className="feedback-text" dangerouslySetInnerHTML={{ __html: formatFeedback(record.feedback) }} />
          </div>
        )}

        {/* 일기 섹션 */}
        {(record.feedback || record.diary) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 fade-in">
            <button onClick={() => setShowDiary(!showDiary)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center">
                  <BookOpen size={14} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-800">오늘의 소비 일기</h3>
              </div>
              {showDiary ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            {showDiary && (
              <div className="mt-4 space-y-4 fade-in">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">오늘 소비 만족도</p>
                  <div className="flex gap-2">
                    {SATISFACTION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSatisfaction(opt.value)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${
                          satisfaction === opt.value ? 'border-pink-300 bg-pink-50 scale-105' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-xs text-slate-500 font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">오늘의 감정</label>
                  <select
                    value={emotion}
                    onChange={e => setEmotion(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white text-slate-700"
                  >
                    <option value="">감정을 선택하세요</option>
                    {BUDGET_EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">오늘을 돌아보며</label>
                  <textarea
                    value={diaryText}
                    onChange={e => setDiaryText(e.target.value)}
                    placeholder="오늘의 소비를 돌아보며... 잘한 것, 아쉬운 것, 내일의 다짐 등을 자유롭게 적어보세요."
                    rows={4}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors resize-none text-slate-700 leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleSaveDiary}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${diarySaved ? 'bg-emerald-500 text-white' : 'bg-pink-400 text-white hover:bg-pink-500'}`}
                >
                  {diarySaved ? '✓ 저장됐어요!' : '저장하기'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 피드백 없을 때 일기 쓰기 */}
        {!record.feedback && !record.diary && record.expenses.length > 0 && (
          <button
            onClick={() => { setShowDiary(true); updateRecord(prev => ({ ...prev, diary: prev.diary ?? '' })) }}
            className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen size={16} />
            소비 일기 쓰기
          </button>
        )}

        {!record.feedback && showDiary && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 fade-in">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-400 rounded-lg flex items-center justify-center">
                <BookOpen size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-slate-800">오늘의 소비 일기</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">오늘 소비 만족도</p>
                <div className="flex gap-2">
                  {SATISFACTION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSatisfaction(opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${satisfaction === opt.value ? 'border-pink-300 bg-pink-50 scale-105' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-xs text-slate-500 font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">오늘의 감정</label>
                <select value={emotion} onChange={e => setEmotion(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white text-slate-700">
                  <option value="">감정을 선택하세요</option>
                  {BUDGET_EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">오늘을 돌아보며</label>
                <textarea
                  value={diaryText}
                  onChange={e => setDiaryText(e.target.value)}
                  placeholder="오늘의 소비를 돌아보며..."
                  rows={4}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors resize-none text-slate-700 leading-relaxed"
                />
              </div>
              <button
                onClick={handleSaveDiary}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${diarySaved ? 'bg-emerald-500 text-white' : 'bg-pink-400 text-white hover:bg-pink-500'}`}
              >
                {diarySaved ? '✓ 저장됐어요!' : '저장하기'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <ExpenseModal
          expense={editingExpense}
          onSave={handleSaveExpense}
          onClose={() => { setShowAddModal(false); setEditingExpense(null) }}
        />
      )}
    </div>
  )
}
