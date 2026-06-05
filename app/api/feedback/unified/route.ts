import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface UnifiedFeedbackRequest {
  budgetSummary: string
  healthSummary: string
  plannerSummary: string
  date: string
  apiKey?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UnifiedFeedbackRequest
    const { budgetSummary, healthSummary, plannerSummary, date, apiKey } = body

    const resolvedApiKey = process.env.ANTHROPIC_API_KEY || apiKey || ''

    if (!resolvedApiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 400 })
    }

    const [y, m, d] = date.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const formattedDate = `${y}년 ${m}월 ${d}일 ${days[dateObj.getDay()]}`

    const prompt = `당신은 라이프스타일 코치입니다. 사용자의 오늘 하루 전체를 종합적으로 분석해주세요.

날짜: ${formattedDate}

## 💰 가계부 요약
${budgetSummary}

## 🏃 헬스 요약
${healthSummary}

## 📅 일과표 요약
${plannerSummary}

위 세 가지 영역을 종합적으로 분석하고 한국어로 피드백을 작성해주세요.
가능하면 영역 간의 상관관계를 찾아주세요. 예를 들어:
- 바쁜 날에 충동구매가 늘었는지
- 운동한 날 식비가 달라지는지
- 일정이 많을 때 식단이 어떻게 되는지

**✨ 오늘 하루 종합 총평**
(3가지 영역을 통합적으로 평가, 2-3문장)

**🔗 연결 분석**
(소비-건강-시간 사용 간의 패턴이나 상관관계 발견, 없으면 각 영역 간략 평가)

**💡 내일을 위한 통합 조언**
• (가계부 + 헬스 + 일정 관리를 연계한 실용적 팁 2가지)

한국어로만 작성하고, **볼드**와 • 불릿을 사용해주세요.`

    const client = new Anthropic({ apiKey: resolvedApiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: '응답 형식이 올바르지 않습니다.' }, { status: 500 })
    }

    return NextResponse.json({ feedback: content.text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
