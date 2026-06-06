import type { LoanRepaymentType } from './types'

export interface MonthlyBreakdown {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
  note?: string // 거치기간 등 표시용
}

export interface LoanCalcResult {
  monthlyPayment: number       // 첫달 납입액 (방식에 따라 변동 가능)
  firstMonthPrincipal: number
  firstMonthInterest: number

  yearlyPayment: number
  yearlyPrincipal: number
  yearlyInterest: number
  balanceAfterYear: number

  totalInterest: number
  totalPayment: number
  payoffMonths: number
  schedule: MonthlyBreakdown[] // 12개월 스케줄
  note?: string                // 체증식 등 안내 메시지
}

/**
 * @param balance         잔여 대출 잔액
 * @param annualRate      연이율 (%)
 * @param remainingMonths 남은 상환 개월
 * @param repaymentType   상환 방식
 * @param graceMonths     거치기간 (거치식 전용, 이미 거치기간이 remainingMonths에 포함된 경우)
 * @param graduationRate  체증률 % (체증식 전용)
 * @param currentPayment  현재 월 납입액 (체증식에서 직접 입력 시)
 */
export function calcLoan(
  balance: number,
  annualRate: number,
  remainingMonths: number,
  repaymentType: LoanRepaymentType = '원리금균등',
  graceMonths: number = 0,
  graduationRate: number = 0,
  currentPayment: number = 0,
): LoanCalcResult | null {
  if (balance <= 0 || remainingMonths <= 0) return null

  const r = annualRate / 100 / 12

  switch (repaymentType) {

    // ── 원리금균등 ─────────────────────────────
    case '원리금균등': {
      return calcAnnuity(balance, r, remainingMonths)
    }

    // ── 원금균등 ──────────────────────────────
    case '원금균등': {
      return calcPrincipalEqual(balance, r, remainingMonths)
    }

    // ── 거치식 ────────────────────────────────
    case '거치식': {
      // graceMonths: 남은 거치기간 개월 수 (0이면 이미 원금상환 시작)
      const amortMonths = remainingMonths - graceMonths
      return calcGrace(balance, r, remainingMonths, graceMonths, amortMonths > 0 ? amortMonths : remainingMonths)
    }

    // ── 만기일시 ──────────────────────────────
    case '만기일시': {
      return calcBullet(balance, r, remainingMonths)
    }

    // ── 체증식 ────────────────────────────────
    case '체증식': {
      return calcGraduated(balance, r, remainingMonths, graduationRate, currentPayment)
    }

    default:
      return calcAnnuity(balance, r, remainingMonths)
  }
}

// ── 원리금균등 ─────────────────────────────────────────────
function calcAnnuity(balance: number, r: number, remainingMonths: number): LoanCalcResult {
  let monthlyPayment: number
  if (r === 0) {
    monthlyPayment = Math.round(balance / remainingMonths)
  } else {
    const factor = Math.pow(1 + r, remainingMonths)
    monthlyPayment = Math.round((balance * r * factor) / (factor - 1))
  }

  const schedule: MonthlyBreakdown[] = []
  let bal = balance
  let yearlyPrincipal = 0; let yearlyInterest = 0
  const months = Math.min(12, remainingMonths)

  for (let i = 1; i <= months; i++) {
    const interest = Math.round(bal * r)
    const isLast = i === months && remainingMonths <= 12
    const principal = isLast ? bal : Math.min(monthlyPayment - interest, bal)
    const payment = isLast ? bal + interest : monthlyPayment
    bal = Math.max(0, bal - principal)
    yearlyPrincipal += principal; yearlyInterest += interest
    schedule.push({ month: i, payment, principal, interest, balance: bal })
  }

  let totalInterest = 0; let fullBal = balance
  for (let i = 0; i < remainingMonths; i++) {
    const interest = Math.round(fullBal * r)
    const principal = i === remainingMonths - 1 ? fullBal : Math.min(monthlyPayment - interest, fullBal)
    totalInterest += interest
    fullBal = Math.max(0, fullBal - principal)
  }

  return {
    monthlyPayment,
    firstMonthPrincipal: Math.round(balance * r ? monthlyPayment - balance * r : monthlyPayment),
    firstMonthInterest: Math.round(balance * r),
    yearlyPayment: Math.round(monthlyPayment * months),
    yearlyPrincipal: Math.round(yearlyPrincipal),
    yearlyInterest: Math.round(yearlyInterest),
    balanceAfterYear: Math.round(schedule.at(-1)?.balance ?? 0),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(monthlyPayment * remainingMonths),
    payoffMonths: remainingMonths,
    schedule,
  }
}

