import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Activity } from '@/lib/types'

interface FeedbackRequest {
  date: string
  activities: Activity[]
  apiKey?: string
}

function getDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) diff += 24 * 60
  return diff
}

function formatDurationStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

function timeToMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackRequest
    const { date, activities, apiKey } = body

    const resolvedApiKey = process.env.ANTHROPIC_API_KEY || apiKey || ''

    if (!resolvedApiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 400 })
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json({ error: '활동 데이터가 없습니다.' }, { status: 400 })
    }

    const categoryTotals: Record<string, number> = {}
    for (const act of activities) {
      const dur = getDurationMinutes(act.startTime, act.endTime)
      categoryTotals[act.category] = (categoryTotals[act.category] || 0) + dur
    }

    const activityLines = activities
      .slice()
      .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime))
      .map(act => {
        const dur = formatDurationStr(getDurationMinutes(act.startTime, act.endTime))
        return `- ${act.name} (${act.category}) | ${act.startTime} ~ ${act.endTime} | ${dur}`
      })
      .join('\n')

    const categoryLines = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, mins]) => `- ${cat}: ${formatDurationStr(mins)}`)
      .join('\n')

    const [y, m, d] = date.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const formattedDate = `${y}년 ${m}월 ${d}일 ${days[dateObj.getDay()]}`

    const prompt = `당신은 생산성 코치입니다. 사용자의 하루 일정을 분석하고 한국어로 피드백을 제공해주세요.

날짜: ${formattedDate}

활동 목록:
${activityLines}

카테고리별 총 시간:
${categoryLines}

다음 형식으로 한국어로 응답해주세요:

**오늘 하루 총평**
(오늘 하루에 대한 전반적인 평가를 2문장으로 작성해주세요)

**시간 배분 분석**
(어떤 카테고리에 많이/적게 시간을 썼는지 분석해주세요)

**개선 제안**
(더 균형잡힌 하루를 위한 구체적인 팁 2가지를 제안해주세요)
`

    const client = new Anthropic({ apiKey: resolvedApiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
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
