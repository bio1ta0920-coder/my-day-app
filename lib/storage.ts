import type {
  BudgetDayRecord,
  BudgetSettings,
  HealthDayRecord,
  HealthSettings,
  MealRecord,
  ExerciseItem,
  PlannerDayRecord,
  PlannerSettings,
  PlannerCategory,
  StudyDayRecord,
  StudySettings,
  StudySession,
  BookRecord,
} from './types'
import { DEFAULT_BUDGETS, PLANNER_CATEGORIES, DEFAULT_STUDY_SUBJECTS } from './constants'
import { pushToCloud } from './sync'

const isBrowser = typeof window !== 'undefined'

// ──────────────────────────────────────────
// 가계부 Storage
// ──────────────────────────────────────────

const BUDGET_RECORDS_KEY = 'gaegyebu_records'
const BUDGET_SETTINGS_KEY = 'gaegyebu_settings'
const BUDGET_API_KEY_KEY = 'gaegyebu_api_key'

const defaultBudgetSettings: BudgetSettings = {
  monthlyIncome: 3000000,
  monthlySavingsGoal: 500000,
  categoryBudgets: { ...DEFAULT_BUDGETS },
  monthlyOverrides: {},
}

export function getBudgetRecord(date: string): BudgetDayRecord | null {
  if (!isBrowser) return null
  try {
    const all = getAllBudgetRecords()
    return all[date] ?? null
  } catch {
    return null
  }
}

export function saveBudgetRecord(record: BudgetDayRecord): void {
  if (!isBrowser) return
  try {
    const all = getAllBudgetRecords()
    all[record.date] = record
    const value = JSON.stringify(all)
    localStorage.setItem(BUDGET_RECORDS_KEY, value)
    pushToCloud(BUDGET_RECORDS_KEY, value)
  } catch (e) {
    console.error('가계부 기록 저장 실패:', e)
  }
}

