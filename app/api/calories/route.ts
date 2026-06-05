import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface CaloriesRequest {
  name: string
  amount?: string
  apiKey?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CaloriesRequest
    const { name, amount, apiKey } = body

    const key = process.env.ANTHROPIC_API_KEY ?? apiKey ?? ''

    if (!key) {
      return NextResponse.json({ error: 'API 키가 필요합니다.' }, { status: 400 })
    }

    const amountStr = amount ? ` (${amount})` : ''
    const prompt = `다음 음식의 칼로리를 숫자만 답해주세요. 단위 없이 숫자만.

음식: ${name}${amountStr}

만약 양이 명시되지 않았다면 일반적인 1인분 기준으로 답해주세요.
숫자만 답하세요 (예: 350)`

    const client = new Anthropic({ apiKey: key })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: '응답 형식이 올바르지 않습니다.' }, { status: 500 })
    }

    const calories = parseInt(content.text.replace(/[^0-9]/g, ''), 10)
    if (isNaN(calories)) {
      return NextResponse.json({ error: '칼로리를 추정할 수 없습니다.' }, { status: 400 })
    }

    return NextResponse.json({ calories })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
