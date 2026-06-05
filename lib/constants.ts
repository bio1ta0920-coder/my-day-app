// ── 가계부 ──
export const BUDGET_CATEGORIES = [
  { id: '식비', label: '식비', color: '#f97316', bg: '#fff7ed', emoji: '🍽️' },
  { id: '교통비', label: '교통비', color: '#3b82f6', bg: '#eff6ff', emoji: '🚌' },
  { id: '주거/관리비', label: '주거/관리비', color: '#6b7280', bg: '#f9fafb', emoji: '🏠' },
  { id: '의료/건강', label: '의료/건강', color: '#10b981', bg: '#ecfdf5', emoji: '🏥' },
  { id: '문화/여가', label: '문화/여가', color: '#8b5cf6', bg: '#f5f3ff', emoji: '🎬' },
  { id: '쇼핑/의류', label: '쇼핑/의류', color: '#ec4899', bg: '#fdf2f8', emoji: '🛍️' },
  { id: '미용', label: '미용', color: '#f43f5e', bg: '#fff1f2', emoji: '💄' },
  { id: '생필품', label: '생필품', color: '#a16207', bg: '#fefce8', emoji: '🧴' },
  { id: '교육', label: '교육', color: '#6366f1', bg: '#eef2ff', emoji: '📚' },
  { id: '구독서비스', label: '구독서비스', color: '#06b6d4', bg: '#ecfeff', emoji: '📱' },
  { id: '통신비', label: '통신비', color: '#14b8a6', bg: '#f0fdfa', emoji: '📡' },
  { id: '저축/투자', label: '저축/투자', color: '#22c55e', bg: '#f0fdf4', emoji: '💰' },
  { id: '경조사', label: '경조사', color: '#eab308', bg: '#fefce8', emoji: '🎁' },
  { id: '기타', label: '기타', color: '#94a3b8', bg: '#f8fafc', emoji: '📦' },
]

export const PAYMENT_METHODS = ['신용카드', '체크카드', '현금', '계좌이체', '간편결제(카카오/네이버)']

export const CARDS = ['삼성카드', '현대카드']

export const PURCHASE_TYPES = ['계획구매', '충동구매', '필수지출']

export const PURCHASE_TYPE_LABELS: Record<string, string> = {
  planned: '계획구매',
  impulse: '충동구매',
  essential: '필수지출',
}

export const BUDGET_EMOTIONS = [
  '뿌듯함', '후회됨', '평온함', '스트레스', '행복함',
  '아쉬움', '만족함', '걱정됨', '기쁨', '무덤덤',
]

export const DEFAULT_BUDGETS: Record<string, number> = {
  '식비': 0,
  '교통비': 0,
  '주거/관리비': 0,
  '의료/건강': 0,
  '문화/여가': 0,
  '쇼핑/의류': 0,
  '미용': 0,
  '생필품': 0,
  '교육': 0,
  '구독서비스': 0,
  '통신비': 0,
  '저축/투자': 0,
  '경조사': 0,
  '기타': 0,
}

// ── 헬스 ──
export const MEAL_TIME_LABELS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  breakfast: { label: '아침', emoji: '🌅', color: '#f97316', bg: '#fff7ed' },
  lunch:     { label: '점심', emoji: '☀️', color: '#eab308', bg: '#fefce8' },
  dinner:    { label: '저녁', emoji: '🌙', color: '#6366f1', bg: '#eef2ff' },
  snack:     { label: '간식', emoji: '🍪', color: '#ec4899', bg: '#fdf2f8' },
}

export const EXERCISE_CATEGORIES = [
  { id: '유산소', emoji: '🏃', color: '#ef4444', bg: '#fef2f2' },
  { id: '근력',   emoji: '💪', color: '#f97316', bg: '#fff7ed' },
  { id: '스트레칭', emoji: '🧘', color: '#22c55e', bg: '#f0fdf4' },
  { id: '스포츠', emoji: '⚽', color: '#3b82f6', bg: '#eff6ff' },
  { id: '기타',   emoji: '🏅', color: '#8b5cf6', bg: '#f5f3ff' },
]

export const INTENSITY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  low:    { label: '가볍게', emoji: '😌', color: '#22c55e' },
  medium: { label: '보통',   emoji: '😤', color: '#f97316' },
  high:   { label: '격하게', emoji: '🔥', color: '#ef4444' },
}

export const HEALTH_EMOTIONS = [
  { value: '뿌듯함',   emoji: '😊', color: '#22c55e' },
  { value: '만족',     emoji: '🙂', color: '#6366f1' },
  { value: '보통',     emoji: '😐', color: '#94a3b8' },
  { value: '힘들었음', emoji: '😓', color: '#f97316' },
  { value: '자책됨',   emoji: '😞', color: '#ef4444' },
  { value: '의욕넘침', emoji: '💪', color: '#8b5cf6' },
  { value: '지침',     emoji: '😴', color: '#64748b' },
  { value: '스트레스', emoji: '😤', color: '#dc2626' },
]

// ── 일과표 ──
// ── 스터디 ──
export const DEFAULT_STUDY_SUBJECTS = [
  { id: 's1', name: '수학',   color: '#3b82f6', emoji: '📐', weeklyGoalMinutes: 300 },
  { id: 's2', name: '영어',   color: '#22c55e', emoji: '📖', weeklyGoalMinutes: 240 },
  { id: 's3', name: '국어',   color: '#f97316', emoji: '✏️', weeklyGoalMinutes: 180 },
  { id: 's4', name: '과학',   color: '#8b5cf6', emoji: '🔬', weeklyGoalMinutes: 180 },
  { id: 's5', name: '사회',   color: '#eab308', emoji: '🌍', weeklyGoalMinutes: 150 },
  { id: 's6', name: '기타',   color: '#94a3b8', emoji: '📝', weeklyGoalMinutes: 120 },
]

export const PLANNER_CATEGORIES = [
  { id: '수면',   label: '수면',   color: '#f9a8d4', emoji: '😴' },  // pink-300
  { id: '업무',   label: '업무',   color: '#fda4af', emoji: '💼' },  // rose-300
  { id: '학습',   label: '학습',   color: '#c4b5fd', emoji: '📚' },  // violet-300
  { id: '식사',   label: '식사',   color: '#fdba74', emoji: '🍽️' },  // orange-300
  { id: '운동',   label: '운동',   color: '#86efac', emoji: '💪' },  // green-300
  { id: '여가',   label: '여가',   color: '#a5f3fc', emoji: '🎮' },  // cyan-300
  { id: '이동',   label: '이동',   color: '#bfdbfe', emoji: '🚌' },  // blue-200
  { id: '준비',   label: '준비',   color: '#fef08a', emoji: '🪥' },  // yellow-200
  { id: '약속',   label: '약속',   color: '#f0abfc', emoji: '👥' },  // fuchsia-300
  { id: '기타',   label: '기타',   color: '#cbd5e1', emoji: '📌' },  // slate-300
]
