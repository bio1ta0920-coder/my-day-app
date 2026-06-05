import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MealRecord, ExerciseItem, HealthSettings } from '@/lib/types'
import { MEAL_TIME_LABELS, INTENSITY_LABELS } from '@/lib/constants'

interface FeedbackRequestBody {
  date: string
  meals: MealRecord[]
  exercises: ExerciseItem[]
  weight: number | null
  settings: HealthSettings
  apiKey?: string
}

function buildPrompt(
  date: string,
  meals: MealRecord[],
  exercises: ExerciseItem[],
  weight: number | null,
  settings: HealthSettings
): string {
  const totalCaloriesEaten = meals.reduce(
    (sum, meal) => sum + meal.foods.reduce((s, f) => s + f.calories, 0),
    0
  )

  const mealLines = meals
    .filter(m => m.foods.length > 0)
    .map(m => {
      const label = MEAL_TIME_LABELS[m.mealTime]?.label ?? m.mealTime
      const foods = m.foods.map(f => `  - ${f.name} (${f.amount}, ${f.calories}kcal)`).join('\n')
      const subtotal = m.foods.reduce((s, f) => s + f.calories, 0)
      return `[${label}] 소계: ${subtotal}kcal\n${foods}`
    })
    .join('\n\n')

  const exerciseLines =
    exercises.length === 0
      ? '없음'
      : exercises
          .map(e => {
            const intensity = INTENSITY_LABELS[e.intensity]?.label ?? e.intensity
            const cal = e.calories > 0 ? `, 소모 ${e.calories}kcal` : ''
            return `  - ${e.name} (${e.category}, ${e.duration}분, 강도: ${intensity}${cal})`
          })
          .join('\n')

  const weightLine = weight ? `체중: ${weight}kg` : '체중: 미기록'
  const targetLine = `일일 목표 칼로리: ${settings.targetCalories}kcal`
  const diff = totalCaloriesEaten - settings.targetCalories
  const diffLine = diff > 0 ? `목표 대비 ${diff}kcal 초과` : `목표 대비 ${Math.abs(diff)}kcal 부족`

  return `당신은 친근하고 전문적인 한국어 다이어트 & 운동 코치입니다.
아래는 사용자의 오늘(${date}) 기록입니다.

=== 식단 기록 ===
${mealLines || '기록 없음'}

오늘 총 섭취 칼로리: ${totalCaloriesEaten}kcal
${targetLine}
${diffLine}

=== 운동 기록 ===
${exerciseLines}

=== 신체 정보 ===
${weightLine}
${settings.targetWeight ? `목표 체중: ${settings.targetWeight}kg` : ''}

위 내용을 바탕으로 다음 형식으로 한국어 피드백을 작성해주세요.
친근하고 격려하는 말투로, 구체적이고 실용적인 조언을 주세요.

**오늘 총평**
• (오늘 하루 전체적인 평가 2문장)

**식단 피드백**
• 잘한 점: (구체적으로)
• 개선할 점: (구체적으로)

**운동 피드백**
• 잘한 점: (구체적으로)
• 개선할 점: (구체적으로)

**내일 추천**
• 식단: (추천 식단 1가지와 이유)
• 운동: (추천 운동 1가지와 이유)

bullet(•)과 **볼드** 형식을 그대로 사용해 주세요. 마크다운 헤더(#)는 사용하지 마세요.`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackRequestBody
    const { date, meals, exercises, weight, settings, apiKey } = body

    const key = process.env.ANTHROPIC_API_KEY ?? apiKey
    if (!key) {
      return NextResponse.json(
        { error: 'API 키가 없습니다. 설정에서 Claude API 키를 입력해주세요.' },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey: key })
    const prompt = buildPrompt(date, meals, exercises, weight, settings)

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    return NextResponse.json({ feedback: content.text })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
