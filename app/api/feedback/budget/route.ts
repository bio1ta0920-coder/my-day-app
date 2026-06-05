import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Expense, BudgetSettings } from '@/lib/types'
import { BUDGET_CATEGORIES, PURCHASE_TYPE_LABELS } from '@/lib/constants'

interface FeedbackRequest {
  expenses: Expense[]
  date: string
  settings: BudgetSettings
  apiKey?: string
}

function sumByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})
}

function formatDateKr(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}`
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackRequest
    const { expenses, date, settings, apiKey: bodyApiKey } = body

    const apiKey = process.env.ANTHROPIC_API_KEY ?? bodyApiKey ?? ''

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다. 설정 페이지에서 Anthropic API 키를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (expenses.length === 0) {
      return NextResponse.json({ error: '지출 내역이 없습니다.' }, { status: 400 })
    }

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
    const categoryTotals = sumByCategory(expenses)
    const impulseTotal = expenses.filter(e => e.purchaseType === 'impulse').reduce((s, e) => s + e.amount, 0)
    const plannedTotal = expenses.filter(e => e.purchaseType === 'planned').reduce((s, e) => s + e.amount, 0)
    const essentialTotal = expenses.filter(e => e.purchaseType === 'essential').reduce((s, e) => s + e.amount, 0)

    const [year, month] = date.split('-')
    const monthKey = `${year}-${month}`
    const override = settings.monthlyOverrides?.[monthKey]
    const effectiveBudgets = {
      ...settings.categoryBudgets,
      ...(override?.categoryBudgets ?? {}),
    }
    const dailyBudget = Math.floor(
      ((override?.income ?? settings.monthlyIncome) - (override?.savingsGoal ?? settings.monthlySavingsGoal)) /
      new Date(parseInt(year), parseInt(month), 0).getDate()
    )

    const categoryLines = Object.entries(categoryTotals)
      .map(([cat, amount]) => {
        const budget = effectiveBudgets[cat] ?? 0
        const catInfo = BUDGET_CATEGORIES.find(c => c.id === cat)
        const label = catInfo?.label ?? cat
        if (budget > 0) {
          const pct = Math.round((amount / budget) * 100)
          return `  - ${label}: ${fmt(amount)} (월 예산 ${fmt(budget)}의 ${pct}% 사용)`
        }
        return `  - ${label}: ${fmt(amount)}`
      })
      .join('\n')

    const expenseLines = expenses
      .map((e, i) => {
        const typeLabel = PURCHASE_TYPE_LABELS[e.purchaseType] ?? e.purchaseType
        const parts = [
          `${i + 1}. [${e.category}] ${e.name}`,
          e.merchant ? `(${e.merchant})` : '',
          `${fmt(e.amount)}`,
          `- ${typeLabel}`,
          e.card ? `/ ${e.card}` : '',
          e.reason ? `/ 구매이유: ${e.reason}` : '',
        ]
        return parts.filter(Boolean).join(' ')
      })
      .join('\n')

    const prompt = `당신은 친근하고 실용적인 가계부 코치입니다. 사용자의 오늘 소비 내역을 분석하고 따뜻하지만 솔직한 피드백을 한국어로 작성해주세요.

## 오늘 날짜
${formatDateKr(date)}

## 오늘 소비 요약
- 총 지출: ${fmt(totalSpent)}
- 하루 권장 예산: ${fmt(dailyBudget)}
- 예산 대비: ${dailyBudget > 0 ? (totalSpent > dailyBudget ? `초과 (${fmt(totalSpent - dailyBudget)} 초과)` : `여유 있음 (${fmt(dailyBudget - totalSpent)} 남음)`) : '미설정'}

## 구매 유형별 분석
- 계획구매: ${fmt(plannedTotal)} (${expenses.filter(e => e.purchaseType === 'planned').length}건)
- 충동구매: ${fmt(impulseTotal)} (${expenses.filter(e => e.purchaseType === 'impulse').length}건)
- 필수지출: ${fmt(essentialTotal)} (${expenses.filter(e => e.purchaseType === 'essential').length}건)

## 카테고리별 지출
${categoryLines}

## 오늘 지출 항목 전체
${expenseLines}

---

**📊 오늘 소비 총평**
(2-3문장으로 오늘 소비 패턴의 전반적인 평가)

**✅ 잘한 점**
• (구체적으로 칭찬할 만한 소비 행동)

**💡 아쉬운 점**
• (개선이 필요한 부분, 구체적으로)

**🎯 내일을 위한 팁**
• (내일 실천 가능한 구체적인 행동 조언 1-2가지)

마크다운 굵은 글씨와 불릿 포인트를 사용하되, 답변은 한국어로만 작성하세요.`

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const feedbackText = message.content[0].type === 'text' ? message.content[0].text : '피드백을 생성할 수 없습니다.'
    return NextResponse.json({ feedback: feedbackText })
  } catch (error) {
    console.error('피드백 생성 오류:', error)
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: `피드백 생성 중 오류가 발생했습니다: ${message}` }, { status: 500 })
  }
}
