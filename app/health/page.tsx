'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { HealthDayRecord, ExerciseItem, FoodItem, MealRecord, MealTime } from '@/lib/types'
import {
  getHealthRecord,
  saveHealthRecord,
  getHealthSettings,
  getTodayString,
  formatDate,
  addDays,
  getApiKey,
  syncHealthMealsToPlanner,
  syncHealthExercisesToPlanner,
} from '@/lib/storage'
import { MEAL_TIME_LABELS, EXERCISE_CATEGORIES, INTENSITY_LABELS, HEALTH_EMOTIONS } from '@/lib/constants'
import ExerciseModal from '@/components/health/ExerciseModal'
import FoodModal from '@/components/health/FoodModal'

const MEAL_ORDER: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack']

function emptyRecord(date: string): HealthDayRecord {
  return {
    date,
    weight: null,
    meals: MEAL_ORDER.map(mt => ({ mealTime: mt, foods: [] })),
    exercises: [],
    feedback: null,
    emotion: null,
    emotionIntensity: null,
    diaryText: null,
    tomorrowGoal: null,
  }
}

function ensureAllMeals(record: HealthDayRecord): HealthDayRecord {
  const mealMap: Record<string, MealRecord> = {}
  for (const m of record.meals) mealMap[m.mealTime] = m
  const meals = MEAL_ORDER.map(mt => mealMap[mt] ?? { mealTime: mt, foods: [] })
  return { ...record, meals }
}