// ── 원금균등 ───────────────────────────────────────────────
function calcPrincipalEqual(balance: number, r: number, remainingMonths: number): LoanCalcResult {
  const fixedPrincipal = Math.round(balance / remainingMonths)
  const schedule: MonthlyBreakdown[] = []
  let bal = balance
  let yearlyPrincipal = 0; let yearlyInterest = 0; let totalInterest = 0
  const months = Math.min(12, remainingMonths)

  for (let i = 1; i <= remainingMonths; i++) {
    const interest = Math.round(bal * r)
    const principal = i === remainingMonths ? bal : fixedPrincipal
    const payment = principal + interest
    totalInterest += interest
    bal = Math.max(0, bal - principal)
    if (i <= months) {
      yearlyPrincipal += principal; yearlyInterest += interest
      schedule.push({ month: i, payment, principal, interest, balance: bal })
    }
  }

  const firstInterest = Math.round(balance * r)
  return {
    monthlyPayment: fixedPrincipal + firstInterest,
    firstMonthPrincipal: fixedPrincipal,
    firstMonthInterest: firstInterest,
    yearlyPayment: schedule.reduce((s, m) => s + m.payment, 0),
    yearlyPrincipal: Math.round(yearlyPrincipal),
    yearlyInterest: Math.round(yearlyInterest),
    balanceAfterYear: Math.round(schedule.at(-1)?.balance ?? 0),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(balance + totalInterest),
    payoffMonths: remainingMonths,
    schedule,
    note: '원금균등: 매달 원금은 동일하고 이자가 줄어들어 월 납입액이 점차 감소합니다.',
  }
}

// ── 거치식 ─────────────────────────────────────────────────
function calcGrace(
  balance: number, r: number,
  remainingMonths: number, graceLeft: number, amortMonths: number
): LoanCalcResult {
  const schedule: MonthlyBreakdown[] = []
  let bal = balance
  let yearlyPrincipal = 0; let yearlyInterest = 0; let totalInterest = 0

  // 원금상환 시작 후 월 납입액 (원리금균등)
  let amortPayment = 0
  if (amortMonths > 0 && r > 0) {
    const factor = Math.pow(1 + r, amortMonths)
    amortPayment = Math.round((bal * r * factor) / (factor - 1))
  } else if (amortMonths > 0) {
    amortPayment = Math.round(bal / amortMonths)
  }

  // 거치기간 전체 이자 합산
  for (let i = 0; i < graceLeft; i++) totalInterest += Math.round(bal * r)

  // 원금상환 전체 이자 합산
  let amortBal = balance
  for (let i = 0; i < amortMonths; i++) {
    const interest = Math.round(amortBal * r)
    const principal = i === amortMonths - 1 ? amortBal : Math.min(amortPayment - interest, amortBal)
    totalInterest += interest
    amortBal = Math.max(0, amortBal - principal)
  }

  // 12개월 스케줄
  const months = Math.min(12, remainingMonths)
  let amortBal2 = balance
  let amortCount = 0

  for (let i = 1; i <= months; i++) {
    const inGrace = i <= graceLeft
    const interest = Math.round(bal * r)
    if (inGrace) {
      totalInterest += 0 // already counted
      yearlyInterest += interest
      schedule.push({ month: i, payment: interest, principal: 0, interest, balance: bal, note: '거치(이자만)' })
    } else {
      amortCount++
      const amortInterest = Math.round(amortBal2 * r)
      const isLastAmort = amortCount === amortMonths
      const principal = isLastAmort ? amortBal2 : Math.min(amortPayment - amortInterest, amortBal2)
      amortBal2 = Math.max(0, amortBal2 - principal)
      yearlyPrincipal += principal; yearlyInterest += amortInterest
      schedule.push({ month: i, payment: principal + amortInterest, principal, interest: amortInterest, balance: amortBal2 })
    }
  }

  const firstIsGrace = graceLeft > 0
  const firstInterest = Math.round(balance * r)
  return {
    monthlyPayment: firstIsGrace ? firstInterest : amortPayment,
    firstMonthPrincipal: firstIsGrace ? 0 : amortPayment - firstInterest,
    firstMonthInterest: firstInterest,
    yearlyPayment: schedule.reduce((s, m) => s + m.payment, 0),
    yearlyPrincipal: Math.round(yearlyPrincipal),
    yearlyInterest: Math.round(yearlyInterest),
    balanceAfterYear: Math.round(schedule.at(-1)?.balance ?? 0),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(balance + totalInterest),
    payoffMonths: remainingMonths,
    schedule,
    note: graceLeft > 0
      ? `거치기간 ${graceLeft}개월 남음 — 이자만 납부. 이후 원리금균등(${amortMonths}개월, 월 ${amortPayment.toLocaleString('ko-KR')}원)`
      : `거치기간 종료 — 원리금균등 상환 중`,
  }
}

