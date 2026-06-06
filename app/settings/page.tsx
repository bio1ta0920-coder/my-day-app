'use client'

import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import type { BudgetSettings, HealthSettings, FavoriteFood, FavoriteExercise, LoanItem, LoanType, LoanRepaymentType } from '@/lib/types'
import {
  calcLoan, formatMonths, monthsLater,
  calcGraduatedInitialPayment, calcGraduatedCurrentPayment,
  calcGraduatedRemainingBalance, calcRemainingMonths, calcGraduatedSchedule,
} from '@/lib/loanCalc'
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

  const emptyLoan = (): LoanItem => ({
    id: Date.now().toString(),
    name: '',
    type: '신용대출',
    repaymentType: '원리금균등',
    graceMonths: 0,
    repaymentDay: 25,
    graduationRate: 5,
    totalMonths: 0,
    totalAmount: 0,
    remainingBalance: 0,
    monthlyPayment: 0,
    interestRate: 0,
    remainingMonths: 0,
    startDate: '',
    endDate: '',
    memo: '',
  })

  const [showLoanForm, setShowLoanForm] = useState(false)
  const [loanForm, setLoanForm] = useState<LoanItem>(emptyLoan())
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)

  function setLoan<K extends keyof LoanItem>(key: K, value: LoanItem[K]) {
    setLoanForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSaveLoan() {
    if (!budgetSettings || !loanForm.name.trim()) return
    const loans = editingLoanId
      ? budgetSettings.loans.map(l => (l.id === editingLoanId ? loanForm : l))
      : [...budgetSettings.loans, { ...loanForm, id: Date.now().toString() }]
    const updated = { ...budgetSettings, loans }
    setBudgetSettings(updated)
    saveBudgetSettings(updated)
    setShowLoanForm(false)
    setEditingLoanId(null)
    setLoanForm(emptyLoan())
    showToast('대출 정보가 저장됐어요.')
  }

  function handleDeleteLoan(id: string) {
    if (!budgetSettings) return
    const updated = { ...budgetSettings, loans: budgetSettings.loans.filter(l => l.id !== id) }
    setBudgetSettings(updated)
    saveBudgetSettings(updated)
    showToast('대출 항목이 삭제됐어요.')
  }

  function handleEditLoan(loan: LoanItem) {
    setLoanForm({ ...loan })
    setEditingLoanId(loan.id)
    setShowLoanForm(true)
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

        {/* 대출 관리 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">🏦 대출 관리</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {budgetSettings.loans.length > 0
                  ? `총 월 상환액 ${budgetSettings.loans.reduce((s, l) => s + l.monthlyPayment, 0).toLocaleString('ko-KR')}원`
                  : '대출 정보를 등록하면 가계부에 반영됩니다'}
              </p>
            </div>
            <button
              onClick={() => { setLoanForm(emptyLoan()); setEditingLoanId(null); setShowLoanForm(v => !v) }}
              className="px-3 py-1.5 bg-pink-400 text-white rounded-xl text-xs font-semibold hover:bg-pink-500 transition-colors"
            >
              + 추가
            </button>
          </div>
          <div className="px-4 py-4 space-y-3">
            {/* 등록된 대출 목록 */}
            {budgetSettings.loans.length === 0 && !showLoanForm && (
              <p className="text-sm text-slate-400 text-center py-4">등록된 대출이 없어요</p>
            )}
            {budgetSettings.loans.map(loan => (
              <div key={loan.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">{loan.name}</span>
                    <span className="ml-2 text-xs bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded-full">{loan.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditLoan(loan)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors">수정</button>
                    <button onClick={() => handleDeleteLoan(loan.id)} className="text-xs text-pink-400 hover:text-pink-600 px-2 py-1 rounded-lg hover:bg-pink-50 transition-colors">삭제</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  {loan.repaymentType === '거치식' && loan.graceMonths > 0 ? (() => {
                    const r = loan.interestRate / 100 / 12
                    const monthlyInterest = r > 0 ? Math.round(loan.remainingBalance * r) : 0
                    const amortMonths = loan.remainingMonths - loan.graceMonths
                    const amortPmt = amortMonths > 0 && r > 0
                      ? Math.round(loan.remainingBalance * r * Math.pow(1+r, amortMonths) / (Math.pow(1+r, amortMonths) - 1))
                      : 0
                    return (
                      <>
                        <span>이자만 <strong className="text-red-500">{monthlyInterest.toLocaleString('ko-KR')}원/월</strong> <span className="bg-orange-100 text-orange-600 px-1 rounded">거치중</span></span>
                        <span>원금상환 개시 <strong className="text-blue-600">{monthsLater(loan.graceMonths)}</strong></span>
                        {amortPmt > 0 && <span>개시 후 <strong className="text-slate-700">{amortPmt.toLocaleString('ko-KR')}원/월</strong></span>}
                      </>
                    )
                  })() : (
                    <span>월 상환 <strong className="text-slate-700">{loan.monthlyPayment.toLocaleString('ko-KR')}원</strong></span>
                  )}
                  <span>잔여 <strong className="text-slate-700">{loan.remainingBalance.toLocaleString('ko-KR')}원</strong></span>
                  {loan.interestRate > 0 && <span>금리 <strong className="text-slate-700">{loan.interestRate}%</strong></span>}
                  {(loan.repaymentType && loan.repaymentType !== '원리금균등') && (
                    <span className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">{loan.repaymentType}</span>
                  )}
                  {loan.repaymentDay > 0 && <span>매월 <strong className="text-slate-700">{loan.repaymentDay}일</strong> 상환</span>}
                  {loan.endDate && <span>만기 <strong className="text-slate-700">{loan.endDate}</strong></span>}
                </div>
                {loan.memo && <p className="text-xs text-slate-400 mt-1">{loan.memo}</p>}
              </div>
            ))}

            {/* 추가/수정 폼 */}
            {showLoanForm && (() => {
              const calc = calcLoan(
                loanForm.remainingBalance, loanForm.interestRate, loanForm.remainingMonths,
                loanForm.repaymentType, loanForm.graceMonths, loanForm.graduationRate, loanForm.monthlyPayment
              )
              return (
                <div className="bg-pink-50 rounded-xl p-3 border border-pink-100 space-y-3 fade-in">
                  <p className="text-sm font-semibold text-pink-700">{editingLoanId ? '대출 수정' : '대출 추가'}</p>

                  {/* 기본 정보 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">대출명 *</label>
                      <input type="text" value={loanForm.name} onChange={e => setLoan('name', e.target.value)}
                        placeholder="예: 전세자금대출"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">종류</label>
                      <select value={loanForm.type} onChange={e => setLoan('type', e.target.value as LoanType)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300">
                        {(['주택담보대출','전세대출','자동차할부','신용대출','학자금대출','기타'] as LoanType[]).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 상환 방식 */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">상환 방식</label>
                    <div className="grid grid-cols-5 gap-1">
                      {(['원리금균등','원금균등','거치식','만기일시','체증식'] as LoanRepaymentType[]).map(rt => (
                        <button key={rt} type="button"
                          onClick={() => setLoan('repaymentType', rt)}
                          className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            loanForm.repaymentType === rt
                              ? 'bg-pink-400 text-white border-pink-400'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-pink-200'
                          }`}
                        >{rt}</button>
                      ))}
                    </div>
                  </div>

                  {/* 거치기간 (거치식 전용) */}
                  {loanForm.repaymentType === '거치식' && (
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">남은 거치기간 (개월)</label>
                      <input type="number" value={loanForm.graceMonths || ''} placeholder="0"
                        onChange={e => setLoan('graceMonths', Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                      <p className="text-xs text-slate-400 mt-0.5">0이면 이미 원금상환 중</p>
                    </div>
                  )}

                  {/* 체증식 전용 자동계산 UI */}
                  {loanForm.repaymentType === '체증식' ? (() => {
                    // 기본 계산 가능 조건 (실행일 없어도 연도별 표는 표시)
                    const canBasicCalc = loanForm.totalAmount > 0 && loanForm.interestRate > 0 && loanForm.totalMonths > 0
                    const hasStartDate = !!loanForm.startDate
                    const initPmt = canBasicCalc ? calcGraduatedInitialPayment(loanForm.totalAmount, loanForm.interestRate, loanForm.totalMonths, loanForm.graduationRate) : 0
                    const curPmt = (canBasicCalc && hasStartDate) ? calcGraduatedCurrentPayment(initPmt, loanForm.startDate, loanForm.graduationRate) : initPmt
                    const remBal = (canBasicCalc && hasStartDate) ? calcGraduatedRemainingBalance(loanForm.totalAmount, loanForm.interestRate, loanForm.totalMonths, loanForm.graduationRate, loanForm.startDate) : loanForm.totalAmount
                    const remMo = (canBasicCalc && hasStartDate) ? calcRemainingMonths(loanForm.startDate, loanForm.totalMonths) : loanForm.totalMonths
                    const gradSchedule = canBasicCalc ? calcGraduatedSchedule(loanForm.totalAmount, loanForm.interestRate, loanForm.totalMonths, loanForm.graduationRate) : []
                    return (
                      <div className="space-y-3">
                        {/* 체증식 안내 */}
                        <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-600 leading-relaxed">
                          <strong>체증식이란?</strong> 매년 납입액이 일정 비율씩 늘어나는 방식이에요.<br/>
                          주택금융공사(HF) 기준 <strong>체증률 5%</strong>가 일반적이며, 대출 약정서에서 확인할 수 있어요.
                        </div>

                        {/* 입력 행 1: 총 대출금 + 연이율(고정) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-600 block mb-1">총 대출금 (원) *</label>
                            <input type="number" value={loanForm.totalAmount || ''} placeholder="0"
                              onChange={e => setLoanForm(prev => ({ ...prev, totalAmount: Number(e.target.value) || 0 }))}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-1">연이율 — 고정금리 (%) *</label>
                            <input type="number" value={loanForm.interestRate || ''} placeholder="예: 3.20" step="0.01"
                              onChange={e => setLoanForm(prev => ({ ...prev, interestRate: Number(e.target.value) || 0 }))}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                          </div>
                        </div>
                        {/* 입력 행 2: 대출 총 기간 + 체증률 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-600 block mb-1">대출 총 기간 (개월) *</label>
                            <input type="number" value={loanForm.totalMonths || ''} placeholder="예: 360 (30년)"
                              onChange={e => setLoanForm(prev => ({ ...prev, totalMonths: Number(e.target.value) || 0 }))}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-1">
                              연 체증률 (%)
                              <span className="ml-1 text-pink-400 font-normal">기본 5%</span>
                            </label>
                            <input type="number" value={loanForm.graduationRate ?? 5} placeholder="5" step="0.01"
                              onChange={e => setLoanForm(prev => ({ ...prev, graduationRate: Number(e.target.value) || 0 }))}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                          </div>
                        </div>
                        {/* 입력 행 3: 대출 실행일 + 매월 상환일 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-600 block mb-1">
                              대출 실행일
                              <span className="ml-1 text-slate-400 font-normal">(입력 시 현재 납입액 계산)</span>
                            </label>
                            <input type="month" value={loanForm.startDate}
                              onChange={e => setLoanForm(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 block mb-1">매월 상환일</label>
                            <div className="flex items-center gap-1">
                              <input type="number" value={loanForm.repaymentDay || ''} placeholder="25" min={1} max={31}
                                onChange={e => setLoan('repaymentDay', Number(e.target.value) || 25)}
                                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                              <span className="text-xs text-slate-500 whitespace-nowrap">일</span>
                            </div>
                          </div>
                        </div>

                        {/* 자동계산 결과 — 기본 3개 필드만 있으면 표시 */}
                        {canBasicCalc && initPmt > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-pink-200 space-y-2 fade-in">
                            <p className="text-xs font-semibold text-pink-600">
                              📊 체증식 자동계산 결과
                              {loanForm.graduationRate > 0 && <span className="ml-1 text-pink-400 font-normal">(체증률 {loanForm.graduationRate}%)</span>}
                            </p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">1년차 월 납입액</span>
                                <span className="font-bold text-slate-800">{initPmt.toLocaleString('ko-KR')}원</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">현재 월 납입액</span>
                                <span className="font-bold text-pink-600">{curPmt.toLocaleString('ko-KR')}원</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">현재 잔여 잔액</span>
                                <span className="font-medium text-slate-800">{remBal.toLocaleString('ko-KR')}원</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">잔여 기간</span>
                                <span className="font-medium text-slate-800">{formatMonths(remMo)}</span>
                              </div>
                            </div>
                            {!hasStartDate && (
                              <p className="text-xs text-slate-400 bg-slate-50 rounded px-2 py-1">
                                💡 대출 실행일을 입력하면 현재 납입액과 잔여 잔액이 정확히 계산됩니다
                              </p>
                            )}

                            {/* 연도별 납입액 표 */}
                            {gradSchedule.length > 0 && (
                              <div className="border-t border-pink-100 pt-2">
                                <p className="text-xs font-semibold text-slate-600 mb-1.5">📅 연도별 월 납입액</p>
                                <div className="max-h-48 overflow-y-auto">
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white">
                                      <tr className="text-slate-400 border-b border-slate-100">
                                        <th className="text-left pb-1 font-semibold pr-1">연차</th>
                                        <th className="text-right pb-1 font-semibold">월 납입액</th>
                                        <th className="text-right pb-1 font-semibold text-blue-500">연간원금</th>
                                        <th className="text-right pb-1 font-semibold text-red-400">연간이자</th>
                                        <th className="text-right pb-1 font-semibold">잔액</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {gradSchedule.map(row => (
                                        <tr key={row.year} className={`border-b border-slate-50 ${hasStartDate && row.year === Math.floor(calcRemainingMonths(loanForm.startDate, loanForm.totalMonths) > loanForm.totalMonths - 12 ? 1 : (loanForm.totalMonths - calcRemainingMonths(loanForm.startDate, loanForm.totalMonths)) / 12) + 1 ? 'bg-pink-50' : ''}`}>
                                          <td className="py-1 text-slate-600 pr-1">{row.year}년차</td>
                                          <td className="py-1 text-right font-medium text-slate-800">{row.payment.toLocaleString('ko-KR')}</td>
                                          <td className="py-1 text-right text-blue-500">{row.yearlyPrincipal.toLocaleString('ko-KR')}</td>
                                          <td className="py-1 text-right text-red-400">{row.yearlyInterest.toLocaleString('ko-KR')}</td>
                                          <td className="py-1 text-right text-slate-700">{row.endBalance.toLocaleString('ko-KR')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const endDate = loanForm.startDate
                                  ? (() => {
                                    const d = new Date(loanForm.startDate + '-01')
                                    d.setMonth(d.getMonth() + loanForm.totalMonths)
                                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                  })()
                                  : loanForm.endDate
                                setLoanForm(prev => ({
                                  ...prev,
                                  monthlyPayment: curPmt,
                                  remainingBalance: remBal,
                                  remainingMonths: remMo,
                                  endDate,
                                }))
                              }}
                              className="w-full py-1.5 bg-pink-100 text-pink-700 rounded-lg text-xs font-semibold hover:bg-pink-200 transition-colors"
                            >
                              계산 결과 적용 — 현재 납입액 {curPmt.toLocaleString('ko-KR')}원 / 잔여 잔액 {remBal.toLocaleString('ko-KR')}원
                            </button>
                          </div>
                        )}
                        {!canBasicCalc && (
                          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
                            <p className="font-semibold text-slate-600">다음 항목을 입력하면 자동 계산됩니다:</p>
                            {!loanForm.totalAmount && <p>• 총 대출금</p>}
                            {!loanForm.interestRate && <p>• 연이율</p>}
                            {!loanForm.totalMonths && <p>• 대출 총 기간 (예: 30년 = 360개월)</p>}
                          </div>
                        )}
                      </div>
                    )
                  })() : (
                    // 체증식 외 상환방식
                    <div className="space-y-3">
                      {/* 거치기간 (거치식 전용) — 이미 위에 있으므로 여기선 잔여잔액/금리/남은개월 */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-slate-600 block mb-1">잔여 잔액 (원)</label>
                          <input type="number" value={loanForm.remainingBalance || ''} placeholder="0"
                            onChange={e => setLoan('remainingBalance', Number(e.target.value) || 0)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 block mb-1">연이율 (%)</label>
                          <input type="number" value={loanForm.interestRate || ''} placeholder="0.0" step="0.1"
                            onChange={e => setLoan('interestRate', Number(e.target.value) || 0)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 block mb-1">남은 개월</label>
                          <input type="number" value={loanForm.remainingMonths || ''} placeholder="0"
                            onChange={e => {
                              const mo = Number(e.target.value) || 0
                              const newCalc = calcLoan(loanForm.remainingBalance, loanForm.interestRate, mo)
                              setLoanForm(prev => ({ ...prev, remainingMonths: mo, monthlyPayment: newCalc?.monthlyPayment ?? prev.monthlyPayment }))
                            }}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                        </div>
                      </div>

                      {/* 자동계산 결과 */}
                      {calc && (() => {
                        const isGraceActive = loanForm.repaymentType === '거치식' && loanForm.graceMonths > 0
                        const r2 = loanForm.interestRate / 100 / 12
                        const amortMonths2 = loanForm.remainingMonths - loanForm.graceMonths
                        const amortPmt2 = isGraceActive && amortMonths2 > 0 && r2 > 0
                          ? Math.round(loanForm.remainingBalance * r2 * Math.pow(1+r2, amortMonths2) / (Math.pow(1+r2, amortMonths2) - 1))
                          : 0
                        const graceInterest = isGraceActive ? Math.round(loanForm.remainingBalance * r2) : 0
                        return (
                          <div className="bg-white rounded-lg p-3 border border-pink-200 space-y-2">
                            <p className="text-xs font-semibold text-pink-600">
                              📊 자동 계산 결과
                              {isGraceActive && <span className="ml-1 bg-orange-100 text-orange-600 px-1.5 rounded font-normal">거치중</span>}
                            </p>

                            {isGraceActive ? (
                              // 거치식 전용 표시
                              <div className="space-y-2 text-xs">
                                <div className="bg-orange-50 rounded-lg px-3 py-2 space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">현재 월 이자 (거치중)</span>
                                    <span className="font-bold text-red-500">{graceInterest.toLocaleString('ko-KR')}원/월</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">거치기간 남은 개월</span>
                                    <span className="font-medium text-orange-600">{loanForm.graceMonths}개월</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">원금상환 개시 예정</span>
                                    <span className="font-bold text-blue-600">{monthsLater(loanForm.graceMonths)}</span>
                                  </div>
                                </div>
                                {amortPmt2 > 0 && (
                                  <div className="bg-blue-50 rounded-lg px-3 py-2 space-y-1.5">
                                    <p className="text-xs font-semibold text-blue-600">원금상환 개시 후</p>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">월 납입액 (원리금균등)</span>
                                      <span className="font-bold text-blue-700">{amortPmt2.toLocaleString('ko-KR')}원/월</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">상환 기간</span>
                                      <span className="font-medium text-slate-700">{formatMonths(amortMonths2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">완납 예정</span>
                                      <span className="font-medium text-slate-700">{monthsLater(loanForm.remainingMonths)}</span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex justify-between border-t border-pink-100 pt-1.5">
                                  <span className="text-slate-500">전체 총 이자</span>
                                  <span className="font-bold text-red-500">{calc.totalInterest.toLocaleString('ko-KR')}원</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLoan('monthlyPayment', graceInterest)}
                                  className="w-full py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200 transition-colors"
                                >
                                  현재 납입액(이자만) 적용 — {graceInterest.toLocaleString('ko-KR')}원/월
                                </button>
                              </div>
                            ) : (
                              // 일반 상환방식 표시
                              <>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">월 납입액</span>
                                    <span className="font-bold text-slate-800">{calc.monthlyPayment.toLocaleString('ko-KR')}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">└ 첫달 원금</span>
                                    <span className="font-medium text-blue-600">{calc.firstMonthPrincipal.toLocaleString('ko-KR')}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">└ 첫달 이자</span>
                                    <span className="font-medium text-red-500">{calc.firstMonthInterest.toLocaleString('ko-KR')}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">완납 예정</span>
                                    <span className="font-medium text-slate-700">{monthsLater(calc.payoffMonths)}</span>
                                  </div>
                                </div>
                                <div className="border-t border-pink-100 pt-2 space-y-1 text-xs">
                                  <p className="font-semibold text-slate-600">1년 상환 계획</p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div className="flex justify-between"><span className="text-slate-500">총 납입액</span><span className="font-medium text-slate-800">{calc.yearlyPayment.toLocaleString('ko-KR')}원</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">납입 원금</span><span className="font-medium text-blue-600">{calc.yearlyPrincipal.toLocaleString('ko-KR')}원</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">납입 이자</span><span className="font-medium text-red-500">{calc.yearlyInterest.toLocaleString('ko-KR')}원</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">1년 후 잔액</span><span className="font-bold text-slate-800">{calc.balanceAfterYear.toLocaleString('ko-KR')}원</span></div>
                                  </div>
                                </div>
                                <div className="border-t border-pink-100 pt-2 flex justify-between text-xs">
                                  <span className="text-slate-500">전체 기간 총 이자</span>
                                  <span className="font-bold text-red-500">{calc.totalInterest.toLocaleString('ko-KR')}원</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLoan('monthlyPayment', calc.monthlyPayment)}
                                  className="w-full py-1.5 bg-pink-100 text-pink-700 rounded-lg text-xs font-semibold hover:bg-pink-200 transition-colors"
                                >
                                  계산된 월 납입액 적용 ({calc.monthlyPayment.toLocaleString('ko-KR')}원)
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })()}

                      {/* 총 대출금 + 월납입 + 상환일 */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-slate-600 block mb-1">총 대출금 (원)</label>
                          <input type="number" value={loanForm.totalAmount || ''} placeholder="0"
                            onChange={e => setLoan('totalAmount', Number(e.target.value) || 0)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 block mb-1">월 납입액 (원)</label>
                          <input type="number" value={loanForm.monthlyPayment || ''} placeholder="자동계산 후 적용"
                            onChange={e => setLoan('monthlyPayment', Number(e.target.value) || 0)}
                            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 block mb-1">매월 상환일</label>
                          <div className="flex items-center gap-1">
                            <input type="number" value={loanForm.repaymentDay || ''} placeholder="25" min={1} max={31}
                              onChange={e => setLoan('repaymentDay', Number(e.target.value) || 25)}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                            <span className="text-xs text-slate-500 whitespace-nowrap">일</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 메모 */}
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">메모 (은행명 등)</label>
                    <input type="text" value={loanForm.memo} onChange={e => setLoan('memo', e.target.value)}
                      placeholder="예: 국민은행, 변동금리"
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-pink-300" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setShowLoanForm(false); setEditingLoanId(null) }}
                      className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
                      취소
                    </button>
                    <button onClick={handleSaveLoan} disabled={!loanForm.name.trim()}
                      className="flex-1 py-2.5 bg-pink-400 text-white rounded-xl text-sm font-semibold hover:bg-pink-500 disabled:opacity-40 transition-colors">
                      저장
                    </button>
                  </div>
                </div>
              )
            })()}
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