export default function HealthPage() {
  const [currentDate, setCurrentDate] = useState('')
  const [record, setRecord] = useState<HealthDayRecord | null>(null)
  const [healthSettings, setHealthSettings] = useState(getHealthSettings())
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(null)
  const [editingFood, setEditingFood] = useState<{ food: FoodItem; mealTime: MealTime; time?: string; endTime?: string } | null>(null)
  const [defaultFoodMealTime, setDefaultFoodMealTime] = useState<MealTime>('breakfast')
  const [collapsedMeals, setCollapsedMeals] = useState<Record<string, boolean>>({})
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [diarySaved, setDiarySaved] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [editingWeight, setEditingWeight] = useState(false)

  const todayStr = getTodayString()

  const loadData = useCallback((date: string) => {
    setHealthSettings(getHealthSettings())
    const r = getHealthRecord(date) ?? emptyRecord(date)
    const normalized = ensureAllMeals(r)
    setRecord(normalized)
    setWeightInput(normalized.weight != null ? String(normalized.weight) : '')
  }, [])

  useEffect(() => {
    const today = getTodayString()
    setCurrentDate(today)
    loadData(today)
  }, [loadData])

  function changeDate(delta: number) {
    const newDate = addDays(currentDate, delta)
    setCurrentDate(newDate)
    setFeedbackError('')
    setDiarySaved(false)
    loadData(newDate)
  }

  function updateRecord(updated: HealthDayRecord) {
    setRecord(updated)
    saveHealthRecord(updated)
    syncHealthMealsToPlanner(updated.date, updated.meals)
    syncHealthExercisesToPlanner(updated.date, updated.exercises)
  }

  function saveWeight() {
    if (!record) return
    const w = parseFloat(weightInput)
    updateRecord({ ...record, weight: isNaN(w) ? null : w })
    setEditingWeight(false)
  }

  function saveExercise(exercise: ExerciseItem) {
    if (!record) return
    let exercises: ExerciseItem[]
    if (editingExercise) {
      exercises = record.exercises.map(e => (e.id === exercise.id ? exercise : e))
    } else {
      exercises = [...record.exercises, exercise]
    }
    updateRecord({ ...record, exercises })
    setEditingExercise(null)
  }

  function deleteExercise(id: string) {
    if (!record) return
    updateRecord({ ...record, exercises: record.exercises.filter(e => e.id !== id) })
  }

  function saveFood(food: FoodItem, mealTime: MealTime, startTime?: string, endTime?: string) {
    if (!record) return
    const meals = record.meals.map(m => {
      if (m.mealTime !== mealTime) return m
      const updatedTime = startTime !== undefined ? startTime : m.time
      const updatedEndTime = endTime !== undefined ? endTime : m.endTime
      if (editingFood && editingFood.mealTime === mealTime) {
        return { ...m, time: updatedTime, endTime: updatedEndTime, foods: m.foods.map(f => (f.id === food.id ? food : f)) }
      }
      return { ...m, time: updatedTime, endTime: updatedEndTime, foods: [...m.foods, food] }
    })
    updateRecord({ ...record, meals })
    setEditingFood(null)
  }

  function deleteFood(mealTime: MealTime, foodId: string) {
    if (!record) return
    const meals = record.meals.map(m => {
      if (m.mealTime !== mealTime) return m
      return { ...m, foods: m.foods.filter(f => f.id !== foodId) }
    })
    updateRecord({ ...record, meals })
  }

  async function getFeedback() {
    if (!record) return
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const apiKey = getApiKey()
      const res = await fetch('/api/feedback/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDate,
          meals: record.meals,
          exercises: record.exercises,
          weight: record.weight,
          settings: healthSettings,
          apiKey,
        }),
      })
      const data = await res.json() as { feedback?: string; error?: string }
      if (!res.ok || data.error) {
        setFeedbackError(data.error ?? '피드백을 불러오는데 실패했습니다.')
      } else {
        updateRecord({ ...record, feedback: data.feedback ?? '' })
      }
    } catch {
      setFeedbackError('네트워크 오류가 발생했습니다.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  function saveDiary() {
    if (!record) return
    saveHealthRecord(record)
    setDiarySaved(true)
    setTimeout(() => setDiarySaved(false), 2000)
  }

  const totalCalEaten = record ? record.meals.reduce((s, m) => s + m.foods.reduce((ss, f) => ss + f.calories, 0), 0) : 0
  const totalCalBurned = record ? record.exercises.reduce((s, e) => s + e.calories, 0) : 0
  const targetCal = healthSettings.targetCalories
  const isToday = currentDate === todayStr
  const showDiary = record != null && (record.feedback != null || record.diaryText != null || record.emotion != null)

  if (!record) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-pink-400 via-pink-300 to-rose-400 text-white pt-12 pb-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-pink-100">{currentDate ? formatDate(currentDate) : ''}</p>
            {isToday && <span className="mt-0.5 px-2.5 py-0.5 rounded-full bg-white/25 text-xs font-bold tracking-wide">오늘</span>}
          </div>
          <button onClick={() => changeDate(1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex-shrink-0">
            {editingWeight ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  onBlur={saveWeight}
                  onKeyDown={e => e.key === 'Enter' && saveWeight()}
                  className="w-20 px-2 py-1 rounded-lg bg-white/20 text-white text-sm text-center placeholder-white/60 focus:outline-none focus:bg-white/30"
                  placeholder="체중"
                />
                <span className="text-white/80 text-xs">kg</span>
              </div>
            ) : (
              <button onClick={() => setEditingWeight(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                <span className="text-sm font-semibold">{record.weight != null ? `${record.weight}kg` : '체중 입력'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 bg-white/15 rounded-xl px-3 py-2">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>섭취 {totalCalEaten.toLocaleString()}kcal</span>
              <span>목표 {targetCal.toLocaleString()}kcal</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totalCalEaten > targetCal ? 'bg-red-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, (totalCalEaten / targetCal) * 100)}%` }}
              />
            </div>
            {totalCalBurned > 0 && <p className="text-xs text-white/70 mt-1">🔥 소모 {totalCalBurned.toLocaleString()}kcal</p>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* 운동 섹션 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800 text-base">오늘의 운동 💪</h2>
            <button
              onClick={() => { setEditingExercise(null); setShowExerciseModal(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-50 text-pink-400 text-sm font-semibold hover:bg-pink-100 transition-colors"
            >
              <Plus size={15} />
              추가
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {record.exercises.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">아직 운동 기록이 없어요</div>
            ) : (
              record.exercises.map(ex => {
                const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category)
                const intensityInfo = INTENSITY_LABELS[ex.intensity]
                return (
                  <div key={ex.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: cat?.bg ?? '#f5f3ff' }}>
                      {cat?.emoji ?? '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{ex.name}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${intensityInfo.color}15`, color: intensityInfo.color }}>
                          {intensityInfo.emoji} {intensityInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{ex.duration}분</span>
                        {ex.calories > 0 && <span>🔥 {ex.calories}kcal</span>}
                        {ex.notes && <span className="truncate">{ex.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingExercise(ex); setShowExerciseModal(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => deleteExercise(ex.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* 식단 섹션 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800 text-base">오늘의 식단 🍽️</h2>
            <button
              onClick={() => { setEditingFood(null); setShowFoodModal(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-50 text-pink-400 text-sm font-semibold hover:bg-pink-100 transition-colors"
            >
              <Plus size={15} />
              추가
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {record.meals.map(meal => {
              const info = MEAL_TIME_LABELS[meal.mealTime]
              const mealCal = meal.foods.reduce((s, f) => s + f.calories, 0)
              const isCollapsed = collapsedMeals[meal.mealTime]
              return (
                <div key={meal.mealTime}>
                  <button
                    onClick={() => setCollapsedMeals(prev => ({ ...prev, [meal.mealTime]: !prev[meal.mealTime] }))}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{info.emoji}</span>
                      <span className="font-semibold text-slate-700 text-sm">{info.label}</span>
                      {meal.time && (
                        <span className="text-xs text-slate-400">
                          {meal.time}{meal.endTime ? ` ~ ${meal.endTime}` : ''}
                        </span>
                      )}
                      {meal.foods.length > 0 && <span className="text-xs text-slate-500">{mealCal.toLocaleString()}kcal</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); setDefaultFoodMealTime(meal.mealTime); setEditingFood(null); setShowFoodModal(true) }}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-pink-100 hover:text-pink-400 transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                      {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div className="px-4 pb-2">
                      {meal.foods.length === 0 ? (
                        <p className="text-sm text-slate-300 py-1 px-1">기록 없음</p>
                      ) : (
                        <div className="space-y-1">
                          {meal.foods.map(food => (
                            <div key={food.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700">{food.name}</span>
                                  {food.amount && <span className="text-xs text-slate-400">{food.amount}</span>}
                                </div>
                                {food.calories > 0 && <p className="text-xs text-slate-400">{food.calories.toLocaleString()}kcal</p>}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setDefaultFoodMealTime(meal.mealTime); setEditingFood({ food, mealTime: meal.mealTime, time: meal.time, endTime: meal.endTime }); setShowFoodModal(true) }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => deleteFood(meal.mealTime, food.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* AI 피드백 */}
        <section>
          <button
            onClick={getFeedback}
            disabled={feedbackLoading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {feedbackLoading ? (
              <><div className="spinner" /><span>Claude가 분석하고 있어요...</span></>
            ) : (
              <><Sparkles size={18} /><span>✨ AI 피드백 받기</span></>
            )}
          </button>

          {feedbackError && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm text-red-600">{feedbackError}</p>
            </div>
          )}

          {record.feedback && (
            <div className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden fade-in">
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}>
                <Sparkles size={16} className="text-pink-400" />
                <p className="font-bold text-pink-500 text-sm">Claude AI 피드백</p>
              </div>
              <div
                className="px-4 py-4 text-sm text-slate-700 feedback-text leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: record.feedback
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/^([•\-].+)$/gm, '<li>$1</li>')
                    .replace(/\n\n/g, '<br/><br/>')
                    .replace(/\n/g, '<br/>'),
                }}
              />
            </div>
          )}
        </section>

        {/* 감정 일기 */}
        {showDiary && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden fade-in">
            <div className="px-4 py-3.5 border-b border-slate-50">
              <h2 className="font-bold text-slate-800 text-base">오늘의 감정 일기 📝</h2>
            </div>
            <div className="px-4 py-4 space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">오늘 기분은 어땠나요?</p>
                <div className="grid grid-cols-4 gap-2">
                  {HEALTH_EMOTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRecord({ ...record, emotion: record.emotion === opt.value ? null : opt.value })}
                      style={record.emotion === opt.value ? { borderColor: opt.color, backgroundColor: `${opt.color}15`, color: opt.color } : {}}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${record.emotion === opt.value ? '' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span>{opt.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">감정 강도</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">약함</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRecord({ ...record, emotionIntensity: record.emotionIntensity === n ? null : n })}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${(record.emotionIntensity ?? 0) >= n ? 'border-pink-400 bg-pink-400 text-white' : 'border-slate-200 bg-white text-slate-400 hover:border-pink-200'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">강함</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">오늘의 다이어트 일기</p>
                <textarea
                  value={record.diaryText ?? ''}
                  onChange={e => setRecord({ ...record, diaryText: e.target.value })}
                  placeholder="오늘 식단과 운동을 돌아보며..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 resize-none"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">내일의 목표 🎯</p>
                <input
                  type="text"
                  value={record.tomorrowGoal ?? ''}
                  onChange={e => setRecord({ ...record, tomorrowGoal: e.target.value })}
                  placeholder="내일은 무엇을 실천할 건가요?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <button
                onClick={saveDiary}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${diarySaved ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                {diarySaved ? '✓ 저장되었어요!' : '저장하기'}
              </button>
            </div>
          </section>
        )}

        <div className="h-4" />
      </div>

      {showExerciseModal && (
        <ExerciseModal
          onClose={() => { setShowExerciseModal(false); setEditingExercise(null) }}
          onSave={saveExercise}
          initialData={editingExercise}
          favorites={healthSettings.favoriteExercises}
        />
      )}
      {showFoodModal && (
        <FoodModal
          onClose={() => { setShowFoodModal(false); setEditingFood(null) }}
          onSave={saveFood}
          initialData={editingFood}
          defaultMealTime={defaultFoodMealTime}
          favorites={healthSettings.favoriteFoods}
        />
      )}
    </div>
  )
}