// ── 만기일시 ───────────────────────────────────────────────
function calcBullet(balance: number, r: number, remainingMonths: number): LoanCalcResult {
  const monthlyInterest = Math.round(balance * r)
  const schedule: MonthlyBreakdown[] = []
  const months = Math.min(12, remainingMonths)

  for (let i = 1; i <= months; i++) {
    const isLast = i === months && remainingMonths <= 12
    const principal = isLast ? balance : 0
    const payment = principal + monthlyInterest
    schedule.push({ month: i, payment, principal, interest: monthlyInterest, balance: isLast ? 0 : balance, note: isLast ? '만기상환' : '이자만' })
  }

  const totalInterest = monthlyInterest * remainingMonths
  return {
    monthlyPayment: monthlyInterest,
    firstMonthPrincipal: 0,
    firstMonthInterest: monthlyInterest,
    yearlyPayment: monthlyInterest * months + (remainingMonths <= 12 ? balance : 0),
    yearlyPrincipal: remainingMonths <= 12 ? balance : 0,
    yearlyInterest: Math.round(monthlyInterest * months),
    balanceAfterYear: remainingMonths <= 12 ? 0 : balance,
    totalInterest,
    totalPayment: balance + totalInterest,
    payoffMonths: remainingMonths,
    schedule,
    note: `만기일시: 매달 이자(${monthlyInterest.toLocaleString('ko-KR')}원)만 납부 후 만기에 원금 일시 상환`,
  }
}

// ── 체증식 ─────────────────────────────────────────────────
function calcGraduated(
  balance: number, r: number, remainingMonths: number,
  graduationRate: number, currentPayment: number
): LoanCalcResult {
  // 체증식: 매년 graduationRate%씩 납입액 증가
  // 현재 납입액을 기준으로 12개월 스케줄 산출
  const schedule: MonthlyBreakdown[] = []
  let bal = balance
  let yearlyPrincipal = 0; let yearlyInterest = 0
  const months = Math.min(12, remainingMonths)
  const annualIncrease = (graduationRate || 0) / 100

  let payment = currentPayment > 0 ? currentPayment : Math.round(balance * r * 1.2) // 최소 이자보다 20% 많게

  for (let i = 1; i <= months; i++) {
    // 매 12개월마다 체증
    if (i > 1 && (i - 1) % 12 === 0) payment = Math.round(payment * (1 + annualIncrease))
    const interest = Math.round(bal * r)
    const principal = Math.max(0, payment - interest)
    bal = Math.max(0, bal - principal)
    yearlyPrincipal += principal; yearlyInterest += interest
    schedule.push({ month: i, payment: payment + (principal === 0 ? 0 : 0), principal, interest, balance: bal })
  }

  // 전체 이자 (근사치)
  let totalInterest = 0; let fullBal = balance; let fullPayment = currentPayment || payment
  for (let i = 0; i < remainingMonths && fullBal > 0; i++) {
    if (i > 0 && i % 12 === 0) fullPayment = Math.round(fullPayment * (1 + annualIncrease))
    const interest = Math.round(fullBal * r)
    const principal = Math.max(0, fullPayment - interest)
    totalInterest += interest
    fullBal = Math.max(0, fullBal - principal)
  }

  return {
    monthlyPayment: currentPayment || payment,
    firstMonthPrincipal: Math.max(0, (currentPayment || payment) - Math.round(balance * r)),
    firstMonthInterest: Math.round(balance * r),
    yearlyPayment: schedule.reduce((s, m) => s + m.payment, 0),
    yearlyPrincipal: Math.round(yearlyPrincipal),
    yearlyInterest: Math.round(yearlyInterest),
    balanceAfterYear: Math.round(schedule.at(-1)?.balance ?? 0),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(balance + totalInterest),
    payoffMonths: remainingMonths,
    schedule,
    note: `체증식: 매년 ${graduationRate || '?'}%씩 납입액 증가 (근사 계산). 정확한 금액은 은행 확인 필요.`,
  }
}

// ── 체증식 전용 헬퍼 ────────────────────────────────────────

/**
 * 체증식 대출 초기(1년차) 월 납입액 계산
 * 현재가치(PV) 방정식으로 PMT₁ 역산
 */
