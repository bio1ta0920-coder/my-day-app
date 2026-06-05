'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { FoodItem, FavoriteFood, MealTime } from '@/lib/types'
import { MEAL_TIME_LABELS } from '@/lib/constants'
import { getApiKey } from '@/lib/storage'

interface Props {
  onClose: () => void
  onSave: (food: FoodItem, mealTime: MealTime, startTime?: string, endTime?: string) => void
  initialData?: { food: FoodItem; mealTime: MealTime; time?: string; endTime?: string } | null
  defaultMealTime?: MealTime
  favorites: FavoriteFood[]
}

const MEAL_TIMES: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function FoodModal({ onClose, onSave, initialData, defaultMealTime = 'breakfast', favorites }: Props) {
  const [mealTime, setMealTime] = useState<MealTime>(defaultMealTime)
  const [mealStartTime, setMealStartTime] = useState('')
  const [mealEndTime, setMealEndTime] = useState('')
  const [name, setName] = useState('')
  const [calories, setCalories] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [caloriesLoading, setCaloriesLoading] = useState(false)
  const [caloriesError, setCaloriesError] = useState('')

  useEffect(() => {
    if (initialData) {
      setMealTime(initialData.mealTime)
      setMealStartTime(initialData.time ?? '')
      setMealEndTime(initialData.endTime ?? '')
      setName(initialData.food.name)
      setCalories(initialData.food.calories)
      setAmount(initialData.food.amount)
      setNotes(initialData.food.notes)
    }
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [initialData])

  async function estimateCalories() {
    if (!name.trim()) return
    setCaloriesLoading(true)
    setCaloriesError('')
    try {
      const apiKey = getApiKey()
      const res = await fetch('/api/calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), amount: amount.trim(), apiKey }),
      })
      const data = await res.json() as { calories?: number; error?: string }
      if (!res.ok || data.error) {
        setCaloriesError(data.error ?? '칼로리를 가져오지 못했습니다.')
      } else {
        setCalories(data.calories ?? 0)
      }
    } catch {
      setCaloriesError('네트워크 오류가 발생했습니다.')
    } finally {
      setCaloriesLoading(false)
    }
  }

  function applyFavorite(fav: FavoriteFood) {
    setName(fav.name)
    setCalories(fav.calories)
    setAmount(fav.amount)
  }

  function handleSave() {
    if (!name.trim()) return
    const food: FoodItem = {
      id: initialData?.food.id ?? Date.now().toString(),
      name: name.trim(),
      calories: typeof calories === 'number' ? calories : 0,
      amount: amount.trim(),
      notes: notes.trim(),
    }
    onSave(food, mealTime, mealStartTime || undefined, mealEndTime || undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">{initialData ? '음식 수정' : '음식 추가'}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">식사 구분</label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TIMES.map(mt => {
                const info = MEAL_TIME_LABELS[mt]
                const isSelected = mealTime === mt
                return (
                  <button
                    key={mt}
                    onClick={() => setMealTime(mt)}
                    style={isSelected ? { borderColor: info.color, backgroundColor: info.bg, color: info.color } : {}}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${isSelected ? '' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    <span className="text-lg">{info.emoji}</span>
                    <span>{info.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              식사 시간 <span className="text-slate-400 font-normal">(선택 — 입력 시 일과표 자동 반영)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={mealStartTime}
                step={300}
                onChange={e => setMealStartTime(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
              <span className="text-slate-400 text-sm font-medium">~</span>
              <input
                type="time"
                value={mealEndTime}
                step={300}
                onChange={e => setMealEndTime(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </div>

          {favorites.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">즐겨찾기</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {favorites.map(fav => (
                  <button
                    key={fav.id}
                    onClick={() => applyFavorite(fav)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                  >
                    <span>🍽️</span>
                    <span>{fav.name}</span>
                    <span className="text-slate-400 text-xs">{fav.calories}kcal</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">음식명 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 현미밥, 닭가슴살, 사과"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">칼로리</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                min={0}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
              <span className="text-sm text-slate-500 font-medium">kcal</span>
              <button
                type="button"
                onClick={estimateCalories}
                disabled={!name.trim() || caloriesLoading}
                className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-pink-50 text-pink-400 text-xs font-semibold hover:bg-pink-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {caloriesLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-pink-200 border-t-pink-400 rounded-full animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                자동
              </button>
            </div>
            {caloriesError && <p className="text-xs text-red-500 mt-1">{caloriesError}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">양/용량</label>
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="예: 1공기, 200g, 1개"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">메모 <span className="text-slate-400 font-normal">(선택)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="특이사항, 조리방법 등"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-slate-100 bg-white">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full py-3.5 rounded-xl bg-pink-400 text-white font-bold text-base hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          저장하기
        </button>
      </div>
    </div>
  )
}
