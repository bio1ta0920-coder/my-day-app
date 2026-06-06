/** 원리금균등상환 기준 대출 계산 유틸 */

export interface MonthlyBreakdown {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export interface LoanCalcResult {
  monthlyPayment: number       // 월 납입액
  firstMonthPrincipal: number  // 첫달 원금
  firstMonthInterest: number   // 첫달 이자

  yearlyPayment: number        // 1년 총 납입액
  yearlyPrincipal: number      // 1년 납입 원금 합계
  yearlyInterest: number       // 1년 납입 이자 합계
  balanceAfterYear: number     // 1년 후 잔여잔액

  totalInterest: number        // 총 납입 이자 (전체 기간)
  totalPayment: number         // 총 납입액 (전체 기간)
  payoffMonths: number         // 완납까지 남은 개월
  schedule: MonthlyBreakdown[] // 12개월 상환 스케줄
}

/**
 * @param balance       잔여 대출 잔액 (원)
 * @param annualRate    연이율 (% — 예: 4.5)
 * @param remainingMonths 남은 개월 수
 */
export function calcLoan(
  balance: number,
  annualRate: number,
  remainingMonths: number
): LoanCalcResult | null {
  if (balance <= 0 || remainingMonths <= 0) return null

  const r = annualRate / 100 / 12
  let monthlyPayment: number

  if (r === 0) {
    monthlyPayment = balance / remainingMonths
  } else {
    const factor = Math.pow(1 + r, remainingMonths)
    monthlyPayment = (balance * r * factor) / (factor - 1)
  }
  monthlyPayment = Math.round(monthlyPayment)

  // 12개월 스케줄 시뮬레이션
  const months = Math.min(12, remainingMonths)
  const schedule: MonthlyBreakdown[] = []
  let bal = balance
  let yearlyPrincipal = 0
  let yearlyInterest = 0

  for (let i = 1; i <= months; i++) {
    const interest = Math.round(bal * r)
    const isLast = i === months && remainingMonths <= 12
    const principal = isLast ? bal : Math.min(monthlyPayment - interest, bal)
    const payment = isLast ? bal + interest : monthlyPayment
    bal = Math.max(0, bal - principal)
    yearlyPrincipal += principal
    yearlyInterest += interest
    schedule.push({ month: i, payment, principal, interest, balance: bal })
  }

  // 전체 이자 계산
  let totalInterest = 0
  let fullBal = balance
  for (let i = 0; i < remainingMonths; i++) {
    const interest = Math.round(fullBal * r)
    const principal = i === remainingMonths - 1 ? fullBal : Math.min(monthlyPayment - interest, fullBal)
    totalInterest += interest
    fullBal = Math.max(0, fullBal - principal)
  }

  const firstMonthInterest = Math.round(balance * r)
  const firstMonthPrincipal = monthlyPayment - firstMonthInterest

  return {
    monthlyPayment,
    firstMonthPrincipal,
    firstMonthInterest,
    yearlyPayment: monthlyPayment * months,
    yearlyPrincipal: Math.round(yearlyPrincipal),
    yearlyInterest: Math.round(yearlyInterest),
    balanceAfterYear: Math.round(schedule[schedule.length - 1]?.balance ?? 0),
    totalInterest: Math.round(totalInterest),
    totalPayment: monthlyPayment * remainingMonths,
    payoffMonths: remainingMonths,
    schedule,
  }
}

/** 연/월 단위로 표시 */
export function formatMonths(months: number): string {
  if (months <= 0) return '완납'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}개월`
  if (m === 0) return `${y}년`
  return `${y}년 ${m}개월`
}

/** 현재 월에서 n개월 후 YYYY년 M월 반환 */
export function monthsLater(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}