export function calcGraduatedInitialPayment(
  principal: number,
  annualRate: number,
  totalMonths: number,
  graduationRate: number,
): number {
  if (principal <= 0 || totalMonths <= 0) return 0
  const r = annualRate / 100 / 12
  const g = graduationRate / 100

  // PV = PMT₁ × Σ_{k=0}^{Y-1} (1+g)^k / (1+r)^(12k) × Σ_{m=1}^{min(12,n-12k)} (1+r)^{-m}
  let pvFactor = 0
  let yearStart = 0
  let yearIdx = 0
  while (yearStart < totalMonths) {
    const monthsInYear = Math.min(12, totalMonths - yearStart)
    const discountBase = r > 0 ? Math.pow(1 + r, yearStart) : 1
    const gradFactor = Math.pow(1 + g, yearIdx)
    let annuity = 0
    for (let m = 1; m <= monthsInYear; m++) {
      annuity += r > 0 ? 1 / Math.pow(1 + r, m) : 1
    }
    pvFactor += gradFactor * (annuity / discountBase)
    yearStart += 12
    yearIdx++
  }
  if (pvFactor <= 0) return 0
  return Math.round(principal / pvFactor)
}

/**
 * 실행일 기준으로 현재 연도차를 구해 현재 납입액 반환
 * startDate: "YYYY-MM"
 */
export function calcGraduatedCurrentPayment(
  initialPayment: number,
  startDate: string,
  graduationRate: number,
): number {
  if (!startDate) return initialPayment
  const [sy, sm] = startDate.split('-').map(Number)
  const now = new Date()
  const elapsedMonths = (now.getFullYear() - sy) * 12 + (now.getMonth() + 1 - sm)
  const elapsedYears = Math.max(0, Math.floor(elapsedMonths / 12))
  return Math.round(initialPayment * Math.pow(1 + graduationRate / 100, elapsedYears))
}

/**
 * 실행일 기준으로 현재까지 상환한 후의 잔여잔액 계산
 */
export function calcGraduatedRemainingBalance(
  principal: number,
  annualRate: number,
  totalMonths: number,
  graduationRate: number,
  startDate: string,
): number {
  if (!startDate || principal <= 0) return principal
  const r = annualRate / 100 / 12
  const g = graduationRate / 100
  const initialPayment = calcGraduatedInitialPayment(principal, annualRate, totalMonths, graduationRate)

  const [sy, sm] = startDate.split('-').map(Number)
  const now = new Date()
  const elapsedMonths = Math.max(0, (now.getFullYear() - sy) * 12 + (now.getMonth() + 1 - sm))

  let balance = principal
  let payment = initialPayment
  for (let i = 0; i < Math.min(elapsedMonths, totalMonths); i++) {
    if (i > 0 && i % 12 === 0) payment = Math.round(payment * (1 + g))
    const interest = Math.round(balance * r)
    const princ = Math.max(0, payment - interest)
    balance = Math.max(0, balance - princ)
  }
  return Math.round(balance)
}

/**
 * 실행일 + 총기간으로 잔여개월 계산
 */
export function calcRemainingMonths(startDate: string, totalMonths: number): number {
  if (!startDate) return totalMonths
  const [sy, sm] = startDate.split('-').map(Number)
  const now = new Date()
  const elapsedMonths = (now.getFullYear() - sy) * 12 + (now.getMonth() + 1 - sm)
  return Math.max(0, totalMonths - elapsedMonths)
}

/**
 * 체증식 연도별 납입액 표 생성
 */
export interface GraduatedYearRow {
  year: number          // 1년차, 2년차...
  payment: number       // 해당 연도 월 납입액
  months: number        // 해당 연도 납입 개월 수
  yearlyTotal: number
  yearlyPrincipal: number
  yearlyInterest: number
  endBalance: number
}

export function calcGraduatedSchedule(
  principal: number,
  annualRate: number,
  totalMonths: number,
  graduationRate: number,
): GraduatedYearRow[] {
  const r = annualRate / 100 / 12
  const g = graduationRate / 100
  const initialPayment = calcGraduatedInitialPayment(principal, annualRate, totalMonths, graduationRate)
  const rows: GraduatedYearRow[] = []

  let balance = principal
  let payment = initialPayment
  let monthsDone = 0

  while (monthsDone < totalMonths && balance > 0) {
    const year = Math.floor(monthsDone / 12) + 1
    const monthsInYear = Math.min(12, totalMonths - monthsDone)
    let yearlyPrincipal = 0; let yearlyInterest = 0

    for (let m = 0; m < monthsInYear; m++) {
      const interest = Math.round(balance * r)
      const princ = Math.max(0, payment - interest)
      balance = Math.max(0, balance - princ)
      yearlyPrincipal += princ
      yearlyInterest += interest
    }

    rows.push({
      year,
      payment,
      months: monthsInYear,
      yearlyTotal: yearlyPrincipal + yearlyInterest,
      yearlyPrincipal,
      yearlyInterest,
      endBalance: balance,
    })

    monthsDone += monthsInYear
    payment = Math.round(payment * (1 + g))
  }

  return rows
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