export function getAllBudgetRecords(): Record<string, BudgetDayRecord> {
  if (!isBrowser) return {}
  try {
    const raw = localStorage.getItem(BUDGET_RECORDS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, BudgetDayRecord>
  } catch {
    return {}
  }
}

export function getBudgetSettings(): BudgetSettings {
  if (!isBrowser) return { ...defaultBudgetSettings }
  try {
    const raw = localStorage.getItem(BUDGET_SETTINGS_KEY)
    if (!raw) return { ...defaultBudgetSettings }
    const saved = JSON.parse(raw) as Partial<BudgetSettings>
    return {
      ...defaultBudgetSettings,
      ...saved,
      categoryBudgets: {
        ...defaultBudgetSettings.categoryBudgets,
        ...(saved.categoryBudgets ?? {}),
      },
      monthlyOverrides: saved.monthlyOverrides ?? {},
    }
  } catch {
    return { ...defaultBudgetSettings }
  }
}

export function saveBudgetSettings(settings: BudgetSettings): void {
  if (!isBrowser) return
  try {
    const value = JSON.stringify(settings)
    localStorage.setItem(BUDGET_SETTINGS_KEY, value)
    pushToCloud(BUDGET_SETTINGS_KEY, value)
  } catch (e) {
    console.error('가계부 설정 저장 실패:', e)
  }
}

export function getApiKey(): string {
  if (!isBrowser) return ''
  try {
    return (
      localStorage.getItem('unified_api_key') ??
      localStorage.getItem(BUDGET_API_KEY_KEY) ??
      ''
    )
  } catch {
    return ''
  }
}

export function saveApiKey(key: string): void {
  if (!isBrowser) return
  try {
    localStorage.setItem('unified_api_key', key)
    localStorage.setItem(BUDGET_API_KEY_KEY, key)
    pushToCloud('unified_api_key', key)
  } catch (e) {
    console.error('API 키 저장 실패:', e)
  }
}

export function getEffectiveBudgetSettings(yearMonth: string): {
  income: number
  savingsGoal: number
  categoryBudgets: Record<string, number>
} {
  const settings = getBudgetSettings()
  const override = settings.monthlyOverrides[yearMonth]
  return {
    income: override?.income ?? settings.monthlyIncome,
    savingsGoal: override?.savingsGoal ?? settings.monthlySavingsGoal,
    categoryBudgets: {
      ...settings.categoryBudgets,
      ...(override?.categoryBudgets ?? {}),
    },
  }
}

// ──────────────────────────────────────────
// 헬스 Storage
// ──────────────────────────────────────────

const HEALTH_RECORDS_KEY = 'health_diary_records'
const HEALTH_SETTINGS_KEY = 'health_diary_settings'

const defaultHealthSettings: HealthSettings = {
  targetCalories: 2000,
  targetWeight: 0,
  currentWeight: 0,
  targetExerciseDays: 3,
  favoriteFoods: [],
  favoriteExercises: [],
  weightLog: [],
}

export function getHealthRecord(date: string): HealthDayRecord | null {
  if (!isBrowser) return null
  try {
    const all = getAllHealthRecords()
    return all[date] ?? null
  } catch {
    return null
  }
}

export function saveHealthRecord(record: HealthDayRecord): void {
  if (!isBrowser) return
  try {
    const all = getAllHealthRecords()
    all[record.date] = record
    const value = JSON.stringify(all)
    localStorage.setItem(HEALTH_RECORDS_KEY, value)
    pushToCloud(HEALTH_RECORDS_KEY, value)
  } catch (e) {
    console.error('헬스 기록 저장 실패:', e)
  }
}

export function getAllHealthRecords(): Record<string, HealthDayRecord> {
  if (!isBrowser) return {}
  try {
    const raw = localStorage.getItem(HEALTH_RECORDS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, HealthDayRecord>
  } catch {
    return {}
  }
}

export function getHealthSettings(): HealthSettings {
  if (!isBrowser) return { ...defaultHealthSettings }
  try {
    const raw = localStorage.getItem(HEALTH_SETTINGS_KEY)
    if (!raw) return { ...defaultHealthSettings }
    const parsed = JSON.parse(raw) as Partial<HealthSettings>
    return { ...defaultHealthSettings, ...parsed }
  } catch {
    return { ...defaultHealthSettings }
  }
}

export function saveHealthSettings(settings: HealthSettings): void {
  if (!isBrowser) return
  try {
    const value = JSON.stringify(settings)
    localStorage.setItem(HEALTH_SETTINGS_KEY, value)
    pushToCloud(HEALTH_SETTINGS_KEY, value)
  } catch (e) {
    console.error('헬스 설정 저장 실패:', e)
  }
}

// ──────────────────────────────────────────
// 일과표 Storage
// ──────────────────────────────────────────

const PLANNER_SETTINGS_KEY = 'settings'

export function getPlannerRecord(date: string): PlannerDayRecord | null {
  if (!isBrowser) return null
  try {
    const raw = localStorage.getItem(`record_${date}`)
    if (!raw) return null
    return JSON.parse(raw) as PlannerDayRecord
  } catch {
    return null
  }
}

export function savePlannerRecord(record: PlannerDayRecord): void {
  if (!isBrowser) return
  try {
    const key = `record_${record.date}`
    const value = JSON.stringify(record)
    localStorage.setItem(key, value)
    pushToCloud(key, value)
  } catch (e) {
    console.error('일과표 기록 저장 실패:', e)
  }
}

export function getAllPlannerRecords(): Record<string, PlannerDayRecord> {
  if (!isBrowser) return {}
  try {
    const result: Record<string, PlannerDayRecord> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('record_')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const record = JSON.parse(raw) as PlannerDayRecord
          result[record.date] = record
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function getPlannerSettings(): PlannerSettings {
  if (!isBrowser) return { customCategories: [] }
  try {
    const raw = localStorage.getItem(PLANNER_SETTINGS_KEY)
    if (!raw) return { customCategories: [] }
    const parsed = JSON.parse(raw) as { apiKey?: string; customCategories?: PlannerCategory[] }
    return { customCategories: parsed.customCategories ?? [] }
  } catch {
    return { customCategories: [] }
  }
}

export function savePlannerSettings(settings: PlannerSettings): void {
  if (!isBrowser) return
  try {
    const existing = isBrowser ? localStorage.getItem(PLANNER_SETTINGS_KEY) : null
    const parsed = existing ? (JSON.parse(existing) as Record<string, unknown>) : {}
    const value = JSON.stringify({ ...parsed, ...settings })
    localStorage.setItem(PLANNER_SETTINGS_KEY, value)
    pushToCloud(PLANNER_SETTINGS_KEY, value)
  } catch (e) {
    console.error('일과표 설정 저장 실패:', e)
  }
}

export function getAllPlannerCategories(): { id: string; label: string; color: string; emoji: string }[] {
  const settings = getPlannerSettings()
  return [...PLANNER_CATEGORIES, ...settings.customCategories]
}

// ──────────────────────────────────────────
// 공통 유틸
// ──────────────────────────────────────────

export function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${y}년 ${m}월 ${d}일 ${days[date.getDay()]}요일`
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function getDuration(start: string, end: string): number {
  let diff = timeToMinutes(end) - timeToMinutes(start)
  if (diff <= 0) diff += 24 * 60
  return diff
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

// ──────────────────────────────────────────
// 헬스 → 일과표 동기화
// ──────────────────────────────────────────

const MEAL_LABELS: Record<string, string> = {
  breakfast: '아침 식사',
  lunch: '점심 식사',
  dinner: '저녁 식사',
  snack: '간식',
}

const MEAL_DURATION: Record<string, number> = {
  breakfast: 30,
  lunch: 40,
  dinner: 40,
  snack: 20,
}

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + mins) % (24 * 60)
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function syncHealthMealsToPlanner(date: string, meals: MealRecord[]): void {
  if (!isBrowser) return
  try {
    const existing = getPlannerRecord(date) ?? {
      date,
      activities: [],
      feedback: null,
      reflection: null,
    }

    // 기존 meal_sync_ 항목 제거
    const kept = existing.activities.filter(a => !a.id.startsWith('meal_sync_'))

    // 시간이 입력된 식사만 활동으로 추가
    const mealActivities: PlannerDayRecord['activities'] = []
    for (const meal of meals) {
      if (!meal.time || meal.foods.length === 0) continue
      const endTime = meal.endTime || addMinutesToTime(meal.time, MEAL_DURATION[meal.mealTime] ?? 30)
      mealActivities.push({
        id: `meal_sync_${meal.mealTime}`,
        name: MEAL_LABELS[meal.mealTime] ?? '식사',
        category: '식사',
        startTime: meal.time,
        endTime,
        color: '#fdba74',
        notes: meal.foods.map(f => f.name).join(', '),
      })
    }

    savePlannerRecord({ ...existing, activities: [...kept, ...mealActivities] })
  } catch {
    // ignore
  }
}

export function syncHealthExercisesToPlanner(date: string, exercises: ExerciseItem[]): void {
  if (!isBrowser) return
  try {
    const existing = getPlannerRecord(date) ?? {
      date,
      activities: [],
      feedback: null,
      reflection: null,
    }

    // 기존 exercise_sync_ 항목 제거
    const kept = existing.activities.filter(a => !a.id.startsWith('exercise_sync_'))

    // startTime이 있는 운동만 활동으로 추가
    const exerciseActivities: PlannerDayRecord['activities'] = []
    for (const ex of exercises) {
      if (!ex.startTime) continue
      exerciseActivities.push({
        id: `exercise_sync_${ex.id}`,
        name: ex.name,
        category: '운동',
        startTime: ex.startTime,
        endTime: addMinutesToTime(ex.startTime, ex.duration),
        color: '#86efac',
        notes: ex.notes,
      })
    }

    savePlannerRecord({ ...existing, activities: [...kept, ...exerciseActivities] })
  } catch {
    // ignore
  }
}

// ──────────────────────────────────────────
// 스터디 Storage
// ──────────────────────────────────────────

const STUDY_RECORDS_KEY = 'study_records'
const STUDY_SETTINGS_KEY = 'study_settings'

const defaultStudySettings: StudySettings = {
  subjects: DEFAULT_STUDY_SUBJECTS,
  exams: [],
  dailyGoalMinutes: 120,
  pomodoroMinutes: 25,
  breakMinutes: 5,
}

export function getStudyRecord(date: string): StudyDayRecord {
  if (!isBrowser) return { date, sessions: [], tasks: [] }
  try {
    const all = getAllStudyRecords()
    return all[date] ?? { date, sessions: [], tasks: [] }
  } catch {
    return { date, sessions: [], tasks: [] }
  }
}

export function saveStudyRecord(record: StudyDayRecord): void {
  if (!isBrowser) return
  try {
    const all = getAllStudyRecords()
    all[record.date] = record
    const value = JSON.stringify(all)
    localStorage.setItem(STUDY_RECORDS_KEY, value)
    pushToCloud(STUDY_RECORDS_KEY, value)
  } catch (e) {
    console.error('스터디 기록 저장 실패:', e)
  }
}

export function getAllStudyRecords(): Record<string, StudyDayRecord> {
  if (!isBrowser) return {}
  try {
    const raw = localStorage.getItem(STUDY_RECORDS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, StudyDayRecord>
  } catch {
    return {}
  }
}

export function getStudySettings(): StudySettings {
  if (!isBrowser) return { ...defaultStudySettings, subjects: [...DEFAULT_STUDY_SUBJECTS], exams: [] }
  try {
    const raw = localStorage.getItem(STUDY_SETTINGS_KEY)
    if (!raw) return { ...defaultStudySettings, subjects: [...DEFAULT_STUDY_SUBJECTS], exams: [] }
    const parsed = JSON.parse(raw) as Partial<StudySettings>
    return {
      ...defaultStudySettings,
      ...parsed,
      subjects: parsed.subjects?.length ? parsed.subjects : [...DEFAULT_STUDY_SUBJECTS],
      exams: parsed.exams ?? [],
    }
  } catch {
    return { ...defaultStudySettings, subjects: [...DEFAULT_STUDY_SUBJECTS], exams: [] }
  }
}

export function saveStudySettings(settings: StudySettings): void {
  if (!isBrowser) return
  try {
    const value = JSON.stringify(settings)
    localStorage.setItem(STUDY_SETTINGS_KEY, value)
    pushToCloud(STUDY_SETTINGS_KEY, value)
  } catch (e) {
    console.error('스터디 설정 저장 실패:', e)
  }
}

export function syncStudyToPlanner(date: string, sessions: StudySession[]): void {
  if (!isBrowser) return
  try {
    const existing = getPlannerRecord(date) ?? { date, activities: [], feedback: null, reflection: null }
    const kept = existing.activities.filter(a => !a.id.startsWith('study_sync_'))
    const studyActivities: PlannerDayRecord['activities'] = []
    const settings = getStudySettings()
    for (const s of sessions) {
      if (!s.startTime || !s.endTime) continue
      const subject = settings.subjects.find(sub => sub.id === s.subjectId)
      studyActivities.push({
        id: `study_sync_${s.id}`,
        name: subject ? `${subject.emoji} ${subject.name}` : '공부',
        category: '학습',
        startTime: s.startTime,
        endTime: s.endTime,
        color: subject?.color ?? '#c4b5fd',
        notes: s.notes,
      })
    }
    savePlannerRecord({ ...existing, activities: [...kept, ...studyActivities] })
  } catch {
    // ignore
  }
}

// ──────────────────────────────────────────
// 독서 Storage
// ──────────────────────────────────────────

const BOOK_RECORDS_KEY = 'book_records'

export function getBookRecords(): BookRecord[] {
  if (!isBrowser) return []
  try {
    const raw = localStorage.getItem(BOOK_RECORDS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as BookRecord[]
  } catch { return [] }
}

export function saveBookRecords(books: BookRecord[]): void {
  if (!isBrowser) return
  try {
    const value = JSON.stringify(books)
    localStorage.setItem(BOOK_RECORDS_KEY, value)
    pushToCloud(BOOK_RECORDS_KEY, value)
  } catch (e) { console.error('독서 기록 저장 실패:', e) }
}

// ──────────────────────────────────────────
// 데이터 Export / Import
// ──────────────────────────────────────────

export function exportAllData(): string {
  if (!isBrowser) return '{}'
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const val = localStorage.getItem(key)
      if (val) data[key] = val
    }
  }
  return JSON.stringify(data, null, 2)
}

export function importBudgetData(json: string): void {
  if (!isBrowser) return
  try {
    const data = JSON.parse(json) as Record<string, string>
    const budgetKeys = [BUDGET_RECORDS_KEY, BUDGET_SETTINGS_KEY, BUDGET_API_KEY_KEY]
    for (const key of budgetKeys) {
      if (data[key]) {
        localStorage.setItem(key, data[key])
      }
    }
  } catch (e) {
    console.error('가계부 데이터 가져오기 실패:', e)
    throw new Error('가계부 데이터 형식이 올바르지 않습니다.')
  }
}

export function importHealthData(json: string): void {
  if (!isBrowser) return
  try {
    const data = JSON.parse(json) as Record<string, string>
    const healthKeys = [HEALTH_RECORDS_KEY, HEALTH_SETTINGS_KEY]
    for (const key of healthKeys) {
      if (data[key]) {
        localStorage.setItem(key, data[key])
      }
    }
  } catch (e) {
    console.error('헬스 데이터 가져오기 실패:', e)
    throw new Error('헬스 데이터 형식이 올바르지 않습니다.')
  }
}

export function importPlannerData(json: string): void {
  if (!isBrowser) return
  try {
    const data = JSON.parse(json) as Record<string, string>
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('record_') || key === PLANNER_SETTINGS_KEY) {
        localStorage.setItem(key, value)
      }
    }
  } catch (e) {
    console.error('일과표 데이터 가져오기 실패:', e)
    throw new Error('일과표 데이터 형식이 올바르지 않습니다.')
  }
}
