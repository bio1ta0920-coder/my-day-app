'use client'

import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp, Wallet, AlertTriangle, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import type { Expense } from '@/lib/types'
import { getAllBudgetRecords, getBudgetSettings, getEffectiveBudgetSettings } from '@/lib/storage'
import { BUDGET_CATEGORIES } from '@/lib/constants'
import { calcLoan, formatMonths, monthsLater } from '@/lib/loanCalc'

interface Props {
  yearMonth: string // "YYYY-MM"
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
      />
    </div>
  )
}

import type { LoanItem } from '@/lib/types'
import type { LoanCalcResult } from '@/lib/loanCalc'

function LoanCard({ loan, calc, progressPct }: { loan: LoanItem; calc: LoanCalcResult | null; progressPct: number }) {
  const [showSchedule, setShowSchedule] = useState(false)
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="text-sm font-semibold text-slate-800">{loan.name}</span>
          <span className="ml-2 text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">{loan.type}</span>
          {loan.memo && <span className="ml-1 text-xs text-slate-400">{loan.memo}</span>}
        </div>
        <span className="text-sm font-bold text-red-600">{loan.monthlyPayment.toLocaleString('ko-KR')}원/월</span>
      </div>

      {/* 진행바 */}
      {loan.totalAmount > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>상환 {(loan.totalAmount - loan.remainingBalance).toLocaleString('ko-KR')}원</span>
            <span>잔여 {loan.remainingBalance.toLocaleString('ko-KR')}원</span>
          </div>
          <Bar pct={progressPct} color="#22c55e" />
        </div>
      )}

      {/* 기본 정보 */}
      <div className="flex gap-3 text-xs text-slate-400 mb-2">
        {loan.interestRate > 0 && <span>금리 {loan.interestRate}%</span>}
        {loan.remainingMonths > 0 && <span>잔여 {formatMonths(loan.remainingMonths)}</span>}
        {loan.endDate && <span>만기 {loan.endDate}</span>}
      </div>

      {/* 계산 결과 */}
      {calc && (
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1.5 text-xs">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex justify-between"><span className="text-slate-500">이번달 원금</span><span className="font-medium text-blue-600">{calc.firstMonthPrincipal.toLocaleString('ko-KR')}원</span></div>
            <div className="flex justify-between"><span className="text-slate-500">이번달 이자</span><span className="font-medium text-red-500">{calc.firstMonthInterest.toLocaleString('ko-KR')}원</span></div>
            <div className="flex justify-between"><span className="text-slate-500">1년 납입 원금</span><span className="font-medium text-blue-600">{calc.yearlyPrincipal.toLocaleString('ko-KR')}원</span></div>
            <div className="flex justify-between"><span className="text-slate-500">1년 납입 이자</span><span className="font-medium text-red-500">{calc.yearlyInterest.toLocaleString('ko-KR')}원</span></div>
            <div className="flex justify-between"><span className="text-slate-500">1년 후 잔액</span><span className="font-bold text-slate-800">{calc.balanceAfterYear.toLocaleString('ko-KR')}원</span></div>
            <div className="flex justify-between"><span className="text-slate-500">완납 예정</span><span className="font-medium text-emerald-600">{monthsLater(calc.payoffMonths)}</span></div>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-1.5">
            <span className="text-slate-500">총 납입 이자 (전체)</span>
            <span className="font-bold text-red-500">{calc.totalInterest.toLocaleString('ko-KR')}원</span>
          </div>

          {/* 12개월 스케줄 토글 */}
          <button
            onClick={() => setShowSchedule(v => !v)}
            className="w-full flex items-center justify-center gap-1 pt-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showSchedule ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>{showSchedule ? '스케줄 접기' : '12개월 상환 스케줄 보기'}</span>
          </button>

          {showSchedule && (
            <div className="border-t border-slate-100 pt-2 space-y-0.5">
              <div className="grid grid-cols-4 text-xs text-slate-400 font-semibold pb-1">
                <span>월</span><span className="text-right">납입액</span><span className="text-right text-blue-500">원금</span><span className="text-right text-red-500">이자</span>
              </div>
              {calc.schedule.map(s => (
                <div key={s.month} className="grid grid-cols-4 text-xs py-0.5 border-b border-slate-50">
                  <span className="text-slate-500">{s.month}개월</span>
                  <span className="text-right text-slate-700">{s.payment.toLocaleString('ko-KR')}</span>
                  <span className="text-right text-blue-500">{s.principal.toLocaleString('ko-KR')}</span>
                  <span className="text-right text-red-400">{s.interest.toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const PAYMENT_COLORS: Record<string, string> = {
  '신용카드': '#ef4444',
  '체크카드': '#f97316',
  '현금': '#22c55e',
  '계좌이체': '#3b82f6',
  '간편결제(카카오/네이버)': '#a855f7',
}

export default function MonthlyReport({ yearMonth }: Props) {
  const [y, m] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()

  const data = useMemo(() => {
    const allRecords = getAllBudgetRecords()
    const settings = getBudgetSettings()
    const effective = getEffectiveBudgetSettings(yearMonth)

    // 이번달 레코드 모두
    const monthEntries = Object.entries(allRecords).filter(([d]) => d.startsWith(yearMonth))
    const allExpenses: Expense[] = monthEntries.flatMap(([, r]) => r.expenses)

    // 일별 지출 맵
    const byDay: Record<number, number> = {}
    monthEntries.forEach(([date, r]) => {
      const day = parseInt(date.split('-')[2])
      byDay[day] = r.expenses.reduce((s, e) => s + e.amount, 0)
    })

    const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0)
    const fixedTotal = allExpenses.filter(e => e.isFixed).reduce((s, e) => s + e.amount, 0)
    const variableTotal = totalSpent - fixedTotal
    const dateTotal = allExpenses.filter(e => e.isDate).reduce((s, e) => s + e.amount, 0)

    // 카테고리별
    const byCategory = BUDGET_CATEGORIES.map(cat => {
      const amount = allExpenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0)
      const budget = effective.categoryBudgets[cat.id] ?? 0
      return { ...cat, amount, budget }
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)

    // 구매 유형별
    const byType = { planned: 0, impulse: 0, essential: 0 }
    allExpenses.forEach(e => { byType[e.purchaseType as keyof typeof byType] += e.amount })

    // 결제수단별
    const byPayment: Record<string, number> = {}
    allExpenses.forEach(e => {
      byPayment[e.paymentMethod] = (byPayment[e.paymentMethod] ?? 0) + e.amount
    })

    // 충동구매 목록 (금액 큰 순)
    const impulseList = allExpenses
      .filter(e => e.purchaseType === 'impulse')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    // 고정비 항목 (중복 제거: 이름+카테고리 기준)
    const fixedMap: Record<string, { name: string; category: string; amount: number; count: number }> = {}
    allExpenses.filter(e => e.isFixed).forEach(e => {
      const key = `${e.name}__${e.category}`
      if (!fixedMap[key]) fixedMap[key] = { name: e.name, category: e.category, amount: e.amount, count: 0 }
      fixedMap[key].count++
    })
    const fixedItems = Object.values(fixedMap).sort((a, b) => b.amount - a.amount)

    // 총 예산
    const totalBudget = Object.values(effective.categoryBudgets).reduce((a, b) => a + b, 0) ||
      (effective.income - effective.savingsGoal)
    const totalLoanPayment = (settings.loans ?? []).reduce((s, l) => s + l.monthlyPayment, 0)

    return {
      totalSpent, fixedTotal, variableTotal, dateTotal,
      byCategory, byType, byPayment, impulseList, fixedItems,
      byDay, daysInMonth,
      totalBudget, totalLoanPayment,
      income: effective.income,
      savingsGoal: effective.savingsGoal,
      loans: settings.loans ?? [],
    }
  }, [yearMonth, daysInMonth])

  const budgetPct = data.totalBudget > 0 ? (data.totalSpent / data.totalBudget) * 100 : 0
  const maxDaySpend = Math.max(...Object.values(data.byDay), 1)

  const typeTotal = data.byType.planned + data.byType.impulse + data.byType.essential
  const paymentEntries = Object.entries(data.byPayment).sort((a, b) => b[1] - a[1])
  const paymentTotal = paymentEntries.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="px-4 pt-5 pb-8 space-y-5">

      {/* 요약 카드 4개 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <Wallet size={14} className="text-red-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium">총 지출</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{data.totalSpent.toLocaleString('ko-KR')}<span className="text-sm font-normal text-slate-500">원</span></p>
          {data.totalBudget > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>예산 대비</span>
                <span className={budgetPct > 100 ? 'text-red-500 font-semibold' : ''}>{Math.round(budgetPct)}%</span>
              </div>
              <Bar pct={budgetPct} color={budgetPct > 100 ? '#ef4444' : budgetPct > 80 ? '#f97316' : '#22c55e'} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Lock size={14} className="text-slate-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium">고정비</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{data.fixedTotal.toLocaleString('ko-KR')}<span className="text-sm font-normal text-slate-500">원</span></p>
          {data.totalSpent > 0 && (
            <p className="text-xs text-slate-400 mt-1">총 지출의 {Math.round((data.fixedTotal / data.totalSpent) * 100)}%</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <TrendingUp size={14} className="text-orange-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium">변동비</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{data.variableTotal.toLocaleString('ko-KR')}<span className="text-sm font-normal text-slate-500">원</span></p>
          {data.totalSpent > 0 && (
            <p className="text-xs text-slate-400 mt-1">총 지출의 {Math.round((data.variableTotal / data.totalSpent) * 100)}%</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingDown size={14} className="text-emerald-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium">예상 저축</span>
          </div>
          <p className={`text-xl font-bold ${data.income - data.totalSpent - data.totalLoanPayment < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {(data.income - data.totalSpent - data.totalLoanPayment).toLocaleString('ko-KR')}<span className="text-sm font-normal text-slate-500">원</span>
          </p>
          {data.totalLoanPayment > 0 && (
            <p className="text-xs text-slate-400 mt-1">대출 {data.totalLoanPayment.toLocaleString('ko-KR')}원 제외</p>
          )}
        </div>
      </div>

      {/* 일별 지출 히트맵 */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-800 mb-3 text-sm">📅 일별 지출</h3>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const amt = data.byDay[day] ?? 0
            const intensity = amt === 0 ? 0 : Math.min(1, amt / (maxDaySpend * 0.7))
            const alpha = amt === 0 ? 0 : 0.15 + intensity * 0.75
            return (
              <div key={day} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: amt > 0 ? `rgba(239,68,68,${alpha})` : '#f8fafc' }}
                  title={`${day}일: ${amt.toLocaleString()}원`}
                >
                  <span className="text-xs font-medium" style={{ color: intensity > 0.5 ? 'white' : '#64748b' }}>{day}</span>
                </div>
                {amt > 0 && (
                  <span className="text-xs text-slate-400 leading-none" style={{ fontSize: '9px' }}>
                    {amt >= 10000 ? `${Math.round(amt / 10000)}만` : `${(amt / 1000).toFixed(0)}천`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-1 mt-3 justify-end">
          <span className="text-xs text-slate-400">적음</span>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map(a => (
            <div key={a} className="w-4 h-4 rounded" style={{ backgroundColor: `rgba(239,68,68,${a})` }} />
          ))}
          <span className="text-xs text-slate-400">많음</span>
        </div>
      </section>

      {/* 카테고리별 지출 */}
      {data.byCategory.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">📂 카테고리별 지출</h3>
          <div className="space-y-3">
            {data.byCategory.map(cat => {
              const pct = data.totalSpent > 0 ? (cat.amount / data.totalSpent) * 100 : 0
              const overBudget = cat.budget > 0 && cat.amount > cat.budget
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                      {overBudget && <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">초과</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">{cat.amount.toLocaleString('ko-KR')}원</span>
                      <span className="text-xs text-slate-400 ml-1">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bar pct={pct} color={cat.color} />
                    {cat.budget > 0 && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        / {cat.budget.toLocaleString('ko-KR')}원
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 구매 유형 분석 */}
      {typeTotal > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">🛒 구매 유형 분석</h3>
          <div className="space-y-3">
            {([
              { key: 'planned', label: '계획구매', color: '#22c55e', emoji: '✅' },
              { key: 'essential', label: '필수지출', color: '#3b82f6', emoji: '🔧' },
              { key: 'impulse', label: '충동구매', color: '#ef4444', emoji: '⚡' },
            ] as const).map(({ key, label, color, emoji }) => {
              const amt = data.byType[key]
              if (amt === 0) return null
              const pct = (amt / typeTotal) * 100
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">{amt.toLocaleString('ko-KR')}원</span>
                      <span className="text-xs text-slate-400 ml-1">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <Bar pct={pct} color={color} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 결제수단 비중 */}
      {paymentEntries.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">💳 결제수단 비중</h3>
          <div className="space-y-2.5">
            {paymentEntries.map(([method, amt]) => {
              const pct = (amt / paymentTotal) * 100
              const color = PAYMENT_COLORS[method] ?? '#94a3b8'
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700">{method}</span>
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{amt.toLocaleString('ko-KR')}원</span>
                      <span className="text-xs text-slate-400 ml-1">{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <Bar pct={pct} color={color} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 고정비 내역 */}
      {data.fixedItems.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">🔒 이번달 고정비</h3>
          <div className="space-y-2">
            {data.fixedItems.map((item, i) => {
              const cat = BUDGET_CATEGORIES.find(c => c.id === item.category)
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat?.emoji ?? '📦'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item.amount.toLocaleString('ko-KR')}원</span>
                </div>
              )
            })}
            <div className="flex justify-between pt-1 mt-1 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-600">합계</span>
              <span className="text-sm font-bold text-slate-800">{data.fixedTotal.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        </section>
      )}

      {/* 대출 현황 */}
      {data.loans.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">🏦 대출 현황</h3>
          <div className="space-y-3">
            {data.loans.map(loan => {
              const calc = calcLoan(loan.remainingBalance, loan.interestRate, loan.remainingMonths, loan.repaymentType, loan.graceMonths, loan.graduationRate, loan.monthlyPayment)
              const progressPct = loan.totalAmount > 0
                ? Math.min(100, ((loan.totalAmount - loan.remainingBalance) / loan.totalAmount) * 100)
                : 0
              return <LoanCard key={loan.id} loan={loan} calc={calc} progressPct={progressPct} />
            })}
            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-600">총 월 상환액</span>
              <span className="text-sm font-bold text-red-600">{data.totalLoanPayment.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        </section>
      )}

      {/* 충동구매 목록 */}
      {data.impulseList.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <h3 className="font-bold text-slate-800 text-sm">충동구매 내역 ({data.impulseList.length}건)</h3>
            <span className="ml-auto text-sm font-semibold text-red-500">
              {data.byType.impulse.toLocaleString('ko-KR')}원
            </span>
          </div>
          <div className="space-y-2">
            {data.impulseList.map(e => {
              const cat = BUDGET_CATEGORIES.find(c => c.id === e.category)
              return (
                <div key={e.id} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                  <span className="text-base">{cat?.emoji ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.name}</p>
                    <p className="text-xs text-slate-400">{e.category}{e.merchant ? ` · ${e.merchant}` : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-500 flex-shrink-0">{e.amount.toLocaleString('ko-KR')}원</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 데이터 없을 때 */}
      {data.totalSpent === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-5xl">📊</span>
          <p className="text-slate-500 font-medium">이달 지출 데이터가 없어요</p>
          <p className="text-slate-400 text-sm">지출을 기록하면 리포트가 생성됩니다</p>
        </div>
      )}
    </div>
  )
}
