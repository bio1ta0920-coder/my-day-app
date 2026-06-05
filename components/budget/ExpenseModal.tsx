'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Expense } from '@/lib/types'
import { BUDGET_CATEGORIES, PAYMENT_METHODS, CARDS } from '@/lib/constants'

interface Props {
  expense: Expense | null
  onSave: (expense: Expense) => void
  onClose: () => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const emptyExpense = (): Expense => ({
  id: generateId(),
  name: '',
  category: '식비',
  isFixed: false,
  amount: 0,
  merchant: '',
  card: '',
  paymentMethod: '신용카드',
  installment: false,
  installmentMonths: 0,
  purchaseType: 'planned',
  isDate: false,
  reason: '',
  notes: '',
})

const purchaseTypes: Array<{ key: 'planned' | 'impulse' | 'essential'; label: string; color: string; bg: string }> = [
  { key: 'planned', label: '계획구매', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'impulse', label: '충동구매', color: '#dc2626', bg: '#fef2f2' },
  { key: 'essential', label: '필수지출', color: '#2563eb', bg: '#eff6ff' },
]

export default function ExpenseModal({ expense, onSave, onClose }: Props) {
  const [form, setForm] = useState<Expense>(expense ?? emptyExpense())
  const [showExtra, setShowExtra] = useState(false)
  const [amountStr, setAmountStr] = useState(expense?.amount ? String(expense.amount) : '')

  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])

  const set = <K extends keyof Expense>(key: K, value: Expense[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!amountStr || parseInt(amountStr) <= 0) { alert('금액을 입력해주세요.'); return }
    if (!form.name.trim()) { alert('항목명을 입력해주세요.'); return }
    onSave({ ...form, amount: parseInt(amountStr) || 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto slide-up">
        <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{expense ? '지출 수정' : '지출 추가'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* 금액 */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-2">금액</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl font-bold text-slate-400">₩</span>
              <input
                type="number"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                placeholder="0"
                className="text-4xl font-bold text-slate-800 text-center w-48 border-none outline-none bg-transparent"
                autoFocus
              />
            </div>
            <div className="mt-2 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
            {amountStr && (
              <p className="text-sm text-pink-400 mt-1 font-medium">
                {parseInt(amountStr).toLocaleString('ko-KR')}원
              </p>
            )}
          </div>

          {/* 카테고리 */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">카테고리</p>
            <div className="grid grid-cols-4 gap-2">
              {BUDGET_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => set('category', cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    form.category === cat.id ? 'border-current shadow-sm scale-105' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                  style={form.category === cat.id ? { borderColor: cat.color, backgroundColor: cat.bg } : {}}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-xs font-medium text-slate-600 leading-tight text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 항목명 / 구매처 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">항목명 *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="예: 점심식사"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">구매처</label>
              <input
                type="text"
                value={form.merchant}
                onChange={e => set('merchant', e.target.value)}
                placeholder="예: 스타벅스"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* 결제수단 */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">결제수단</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method}
                  onClick={() => set('paymentMethod', method)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    form.paymentMethod === method ? 'bg-pink-400 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* 사용카드 */}
          {(form.paymentMethod === '신용카드' || form.paymentMethod === '체크카드') && (
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">사용카드</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {CARDS.map(card => (
                  <button
                    key={card}
                    onClick={() => set('card', form.card === card ? '' : card)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      form.card === card ? 'bg-pink-400 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {card}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={form.card}
                onChange={e => set('card', e.target.value)}
                placeholder="직접 입력..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          )}

          {/* 구매 유형 */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">구매 유형</p>
            <div className="grid grid-cols-3 gap-2">
              {purchaseTypes.map(pt => (
                <button
                  key={pt.key}
                  onClick={() => set('purchaseType', pt.key)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.purchaseType === pt.key ? 'border-current shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={form.purchaseType === pt.key ? { borderColor: pt.color, color: pt.color, backgroundColor: pt.bg } : {}}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 고정비 */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">고정비</p>
              <p className="text-xs text-slate-400">매달 반복되는 지출인가요?</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={form.isFixed} onChange={e => set('isFixed', e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* 데이트 지출 */}
          <button
            type="button"
            onClick={() => set('isDate', !form.isDate)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
              form.isDate ? 'border-pink-400 bg-pink-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span className="text-2xl">💑</span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-semibold ${form.isDate ? 'text-pink-600' : 'text-slate-700'}`}>데이트 지출</p>
              <p className="text-xs text-slate-400">데이트 중에 쓴 비용인가요?</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.isDate ? 'border-pink-500 bg-pink-500' : 'border-slate-300'}`}>
              {form.isDate && <span className="text-white text-xs font-bold">✓</span>}
            </div>
          </button>

          {/* 추가 정보 */}
          <div>
            <button
              onClick={() => setShowExtra(!showExtra)}
              className="flex items-center gap-1 text-sm text-pink-400 font-medium"
            >
              {showExtra ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showExtra ? '접기' : '더 입력하기'}
            </button>
            {showExtra && (
              <div className="mt-3 space-y-3 fade-in">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">구매 이유</label>
                  <input
                    type="text"
                    value={form.reason}
                    onChange={e => set('reason', e.target.value)}
                    placeholder="왜 구매했나요?"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">메모</label>
                  <textarea
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="추가 메모..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors resize-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">할부</p>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.installment} onChange={e => set('installment', e.target.checked)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                {form.installment && (
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">할부 개월수</label>
                    <input
                      type="number"
                      value={form.installmentMonths || ''}
                      onChange={e => set('installmentMonths', parseInt(e.target.value) || 0)}
                      placeholder="개월수"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-pink-300 focus:outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-400 text-white rounded-2xl font-bold text-base shadow-lg shadow-pink-200 hover:shadow-pink-200 active:scale-95 transition-all"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  )
}
