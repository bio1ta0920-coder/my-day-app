'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { Expense } from '@/lib/types'
import { BUDGET_CATEGORIES } from '@/lib/constants'

interface Props {
  expense: Expense
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

const purchaseTypeBadge: Record<string, { bg: string; text: string; label: string }> = {
  planned: { bg: '#f0fdf4', text: '#16a34a', label: '계획구매' },
  impulse: { bg: '#fef2f2', text: '#dc2626', label: '충동구매' },
  essential: { bg: '#eff6ff', text: '#2563eb', label: '필수지출' },
}

export default function ExpenseCard({ expense, onEdit, onDelete }: Props) {
  const cat = BUDGET_CATEGORIES.find(c => c.id === expense.category)
  const badge = purchaseTypeBadge[expense.purchaseType] ?? purchaseTypeBadge.planned

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: cat?.bg ?? '#f8fafc' }}
      >
        {cat?.emoji ?? '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-slate-800 truncate">{expense.name}</span>
          {expense.isFixed && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full flex-shrink-0">고정</span>
          )}
          {expense.isDate && (
            <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full flex-shrink-0">💑 데이트</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {expense.merchant && <span className="text-xs text-slate-400">{expense.merchant}</span>}
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
          {expense.card && <span className="text-xs text-slate-400">{expense.card}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-bold text-slate-800 text-right">{expense.amount.toLocaleString('ko-KR')}원</span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(expense)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-400 transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
