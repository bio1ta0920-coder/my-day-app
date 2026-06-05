'use client'

import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import type { BudgetSettings, HealthSettings, FavoriteFood, FavoriteExercise } from '@/lib/types'
import {
  getApiKey,
  saveApiKey,
  getBudgetSettings,
  saveBudgetSettings,
  getHealthSettings,
  saveHealthSettings,
  importBudgetData,
  importHealthData,
  importPlannerData,
} from '@/lib/storage'
import { pushAllToCloud, pullFromCloud } from '@/lib/sync'
import { isCloudConfigured } from '@/lib/supabase'
import { BUDGET_CATEGORIES, DEFAULT_BUDGETS, EXERCISE_CATEGORIES, INTENSITY_LABELS } from '@/lib/constants'

type ToastType = 'success' | 'error'

function Toast({ message, type }: { message: string; type: ToastType }) {
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold transition-all ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {message}
    </div>
  )
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null)
  const [healthSettings, setHealthSettings] = useState<HealthSettings | null>(null)

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const budgetFileRef = useRef<HTMLInputElement>(null)
  const healthFileRef = useRef<HTMLInputElement>(null)
  const plannerFileRef = useRef<HTMLInputElement>(null)

  const [importedBudget, setImportedBudget] = useState(false)
  const [importedHealth, setImportedHealth] = useState(false)
  const [importedPlanner, setImportedPlanner] = useState(false)

  // 클라우드 동기화
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [showSupabaseKey, setShowSupabaseKey] = useState(false)
  const [syncCode, setSyncCode] = useState('')
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')

  // Health favorites editing
  const [newFavoriteFood, setNewFavoriteFood] = useState({ name: '', calories: '', amount: '' })
  const [newFavoriteExercise, setNewFavoriteExercise] = useState({ name: '', category: '유산소', duration: '30', intensity: 'medium' as 'low' | 'medium' | 'high', calories: '' })

  useEffect(() => {
    setApiKey(getApiKey())
    setBudgetSettings(getBudgetSettings())
    setHealthSettings(getHealthSettings())
    setSupabaseUrl(localStorage.getItem('supabase_url') ?? '')
    setSupabaseKey(localStorage.getItem('supabase_anon_key') ?? '')
    setSyncCode(localStorage.getItem('sync_code') ?? '')
    setCloudConfigured(isCloudConfigured())
  }, [])

  function showToast(message: string, type: ToastType = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSaveApiKey() {
    saveApiKey(apiKey)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
    showToast('API 키가 저장되었습니다.')
  }

  function handleSaveBudget() {
    if (!budgetSettings) return
    saveBudgetSettings(budgetSettings)
    showToast('가계부 설정이 저장되었습니다.')
  }

  function handleSaveHealth() {
    if (!healthSettings) return
    saveHealthSettings(healthSettings)
    showToast('헬스 설정이 저장되었습니다.')
  }

  function handleSaveCloud() {
    localStorage.setItem('supabase_url', supabaseUrl.trim())
    localStorage.setItem('supabase_anon_key', supabaseKey.trim())
    localStorage.setItem('sync_code', syncCode.trim())
    setCloudConfigured(isCloudConfigured())
    showToast('클라우드 설정이 저장됐어요!')
  }

  async function handleSyncNow() {
    setSyncStatus('syncing')
    try {
      const count = await pushAllToCloud()
      if (count > 0) {
        setSyncStatus('done')
        showToast(`${count}개 항목을 클라우드에 저장했어요!`)
      } else {
        setSyncStatus('error')
        showToast('동기화 실패 — 설정을 확인해주세요', 'error')
      }
    } catch {
      setSyncStatus('error')
      showToast('동기화 중 오류가 발생했어요', 'error')
    }
    setTimeout(() => setSyncStatus('idle'), 3000)
  }

  async function handlePullNow() {
    setSyncStatus('syncing')
    const ok = await pullFromCloud()
    if (ok) {
      setSyncStatus('done')
      showToast('클라우드에서 데이터를 가져왔어요! 페이지를 새로고침합니다')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setSyncStatus('error')
      showToast('가져오기 실패 — 설정 또는 동기화 코드를 확인해주세요', 'error')
    }
    setTimeout(() => setSyncStatus('idle'), 3000)
  }

  function handleImportFile(
    file: File,
    importFn: (json: string) => void,
    setImported: (v: boolean) => void,
    label: string
  ) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const json = e.target?.result as string
        importFn(json)
        setImported(true)
        showToast(`${label} 데이터를 성공적으로 가져왔습니다!`)
      } catch {
        showToast(`${label} 파일 형식이 올바르지 않습니다.`, 'error')
      }
    }
    reader.readAsText(file)
  }

  function addFavoriteFood() {
    if (!healthSettings || !newFavoriteFood.name.trim()) return
    const food: FavoriteFood = {
      id: Date.now().toString(),
      name: newFavoriteFood.name.trim(),
      calories: Number(newFavoriteFood.calories) || 0,
      amount: newFavoriteFood.amount.trim(),
    }
    const updated = { ...healthSettings, favoriteFoods: [...healthSettings.favoriteFoods, food] }
    setHealthSettings(updated)
    saveHealthSettings(updated)
    setNewFavoriteFood({ name: '', calories: '', amount: '' })
    showToast('즐겨찾기 음식이 추가되었습니다.')
  }

  function removeFavoriteFood(id: string) {
    if (!healthSettings) return
    const updated = { ...healthSettings, favoriteFoods: healthSettings.favoriteFoods.filter(f => f.id !== id) }
    setHealthSettings(updated)
    saveHealthSettings(updated)
  }

  function addFavoriteExercise() {
    if (!healthSettings || !newFavoriteExercise.name.trim()) return
    const ex: FavoriteExercise = {
      id: Date.now().toString(),
      name: newFavoriteExercise.name.trim(),
      category: newFavoriteExercise.category,
      duration: Number(newFavoriteExercise.duration) || 30,
      intensity: newFavoriteExercise.intensity,
      calories: Number(newFavoriteExercise.calories) || 0,
    }
    const updated = { ...healthSettings, favoriteExercises: [...healthSettings.favoriteExercises, ex] }
    setHealthSettings(updated)
    saveHealthSettings(updated)
    setNewFavoriteExercise({ name: '', category: '유산소', duration: '30', intensity: 'medium', calories: '' })
    showToast('즐겨찾기 운동이 추가되었습니다.')
  }

  function removeFavoriteExercise(id: string) {
    if (!healthSettings) return
    const updated = { ...healthSettings, favoriteExercises: healthSettings.favoriteExercises.filter(e => e.id !== id) }
    setHealthSettings(updated)
    saveHealthSettings(updated)
  }

  if (!budgetSettings || !healthSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* 헤더 */}
      <div className="bg-gradient-to-br from-pink-400 via-pink-300 to-rose-400 text-white px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold mb-1">설정</h1>
        <p className="text-pink-200 text-sm">앱 설정 및 데이터 관리</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* ☁️ 클라우드 동기화 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                {cloudConfigured ? <Cloud size={16} className="text-pink-400" /> : <CloudOff size={16} className="text-slate-400" />}
                클라우드 동기화
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {cloudConfigured ? '✓ 연결됨 — 모든 기기에서 자동 동기화' : '설정하면 아이폰·PC 데이터가 자동으로 연동됩니다'}
              </p>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Supabase URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxx.supabase.co"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Supabase Anon Key</label>
              <div className="relative">
                <input
                  type={showSupabaseKey ? 'text' : 'password'}
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGci..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
                />
                <button onClick={() => setShowSupabaseKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showSupabaseKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">동기화 코드 (나만 아는 비밀번호)</label>
              <input
                type="text"
                value={syncCode}
                onChange={e => setSyncCode(e.target.value)}
                placeholder="예: myapp2024"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
              />
              <p className="text-xs text-slate-400 mt-1">모든 기기에서 같은 코드를 입력하면 데이터가 연동됩니다</p>
            </div>
            <button
              onClick={handleSaveCloud}
              className="w-full py-2.5 bg-pink-400 text-white rounded-xl font-semibold text-sm hover:bg-pink-500 transition-colors"
            >
              설정 저장
            </button>
            {cloudConfigured && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSyncNow}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                  {syncStatus === 'syncing' ? '동기화 중...' : '지금 업로드'}
                </button>
                <button
                  onClick={handlePullNow}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Cloud size={14} />
                  지금 다운로드
                </button>
              </div>
            )}
          </div>
        </section>

        {/* API 키 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">🔑 Claude AI API 키</h2>
            <p className="text-xs text-slate-500 mt-0.5">이 키는 가계부, 헬스, 일과표 AI 분석에 모두 사용됩니다</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white text-slate-700 transition-colors"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${apiKeySaved ? 'bg-emerald-500 text-white' : 'bg-pink-400 text-white hover:bg-pink-500'}`}
            >
              {apiKeySaved ? '✓ 저장됨' : '저장하기'}
            </button>
          </div>
        </section>

        {/* 가계부 설정 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">💰 가계부 설정</h2>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">월 순수입 (원)</label>
                <input
                  type="number"
                  value={budgetSettings.monthlyIncome}
                  onChange={e => setBudgetSettings({ ...budgetSettings, monthlyIncome: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">월 저축 목표 (원)</label>
                <input
                  type="number"
                  value={budgetSettings.monthlySavingsGoal}
                  onChange={e => setBudgetSettings({ ...budgetSettings, monthlySavingsGoal: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">카테고리별 월 예산</p>
              <div className="space-y-2">
                {BUDGET_CATEGORIES.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: cat.bg }}>
                      {cat.emoji}
                    </div>
                    <span className="text-sm text-slate-700 flex-1">{cat.label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={budgetSettings.categoryBudgets[cat.id] ?? 0}
                        onChange={e => setBudgetSettings({
                          ...budgetSettings,
                          categoryBudgets: {
                            ...budgetSettings.categoryBudgets,
                            [cat.id]: Number(e.target.value) || 0,
                          },
                        })}
                        className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-sm text-right bg-slate-50 focus:bg-white"
                      />
                      <span className="text-xs text-slate-400">원</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSaveBudget} className="w-full py-3 bg-pink-400 text-white rounded-xl font-semibold text-sm hover:bg-pink-500 transition-colors">
              저장하기
            </button>
          </div>
        </section>

        {/* 헬스 설정 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">🏃 헬스 설정</h2>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">목표 체중 (kg)</label>
                <input
                  type="number"
                  value={healthSettings.targetWeight || ''}
                  onChange={e => setHealthSettings({ ...healthSettings, targetWeight: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">목표 칼로리</label>
                <input
                  type="number"
                  value={healthSettings.targetCalories}
                  onChange={e => setHealthSettings({ ...healthSettings, targetCalories: Number(e.target.value) || 2000 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">주당 운동 (일)</label>
                <input
                  type="number"
                  value={healthSettings.targetExerciseDays}
                  onChange={e => setHealthSettings({ ...healthSettings, targetExerciseDays: Number(e.target.value) || 3 })}
                  min={0} max={7}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* 즐겨찾기 음식 */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">즐겨찾기 음식</p>
              {healthSettings.favoriteFoods.map(food => (
                <div key={food.id} className="flex items-center gap-2 py-1.5">
                  <span className="text-sm text-slate-700 flex-1">{food.name}</span>
                  <span className="text-xs text-slate-400">{food.calories}kcal {food.amount && `/ ${food.amount}`}</span>
                  <button onClick={() => removeFavoriteFood(food.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">삭제</button>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newFavoriteFood.name}
                  onChange={e => setNewFavoriteFood({ ...newFavoriteFood, name: e.target.value })}
                  placeholder="음식명"
                  className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                />
                <input
                  type="number"
                  value={newFavoriteFood.calories}
                  onChange={e => setNewFavoriteFood({ ...newFavoriteFood, calories: e.target.value })}
                  placeholder="kcal"
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                />
                <input
                  type="text"
                  value={newFavoriteFood.amount}
                  onChange={e => setNewFavoriteFood({ ...newFavoriteFood, amount: e.target.value })}
                  placeholder="양"
                  className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                />
                <button onClick={addFavoriteFood} className="px-3 py-1.5 bg-pink-400 text-white rounded-lg text-xs font-semibold hover:bg-pink-500 transition-colors">추가</button>
              </div>
            </div>

            {/* 즐겨찾기 운동 */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">즐겨찾기 운동</p>
              {healthSettings.favoriteExercises.map(ex => {
                const cat = EXERCISE_CATEGORIES.find(c => c.id === ex.category)
                const intensityInfo = INTENSITY_LABELS[ex.intensity]
                return (
                  <div key={ex.id} className="flex items-center gap-2 py-1.5">
                    <span className="text-base">{cat?.emoji ?? '🏅'}</span>
                    <span className="text-sm text-slate-700 flex-1">{ex.name}</span>
                    <span className="text-xs text-slate-400">{ex.duration}분 {intensityInfo.emoji}</span>
                    <button onClick={() => removeFavoriteExercise(ex.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">삭제</button>
                  </div>
                )
              })}
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFavoriteExercise.name}
                    onChange={e => setNewFavoriteExercise({ ...newFavoriteExercise, name: e.target.value })}
                    placeholder="운동명"
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                  />
                  <input
                    type="number"
                    value={newFavoriteExercise.duration}
                    onChange={e => setNewFavoriteExercise({ ...newFavoriteExercise, duration: e.target.value })}
                    placeholder="분"
                    className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newFavoriteExercise.category}
                    onChange={e => setNewFavoriteExercise({ ...newFavoriteExercise, category: e.target.value })}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                  >
                    {EXERCISE_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.id}</option>)}
                  </select>
                  <select
                    value={newFavoriteExercise.intensity}
                    onChange={e => setNewFavoriteExercise({ ...newFavoriteExercise, intensity: e.target.value as 'low' | 'medium' | 'high' })}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-pink-300 focus:outline-none text-xs bg-slate-50 focus:bg-white"
                  >
                    <option value="low">가볍게</option>
                    <option value="medium">보통</option>
                    <option value="high">격하게</option>
                  </select>
                  <button onClick={addFavoriteExercise} className="px-3 py-1.5 bg-pink-400 text-white rounded-lg text-xs font-semibold hover:bg-pink-500 transition-colors">추가</button>
                </div>
              </div>
            </div>

            <button onClick={handleSaveHealth} className="w-full py-3 bg-pink-400 text-white rounded-xl font-semibold text-sm hover:bg-pink-500 transition-colors">
              저장하기
            </button>
          </div>
        </section>

        {/* 데이터 이전 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800">📦 기존 앱에서 데이터 가져오기</h2>
            <p className="text-xs text-slate-500 mt-0.5">가계부앱(3001), 헬스앱(3002), 일과표앱(3003)의 데이터를 이전할 수 있습니다</p>
          </div>
          <div className="px-4 py-4 space-y-5">
            <div className="bg-pink-50 rounded-xl p-3 text-xs text-pink-500 leading-relaxed">
              <p className="font-semibold mb-1">💡 내보내기 방법 (기존 앱에서)</p>
              <p>기존 앱 설정 페이지에서 &quot;데이터 내보내기&quot; 버튼을 클릭하면 JSON 파일이 다운로드됩니다. 아래에 파일을 업로드해주세요.</p>
            </div>

            {/* 가계부 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">💰 가계부 데이터</span>
                {importedBudget && <span className="text-xs text-emerald-600 font-semibold">✓ 가져오기 완료</span>}
              </div>
              <input
                ref={budgetFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleImportFile(file, importBudgetData, setImportedBudget, '가계부')
                }}
              />
              <button
                onClick={() => budgetFileRef.current?.click()}
                className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${importedBudget ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-400'}`}
              >
                {importedBudget ? '✓ 완료 (다시 선택)' : '파일 선택...'}
              </button>
            </div>

            {/* 헬스 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">🏃 헬스 데이터</span>
                {importedHealth && <span className="text-xs text-emerald-600 font-semibold">✓ 가져오기 완료</span>}
              </div>
              <input
                ref={healthFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleImportFile(file, importHealthData, setImportedHealth, '헬스')
                }}
              />
              <button
                onClick={() => healthFileRef.current?.click()}
                className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${importedHealth ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-400'}`}
              >
                {importedHealth ? '✓ 완료 (다시 선택)' : '파일 선택...'}
              </button>
            </div>

            {/* 일과표 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">📅 일과표 데이터</span>
                {importedPlanner && <span className="text-xs text-emerald-600 font-semibold">✓ 가져오기 완료</span>}
              </div>
              <input
                ref={plannerFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleImportFile(file, importPlannerData, setImportedPlanner, '일과표')
                }}
              />
              <button
                onClick={() => plannerFileRef.current?.click()}
                className={`w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${importedPlanner ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-400'}`}
              >
                {importedPlanner ? '✓ 완료 (다시 선택)' : '파일 선택...'}
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 leading-relaxed space-y-1">
              <p className="font-semibold text-slate-600">콘솔로 내보내기 (기존 앱 DevTools에서 실행)</p>
              <pre className="bg-white rounded-lg p-2 text-[10px] overflow-x-auto border border-slate-200 text-slate-600 whitespace-pre-wrap">
{`const d={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);d[k]=localStorage.getItem(k)}
const b=new Blob([JSON.stringify(d)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='backup.json';a.click()`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
