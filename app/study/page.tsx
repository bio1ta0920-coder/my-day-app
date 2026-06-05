'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Play, Square, BookOpen, Trophy, Target, Clock, Heart, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { StudyDayRecord, StudySession, StudyTask, StudyExam, StudySubject, StudySettings, BookRecord } from '@/lib/types'
import {
  getStudyRecord,
  saveStudyRecord,
  getStudySettings,
  saveStudySettings,
  getBookRecords,
  saveBookRecords,
  syncStudyToPlanner,
  getTodayString,
  formatDate,
  addDays,
  getAllStudyRecords,
} from '@/lib/storage'

// ── 유틸 ──
function pad(n: number) { return String(n).padStart(2, '0') }
function fmtSeconds(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}
function fmtMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0 && m > 0) return `${h}시간 ${m}분`
  if (h > 0) return `${h}시간`
  return `${m}분`
}
function getDday(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
function getWeekDates(): string[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const monday = new Date(today); monday.setDate(today.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
}
function nowHHMM() {
  const n = new Date()
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`
}
function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + mins) % (24 * 60)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

// ── 모달들 ──

function ExamModal({ exam, onSave, onClose }: {
  exam?: StudyExam | null
  onSave: (e: StudyExam) => void
  onClose: () => void
}) {
  const [name, setName] = useState(exam?.name ?? '')
  const [date, setDate] = useState(exam?.date ?? '')
  const [color, setColor] = useState(exam?.color ?? '#f472b6')
  const COLORS = ['#f472b6','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ef4444','#14b8a6']
  function save() {
    if (!name.trim() || !date) return
    onSave({ id: exam?.id ?? Date.now().toString(), name: name.trim(), date, color })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">{exam ? '시험 수정' : '시험 추가'}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">시험 이름 <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="예: 중간고사, TOEIC" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">시험 날짜 <span className="text-red-500">*</span></label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">색상</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 border-t border-slate-100">
        <button onClick={save} disabled={!name.trim() || !date} className="w-full py-3.5 rounded-xl bg-pink-400 text-white font-bold disabled:opacity-40">저장하기</button>
      </div>
    </div>
  )
}

function TaskModal({ subjects, onSave, onClose }: {
  subjects: StudySubject[]
  onSave: (task: StudyTask) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  function save() {
    if (!text.trim()) return
    onSave({ id: Date.now().toString(), text: text.trim(), completed: false, subjectId: subjectId || undefined })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">할 일 추가</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">할 일 <span className="text-red-500">*</span></label>
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="예: 수학 2단원 문제풀기" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">과목</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSubjectId('')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${!subjectId ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>전체</button>
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSubjectId(s.id)} style={subjectId === s.id ? { backgroundColor: s.color, borderColor: s.color, color: 'white' } : {}} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${subjectId === s.id ? '' : 'bg-white text-slate-600 border-slate-200'}`}>
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 border-t border-slate-100">
        <button onClick={save} disabled={!text.trim()} className="w-full py-3.5 rounded-xl bg-pink-400 text-white font-bold disabled:opacity-40">추가하기</button>
      </div>
    </div>
  )
}

