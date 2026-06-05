'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ExerciseItem, FavoriteExercise } from '@/lib/types'
import { EXERCISE_CATEGORIES, INTENSITY_LABELS } from '@/lib/constants'

interface Props {
  onClose: () => void
  onSave: (exercise: ExerciseItem) => void
  initialData?: ExerciseItem | null
  favorites: FavoriteExercise[]
}

const QUICK_DURATIONS = [10, 20, 30, 45, 60, 90]

export default function ExerciseModal({ onClose, onSave, initialData, favorites }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('유산소')
  const [duration, setDuration] = useState(30)
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium')
  const [calories, setCalories] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState('')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setCategory(initialData.category)
      setDuration(initialData.duration)
      setIntensity(initialData.intensity)
      setCalories(initialData.calories > 0 ? initialData.calories : '')
      setNotes(initialData.notes)
      setStartTime(initialData.startTime ?? '')
    }
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [initialData])

  function applyFavorite(fav: FavoriteExercise) {
    setName(fav.name)
    setCategory(fav.category)
    setDuration(fav.duration)
    setIntensity(fav.intensity)
    setCalories(fav.calories > 0 ? fav.calories : '')
  }

  function handleSave() {
    if (!name.trim()) return
    const item: ExerciseItem = {
      id: initialData?.id ?? Date.now().toString(),
      name: name.trim(),
      category,
      duration,
      intensity,
      calories: typeof calories === 'number' ? calories : 0,
      notes: notes.trim(),
      startTime: startTime || undefined,
    }
    onSave(item)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">{initialData ? '운동 수정' : '운동 추가'}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-5">
          {favorites.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">즐겨찾기</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {favorites.map(fav => {
                  const cat = EXERCISE_CATEGORIES.find(c => c.id === fav.category)
                  return (
                    <button
                      key={fav.id}
                      onClick={() => applyFavorite(fav)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-pink-200 hover:bg-pink-50 transition-colors"
                    >
                      <span>{cat?.emoji ?? '🏅'}</span>
                      <span>{fav.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">운동 이름 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 런닝, 헬스, 수영"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">카테고리</label>
            <div className="grid grid-cols-5 gap-2">
              {EXERCISE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${category === cat.id ? 'border-pink-300 bg-pink-50 text-pink-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span>{cat.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              시작 시간 <span className="text-slate-400 font-normal">(선택 — 입력 시 일과표 자동 반영)</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">운동 시간 (분)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {QUICK_DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${duration === d ? 'bg-pink-400 text-white border-pink-400' : 'bg-white text-slate-600 border-slate-200 hover:border-pink-200'}`}
                >
                  {d}분
                </button>
              ))}
            </div>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              min={1}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">강도</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map(key => {
                const info = INTENSITY_LABELS[key]
                return (
                  <button
                    key={key}
                    onClick={() => setIntensity(key)}
                    className={`py-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all ${intensity === key ? 'border-pink-300 bg-pink-50 text-pink-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    <span className="text-xl">{info.emoji}</span>
                    <span>{info.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">칼로리 소모 <span className="text-slate-400 font-normal">(선택)</span></label>
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
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">메모 <span className="text-slate-400 font-normal">(선택)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="오늘 운동 느낌, 특이사항 등"
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
