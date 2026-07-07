import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Expense, BudgetSettings } from '@/lib/types'
import { BUDGET_CATEGORIES } from '@/lib/constants'

interface MonthlyFeedbackRequest {
  expenses: Expense[]
  yearMonth: string // "YYYY-MM"
  settings: BudgetSettings
  apiKey?: string
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MonthlyFeedbackRequest
    const { expenses, yearMonth, settings, apiKey: bodyApiKey } = body

    const apiKey = process.env.ANTHROPIC_API_KEY ?? bodyApiKey ?? ''

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다. 설정 페이지에서 Anthropic API 키를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (expenses.length === 0) {
      return NextResponse.json({ error: '이번달 지출 내역이 없습니다.' }, { status: 400 })
    }

    const [year, month] = yearMonth.split('-')
    const override = settings.monthlyOverrides?.[yearMonth]
    const income = override?.income ?? settings.monthlyIncome
    const savingsGoal = override?.savingsGoal ?? settings.monthlySavingsGoal
    const effectiveBudgets = { ...settings.categoryBudgets, ...(override?.categoryBudgets ?? {}) }

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
    const fixedTotal = expenses.filter(e => e.isFixed).reduce((s, e) => s + e.amount, 0)
    const variableTotal = totalSpent - fixedTotal
    const totalBudget = Object.values(effectiveBudgets).reduce((a, b) => a + b, 0)
    const totalLoanPayment = (settings.loans ?? []).reduce((s, l) => s + l.monthlyPayment, 0)
    const expectedSavings = income - totalSpent - totalLoanPayment

    const impulseExpenses = expenses.filter(e => e.purchaseType === 'impulse')
    const plannedTotal = expenses.filter(e => e.purchaseType === 'planned').reduce((s, e) => s + e.amount, 0)
    const essentialTotal = expenses.filter(e => e.purchaseType === 'essential').reduce((s, e) => s + e.amount, 0)
    const impulseTotal = impulseExpenses.reduce((s, e) => s + e.amount, 0)

    const categoryTotals: Record<string, number> = {}
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount
    })

    const categoryLines = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => {
        const budget = effectiveBudgets[cat] ?? 0
        const catInfo = BUDGET_CATEGORIES.find(c => c.id === cat)
        const label = catInfo?.label ?? cat
        if (budget > 0) {
          const pct = Math.round((amount / budget) * 100)
          return `  - ${label}: ${fmt(amount)} (월 예산 ${fmt(budget)}의 ${pct}%${amount > budget ? ' — 초과' : ''})`
        }
        return `  - ${label}: ${fmt(amount)}`
      })
      .join('\n')

    const impulseLines = impulseExpenses
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((e, i) => `  ${i + 1}. [${e.category}] ${e.name} - ${fmt(e.amount)}${e.reason ? ` (사유: ${e.reason})` : ''}`)
      .join('\n')

    const prompt = `당신은 친근하고 실용적인 가계부 코치입니다. 사용자의 ${year}년 ${month}월 한달치 지출 내역 전체를 분석하고, 따뜻하지만 솔직한 월간 피드백을 한국어로 작성해주세요.

## 이번달 소득 및 예산
- 월 순수입: ${fmt(income)}
- 저축 목표: ${fmt(savingsGoal)}
- 총 지출: ${fmt(totalSpent)} (${expenses.length}건, 총 예산 ${totalBudget > 0 ? fmt(totalBudget) : '미설정'})
- 고정비: ${fmt(fixedTotal)} / 변동비: ${fmt(variableTotal)}
${totalLoanPayment > 0 ? `- 월 대출 상환액: ${fmt(totalLoanPayment)}\n` : ''}- 예상 저축액: ${fmt(expectedSavings)} (목표 ${fmt(savingsGoal)} 대비 ${expectedSavings >= savingsGoal ? '달성' : '미달'})

## 구매 유형별 분석
- 계획구매: ${fmt(plannedTotal)}
- 필수지출: ${fmt(essentialTotal)}
- 충동구매: ${fmt(impulseTotal)} (${impulseExpenses.length}건)

## 카테고리별 지출 (예산 대비)
${categoryLines}

## 충동구매 내역 (금액 큰 순)
${impulseLines || '없음'}

---

**📊 이번달 총평**
(3-4문장으로 이번달 전체 소비 패턴과 저축 목표 달성 여부를 종합 평가)

**⚠️ 예산 초과 / 과소비 카테고리**
• (예산 대비 많이 쓴 카테고리와 원인 추정)

**⚡ 충동구매 패턴 분석**
• (충동구매 경향과 트리거 분석)

**✅ 잘한 점**
• (칭찬할 만한 소비 습관)

**💰 저축률 개선 방안**
• (다음달 저축 목표 달성을 위한 구체적 행동 2-3가지)

**🎯 다음달 예산 조정 제안**
• (카테고리별 구체적인 예산 조정안)

마크다운 굵은 글씨와 불릿 포인트를 사용하되, 답변은 한국어로만 작성하세요.`

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const feedbackText = message.content[0].type === 'text' ? message.content[0].text : '피드백을 생성할 수 없습니다.'
    return NextResponse.json({ feedback: feedbackText })
  } catch (error) {
    console.error('월간 피드백 생성 오류:', error)
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: `월간 피드백 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  }
}