function SubjectSettingsModal({ settings, onSave, onClose }: {
  settings: StudySettings
  onSave: (s: StudySettings) => void
  onClose: () => void
}) {
  const [subjects, setSubjects] = useState(settings.subjects)
  const [dailyGoal, setDailyGoal] = useState(settings.dailyGoalMinutes)
  const [pomodoroMin, setPomodoroMin] = useState(settings.pomodoroMinutes)
  const [breakMin, setBreakMin] = useState(settings.breakMinutes)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📝')
  const [newColor, setNewColor] = useState('#94a3b8')
  const COLORS = ['#3b82f6','#22c55e','#f97316','#8b5cf6','#eab308','#ef4444','#14b8a6','#f472b6','#94a3b8']

  function addSubject() {
    if (!newName.trim()) return
    setSubjects([...subjects, { id: Date.now().toString(), name: newName.trim(), color: newColor, emoji: newEmoji, weeklyGoalMinutes: 120 }])
    setNewName(''); setNewEmoji('📝')
  }
  function removeSubject(id: string) { setSubjects(subjects.filter(s => s.id !== id)) }
  function save() {
    onSave({ ...settings, subjects, dailyGoalMinutes: dailyGoal, pomodoroMinutes: pomodoroMin, breakMinutes: breakMin })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">스터디 설정</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">일일 목표</p>
          <div className="flex items-center gap-2">
            <input type="number" value={dailyGoal} onChange={e => setDailyGoal(Number(e.target.value))} min={0} className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:border-pink-300" />
            <span className="text-sm text-slate-500">분</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">뽀모도로 설정</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">집중 시간</label>
              <div className="flex items-center gap-1">
                <input type="number" value={pomodoroMin} onChange={e => setPomodoroMin(Number(e.target.value))} min={1} max={60} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:border-pink-300" />
                <span className="text-xs text-slate-500">분</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">휴식 시간</label>
              <div className="flex items-center gap-1">
                <input type="number" value={breakMin} onChange={e => setBreakMin(Number(e.target.value))} min={1} max={30} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:border-pink-300" />
                <span className="text-xs text-slate-500">분</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">과목 관리</p>
          <div className="space-y-2 mb-3">
            {subjects.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-50">
                <span className="text-base">{s.emoji}</span>
                <span className="flex-1 text-sm font-medium text-slate-700">{s.name}</span>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <button onClick={() => removeSubject(s.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50">삭제</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="text" value={newEmoji} onChange={e => setNewEmoji(e.target.value)} className="w-12 px-2 py-2 rounded-xl border border-slate-200 text-sm text-center focus:outline-none focus:border-pink-300" placeholder="😀" />
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="과목명" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-pink-300" />
            <button onClick={addSubject} disabled={!newName.trim()} className="px-3 py-2 rounded-xl bg-pink-400 text-white text-sm font-semibold disabled:opacity-40">추가</button>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 border-t border-slate-100">
        <button onClick={save} className="w-full py-3.5 rounded-xl bg-pink-400 text-white font-bold">저장하기</button>
      </div>
    </div>
  )
}

function BookModal({ book, onSave, onClose }: {
  book?: BookRecord | null
  onSave: (b: BookRecord) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [status, setStatus] = useState<'completed' | 'wishlist'>(book?.status ?? 'completed')
  const [rating, setRating] = useState<'good' | 'bad' | undefined>(book?.rating)
  const [review, setReview] = useState(book?.review ?? '')
  const [completedDate, setCompletedDate] = useState(book?.completedDate ?? getTodayString())

  function save() {
    if (!title.trim()) return
    onSave({
      id: book?.id ?? Date.now().toString(),
      title: title.trim(),
      author: author.trim(),
      status,
      rating: rating,
      review: review.trim() || undefined,
      completedDate: status === 'completed' ? completedDate : undefined,
      addedDate: book?.addedDate ?? getTodayString(),
    })
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">{book ? '책 수정' : '책 추가'}</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['completed', 'wishlist'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${status === s ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
              {s === 'completed' ? '✅ 완독' : '🔖 위시리스트'}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">책 제목 <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="책 제목을 입력하세요" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">저자 <span className="text-slate-400 font-normal">(선택)</span></label>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="저자명" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" />
        </div>
        {status === 'completed' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">완독 날짜</label>
              <input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">이 책 어땠나요? <span className="text-slate-400 font-normal">(선택)</span></label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setRating(rating === 'good' ? undefined : 'good')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${rating === 'good' ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-500'}`}>
                  <ThumbsUp size={15} /> 좋아요
                </button>
                <button onClick={() => setRating(rating === 'bad' ? undefined : 'bad')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${rating === 'bad' ? 'border-red-300 bg-red-50 text-red-500' : 'border-slate-200 bg-white text-slate-500'}`}>
                  <ThumbsDown size={15} /> 별로에요
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">한줄평 <span className="text-slate-400 font-normal">(선택)</span></label>
              <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="이 책에 대한 한줄평을 남겨보세요" rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 resize-none" />
            </div>
          </>
        )}
      </div>
      <div className="px-4 py-4 border-t border-slate-100">
        <button onClick={save} disabled={!title.trim()} className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-40">저장하기</button>
      </div>
    </div>
  )
}

// ── 메인 페이지 ──
export default function StudyPage() {
  const [currentDate, setCurrentDate] = useState('')
  const [record, setRecord] = useState<StudyDayRecord>({ date: '', sessions: [], tasks: [] })
  const [settings, setSettings] = useState<StudySettings | null>(null)

  // 타이머
  const [isRunning, setIsRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isPomodoro, setIsPomodoro] = useState(false)
  const [pomodoroLeft, setPomodoroLeft] = useState(0)
  const [isBreak, setIsBreak] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 탭
  const [activeTab, setActiveTab] = useState<'study' | 'books'>('study')

  // 독서
  const [books, setBooks] = useState<BookRecord[]>([])
  const [bookTab, setBookTab] = useState<'completed' | 'wishlist'>('completed')
  const [showBookModal, setShowBookModal] = useState(false)
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null)

  // 모달
  const [showExamModal, setShowExamModal] = useState(false)
  const [editingExam, setEditingExam] = useState<StudyExam | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const todayStr = getTodayString()

  const loadData = useCallback((date: string) => {
    const s = getStudySettings()
    setSettings(s)
    setRecord(getStudyRecord(date))
    if (!selectedSubjectId && s.subjects.length > 0) setSelectedSubjectId(s.subjects[0].id)
  }, [selectedSubjectId])

  useEffect(() => {
    const today = getTodayString()
    setCurrentDate(today)
    loadData(today)
    setBooks(getBookRecords())
  }, []) // eslint-disable-line

  // 타이머 tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1)
        if (isPomodoro) {
          setPomodoroLeft(p => {
            if (p <= 1) {
              // 뽀모도로 끝
              setIsRunning(false)
              clearInterval(timerRef.current!)
              return 0
            }
            return p - 1
          })
        }
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, isPomodoro])

  function changeDate(delta: number) {
    const newDate = addDays(currentDate, delta)
    setCurrentDate(newDate)
    loadData(newDate)
  }

  function updateRecord(updated: StudyDayRecord) {
    setRecord(updated)
    saveStudyRecord(updated)
    syncStudyToPlanner(updated.date, updated.sessions)
  }

  // 타이머 시작
  function startTimer() {
    setSessionStartTime(nowHHMM())
    setTimerSeconds(0)
    if (isPomodoro && settings) setPomodoroLeft(settings.pomodoroMinutes * 60)
    setIsBreak(false)
    setIsRunning(true)
  }

  // 타이머 완료 → 세션 저장
  function stopTimer() {
    setIsRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
    const durationMin = Math.max(1, Math.round(timerSeconds / 60))
    const endTime = nowHHMM()
    const session: StudySession = {
      id: Date.now().toString(),
      subjectId: selectedSubjectId,
      duration: durationMin,
      startTime: sessionStartTime,
      endTime,
      notes: '',
    }
    const updated = { ...record, sessions: [...record.sessions, session] }
    updateRecord(updated)
    setTimerSeconds(0)
    setPomodoroLeft(0)
  }

  // 할 일
  function addTask(task: StudyTask) { updateRecord({ ...record, tasks: [...record.tasks, task] }) }
  function toggleTask(id: string) {
    const tasks = record.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    updateRecord({ ...record, tasks })
  }
  function deleteTask(id: string) { updateRecord({ ...record, tasks: record.tasks.filter(t => t.id !== id) }) }

  // 세션 삭제
  function deleteSession(id: string) {
    const sessions = record.sessions.filter(s => s.id !== id)
    updateRecord({ ...record, sessions })
  }

  // 독서
  function saveBook(book: BookRecord) {
    const updated = editingBook
      ? books.map(b => b.id === book.id ? book : b)
      : [...books, book]
    setBooks(updated)
    saveBookRecords(updated)
    setEditingBook(null)
  }
  function deleteBook(id: string) {
    const updated = books.filter(b => b.id !== id)
    setBooks(updated)
    saveBookRecords(updated)
  }

  // 시험 D-day
  function saveExam(exam: StudyExam) {
    if (!settings) return
    const exams = editingExam
      ? settings.exams.map(e => e.id === exam.id ? exam : e)
      : [...settings.exams, exam]
    const updated = { ...settings, exams }
    setSettings(updated)
    saveStudySettings(updated)
    setEditingExam(null)
  }
  function deleteExam(id: string) {
    if (!settings) return
    const updated = { ...settings, exams: settings.exams.filter(e => e.id !== id) }
    setSettings(updated)
    saveStudySettings(updated)
  }

  // 주간 통계
  function getWeeklyStats() {
    const weekDates = getWeekDates()
    const allRecords = getAllStudyRecords()
    const subjectTotals: Record<string, number> = {}
    for (const date of weekDates) {
      const r = allRecords[date]
      if (!r) continue
      for (const s of r.sessions) {
        subjectTotals[s.subjectId] = (subjectTotals[s.subjectId] ?? 0) + s.duration
      }
    }
    return subjectTotals
  }

  if (!settings) return (
    <div className="flex items-center justify-center h-screen">
      <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
    </div>
  )

  const totalTodayMin = record.sessions.reduce((s, r) => s + r.duration, 0)
  const goalMin = settings.dailyGoalMinutes
  const goalProgress = Math.min(100, (totalTodayMin / goalMin) * 100)
  const isToday = currentDate === todayStr
  const completedTasks = record.tasks.filter(t => t.completed).length
  const weeklyStats = getWeeklyStats()
  const maxWeekly = Math.max(...Object.values(weeklyStats), 1)
  const selectedSubject = settings.subjects.find(s => s.id === selectedSubjectId)
  const pomodoroProgress = settings && isPomodoro && pomodoroLeft > 0
    ? ((settings.pomodoroMinutes * 60 - pomodoroLeft) / (settings.pomodoroMinutes * 60)) * 100
    : 0

  return (
    <div className="fade-in">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-700 text-white pt-12 pb-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-emerald-100">{currentDate ? formatDate(currentDate) : ''}</p>
            {isToday && <span className="mt-0.5 px-2.5 py-0.5 rounded-full bg-white/25 text-xs font-bold">오늘</span>}
          </div>
          <button onClick={() => changeDate(1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        {/* 오늘 진행률 */}
        <div className="bg-white/15 rounded-xl px-3 py-2.5">
          <div className="flex justify-between text-xs text-white/80 mb-1.5">
            <span>📚 오늘 공부 {fmtMinutes(totalTodayMin)}</span>
            <span>목표 {fmtMinutes(goalMin)}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-white/70">
            <span>✅ 할 일 {completedTasks}/{record.tasks.length}</span>
            <button onClick={() => setShowSettings(true)} className="text-white/80 hover:text-white font-semibold">⚙️ 설정</button>
          </div>
        </div>
      </div>

      {/* 공부/독서 탭 */}
      <div className="px-4 pt-4 flex gap-2">
        <button onClick={() => setActiveTab('study')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'study' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
          📚 공부
        </button>
        <button onClick={() => setActiveTab('books')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'books' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
          📖 독서 기록
        </button>
      </div>

      {activeTab === 'books' ? (
        <div className="px-4 pt-4 space-y-4 pb-6">
          {/* 완독/위시 탭 */}
          <div className="flex gap-2">
            {(['completed', 'wishlist'] as const).map(t => {
              const count = books.filter(b => b.status === t).length
              return (
                <button key={t} onClick={() => setBookTab(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${bookTab === t ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                  {t === 'completed' ? `✅ 완독 ${count}권` : `🔖 위시리스트 ${count}권`}
                </button>
              )
            })}
          </div>

          <button onClick={() => { setEditingBook(null); setShowBookModal(true) }}
            className="w-full py-3 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-500 text-sm font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
            <Plus size={15} /> {bookTab === 'completed' ? '완독 책 추가' : '위시리스트 추가'}
          </button>

          {books.filter(b => b.status === bookTab).length === 0 ? (
            <div className="bg-white rounded-2xl py-10 text-center text-slate-400 text-sm shadow-sm">
              {bookTab === 'completed' ? '완독한 책을 기록해보세요 📚' : '읽고 싶은 책을 담아보세요 🔖'}
            </div>
          ) : (
            <div className="space-y-3">
              {books
                .filter(b => b.status === bookTab)
                .sort((a, b) => (b.completedDate ?? b.addedDate).localeCompare(a.completedDate ?? a.addedDate))
                .map(book => (
                  <div key={book.id} onClick={() => { setEditingBook(book); setShowBookModal(true) }}
                    className="bg-white rounded-2xl shadow-sm px-4 py-3.5 cursor-pointer active:scale-[0.99] transition-transform">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 text-sm">{book.title}</p>
                          {book.rating === 'good' && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold flex items-center gap-1"><ThumbsUp size={10} /> 좋아요</span>}
                          {book.rating === 'bad' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold flex items-center gap-1"><ThumbsDown size={10} /> 별로에요</span>}
                        </div>
                        {book.author && <p className="text-xs text-slate-400 mt-0.5">{book.author}</p>}
                        {book.completedDate && <p className="text-xs text-emerald-500 mt-0.5">완독 {book.completedDate}</p>}
                        {book.review && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">"{book.review}"</p>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteBook(book.id) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {bookTab === 'completed' && books.filter(b => b.status === 'completed').length > 0 && (
            <div className="bg-emerald-50 rounded-2xl px-4 py-3 text-center">
              <p className="text-emerald-700 font-bold text-lg">{books.filter(b => b.status === 'completed').length}권</p>
              <p className="text-emerald-500 text-xs mt-0.5">올해 완독한 책</p>
            </div>
          )}
        </div>
      ) : (
      <div className="px-4 pt-4 space-y-4 pb-6">

        {/* D-day */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-700 text-sm flex items-center gap-1.5"><Trophy size={14} className="text-amber-400" /> 시험 D-day</h2>
            <button onClick={() => { setEditingExam(null); setShowExamModal(true) }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100">
              <Plus size={12} /> 추가
            </button>
          </div>
          {settings.exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-4 text-center text-slate-400 text-sm">
              시험을 추가해보세요
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4">
              {settings.exams
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(exam => {
                  const dday = getDday(exam.date)
                  return (
                    <div key={exam.id} onClick={() => { setEditingExam(exam); setShowExamModal(true) }} className="flex-shrink-0 rounded-2xl p-3 text-white cursor-pointer active:scale-95 transition-transform min-w-[110px]" style={{ backgroundColor: exam.color }}>
                      <p className="text-xs font-semibold opacity-80 mb-1">{exam.name}</p>
                      <p className="text-2xl font-black">
                        {dday === 0 ? 'D-DAY' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`}
                      </p>
                      <p className="text-xs opacity-70 mt-0.5">{exam.date}</p>
                      <button onClick={e => { e.stopPropagation(); deleteExam(exam.id) }} className="mt-1.5 text-white/60 hover:text-white text-xs">삭제</button>
                    </div>
                  )
                })}
            </div>
          )}
        </section>

        {/* 타이머 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-1.5"><Clock size={16} className="text-emerald-500" /> 공부 타이머</h2>
            <button
              onClick={() => setIsPomodoro(p => !p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${isPomodoro ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              🍅 뽀모도로
            </button>
          </div>
          <div className="px-4 py-4">
            {/* 과목 선택 */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {settings.subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => !isRunning && setSelectedSubjectId(s.id)}
                  disabled={isRunning}
                  style={selectedSubjectId === s.id ? { backgroundColor: s.color, borderColor: s.color, color: 'white' } : {}}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedSubjectId === s.id ? '' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>

            {/* 타이머 디스플레이 */}
            <div className="flex flex-col items-center py-4">
              <div className="relative">
                {/* 원형 진행 바 (뽀모도로) */}
                {isPomodoro && isRunning && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#ede9fe" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke={selectedSubject?.color ?? '#8b5cf6'} strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - pomodoroProgress / 100)}`}
                      strokeLinecap="round" className="transition-all duration-1000"
                    />
                  </svg>
                )}
                <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center" style={{ backgroundColor: isRunning ? `${selectedSubject?.color ?? '#8b5cf6'}15` : '#f8fafc' }}>
                  <span className="text-3xl font-black tabular-nums" style={{ color: isRunning ? (selectedSubject?.color ?? '#8b5cf6') : '#94a3b8' }}>
                    {isPomodoro && isRunning ? fmtSeconds(pomodoroLeft) : fmtSeconds(timerSeconds)}
                  </span>
                  {isPomodoro && isRunning && (
                    <span className="text-xs mt-0.5" style={{ color: selectedSubject?.color ?? '#8b5cf6' }}>
                      {isBreak ? '휴식 중 ☕' : '집중 중 🎯'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                {!isRunning ? (
                  <button
                    onClick={startTimer}
                    disabled={!selectedSubjectId}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-40"
                    style={{ backgroundColor: selectedSubject?.color ?? '#8b5cf6' }}
                  >
                    <Play size={18} fill="white" /> 시작
                  </button>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-red-500 text-white font-bold text-base transition-all active:scale-95"
                  >
                    <Square size={18} fill="white" /> 완료
                  </button>
                )}
              </div>
              {isRunning && (
                <p className="text-xs text-slate-400 mt-2">{selectedSubject?.emoji} {selectedSubject?.name} 공부 중...</p>
              )}
            </div>
          </div>
        </section>

        {/* 할 일 체크리스트 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
              <Target size={16} className="text-emerald-500" /> 오늘의 할 일
              <span className="text-xs text-slate-400 font-normal">{completedTasks}/{record.tasks.length}</span>
            </h2>
            <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-semibold hover:bg-emerald-100">
              <Plus size={15} /> 추가
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {record.tasks.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">오늘 할 일을 추가해보세요</div>
            ) : (
              record.tasks.map(task => {
                const subject = settings.subjects.find(s => s.id === task.subjectId)
                return (
                  <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={task.completed ? { backgroundColor: subject?.color ?? '#8b5cf6', borderColor: subject?.color ?? '#8b5cf6' } : { borderColor: '#cbd5e1' }}
                    >
                      {task.completed && <Check size={12} color="white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.text}</p>
                      {subject && <p className="text-xs mt-0.5" style={{ color: subject.color }}>{subject.emoji} {subject.name}</p>}
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* 오늘 공부 기록 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
              <BookOpen size={16} className="text-emerald-500" /> 오늘 공부 기록
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {record.sessions.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">아직 공부 기록이 없어요</div>
            ) : (
              record.sessions.map(session => {
                const subject = settings.subjects.find(s => s.id === session.subjectId)
                return (
                  <div key={session.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${subject?.color ?? '#8b5cf6'}20` }}>
                      {subject?.emoji ?? '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{subject?.name ?? '공부'}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span style={{ color: subject?.color }}>⏱ {fmtMinutes(session.duration)}</span>
                        {session.startTime && session.endTime && (
                          <span>{session.startTime} ~ {session.endTime}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteSession(session.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* 주간 통계 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-50">
            <h2 className="font-bold text-slate-800 text-base">📊 이번 주 통계</h2>
          </div>
          <div className="px-4 py-4 space-y-3">
            {settings.subjects.map(subject => {
              const min = weeklyStats[subject.id] ?? 0
              const pct = Math.round((min / maxWeekly) * 100)
              const goalPct = Math.min(100, Math.round((min / subject.weeklyGoalMinutes) * 100))
              return (
                <div key={subject.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{subject.emoji} {subject.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{fmtMinutes(min)}</span>
                      <span className="text-xs font-semibold" style={{ color: goalPct >= 100 ? '#22c55e' : subject.color }}>
                        {goalPct >= 100 ? '✓ 달성!' : `${goalPct}%`}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: subject.color }} />
                  </div>
                </div>
              )
            })}
            {Object.values(weeklyStats).every(v => v === 0) && (
              <p className="text-center text-slate-400 text-sm py-2">이번 주 공부 기록이 없어요</p>
            )}
          </div>
        </section>

      </div>

      )} {/* activeTab === 'books' ? ... : ... 끝 */}

      {/* 모달들 */}
      {showBookModal && (
        <BookModal
          book={editingBook}
          onSave={saveBook}
          onClose={() => { setShowBookModal(false); setEditingBook(null) }}
        />
      )}
      {showExamModal && (
        <ExamModal
          exam={editingExam}
          onSave={saveExam}
          onClose={() => { setShowExamModal(false); setEditingExam(null) }}
        />
      )}
      {showTaskModal && (
        <TaskModal
          subjects={settings.subjects}
          onSave={addTask}
          onClose={() => setShowTaskModal(false)}
        />
      )}
      {showSettings && (
        <SubjectSettingsModal
          settings={settings}
          onSave={updated => { setSettings(updated); saveStudySettings(updated) }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
