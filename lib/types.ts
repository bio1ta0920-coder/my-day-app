// ── 가계부 ──
export interface Expense {
  id: string
  name: string
  category: string
  isFixed: boolean
  amount: number
  merchant: string
  card: string
  paymentMethod: string
  installment: boolean
  installmentMonths: number
  purchaseType: 'planned' | 'impulse' | 'essential'
  isDate: boolean
  time?: string
  reason: string
  notes: string
  loanId?: string        // 연동된 대출 ID
  loanPrincipal?: number // 원금 상환분
  loanInterest?: number  // 이자 상환분
}

export interface BudgetDayRecord {
  date: string
  expenses: Expense[]
  feedback: string | null
  diary: string | null
  satisfaction: string | null
  emotion: string | null
}

export type LoanType = '주택담보대출' | '전세대출' | '자동차할부' | '신용대출' | '학자금대출' | '기타'
export type LoanRepaymentType = '원리금균등' | '원금균등' | '체증식' | '만기일시' | '거치식'

export interface LoanItem {
  id: string
  name: string
  type: LoanType
  repaymentType: LoanRepaymentType  // 상환 방식
  graceMonths: number               // 거치기간 (개월)
  repaymentDay: number              // 매월 상환일 (1-31)
  graduationRate: number            // 체증률 % (체증식 전용)
  totalMonths: number               // 대출 총 기간 (체증식 자동계산용)
  totalAmount: number
  remainingBalance: number
  monthlyPayment: number
  interestRate: number
  remainingMonths: number
  startDate: string       // YYYY-MM
  endDate: string         // YYYY-MM
  memo: string
}

export interface BudgetSettings {
  monthlyIncome: number
  monthlySavingsGoal: number
  categoryBudgets: Record<string, number>
  monthlyOverrides: Record<string, {
    income?: number
    savingsGoal?: number
    categoryBudgets?: Record<string, number>
  }>
  loans: LoanItem[]
}

// ── 헬스 ──
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface FoodItem {
  id: string
  name: string
  calories: number
  amount: string
  notes: string
}

export interface MealRecord {
  mealTime: MealTime
  foods: FoodItem[]
  time?: string     // 시작 시각 "HH:MM"
  endTime?: string  // 종료 시각 "HH:MM"
}

export interface ExerciseItem {
  id: string
  name: string
  category: string
  duration: number
  intensity: 'low' | 'medium' | 'high'
  calories: number
  notes: string
  startTime?: string  // "HH:MM" — 입력 시 일과표 자동 연동
}

export interface HealthDayRecord {
  date: string
  weight: number | null
  meals: MealRecord[]
  exercises: ExerciseItem[]
  feedback: string | null
  emotion: string | null
  emotionIntensity: number | null
  diaryText: string | null
  tomorrowGoal: string | null
}

export interface FavoriteFood {
  id: string
  name: string
  calories: number
  amount: string
}

export interface FavoriteExercise {
  id: string
  name: string
  category: string
  duration: number
  intensity: 'low' | 'medium' | 'high'
  calories: number
}

export interface HealthSettings {
  targetWeight: number
  currentWeight: number
  targetCalories: number
  targetExerciseDays: number
  favoriteFoods: FavoriteFood[]
  favoriteExercises: FavoriteExercise[]
  weightLog: { date: string; weight: number }[]
}

// ── 일과표 ──
export interface Activity {
  id: string
  name: string
  category: string
  startTime: string
  endTime: string
  color: string
  notes: string
}

export interface PlannerCategory {
  id: string
  label: string
  color: string
  emoji: string
}

export interface PlannerDayRecord {
  date: string
  activities: Activity[]
  feedback: string | null
  reflection: string | null
}

export interface PlannerSettings {
  customCategories: PlannerCategory[]
}

// ── 설정 ──
export interface UnifiedSettings {
  apiKey: string
}

// ── 투두 ──
export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdDate: string  // "YYYY-MM-DD"
}

// ── 스터디 ──
export interface StudySubject {
  id: string
  name: string
  color: string
  emoji: string
  weeklyGoalMinutes: number
}

export interface StudySession {
  id: string
  subjectId: string
  duration: number      // 분
  startTime?: string    // "HH:MM"
  endTime?: string      // "HH:MM"
  notes: string
}

export interface StudyTask {
  id: string
  text: string
  completed: boolean
  subjectId?: string
}

export interface StudyExam {
  id: string
  name: string
  date: string   // "YYYY-MM-DD"
  color: string
}

export interface StudyDayRecord {
  date: string
  sessions: StudySession[]
  tasks: StudyTask[]
}

export interface StudySettings {
  subjects: StudySubject[]
  exams: StudyExam[]
  dailyGoalMinutes: number
  pomodoroMinutes: number
  breakMinutes: number
}

export interface BookRecord {
  id: string
  title: string
  author: string
  status: 'completed' | 'wishlist'
  rating?: 'good' | 'bad'
  review?: string
  completedDate?: string  // YYYY-MM-DD
  addedDate: string       // YYYY-MM-DD
}
