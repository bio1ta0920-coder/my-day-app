'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, Heart, Calendar, BookOpen, Settings } from 'lucide-react'

const TABS = [
  { href: '/', icon: LayoutDashboard, label: '홈' },
  { href: '/budget', icon: CreditCard, label: '가계부' },
  { href: '/health', icon: Heart, label: '헬스' },
  { href: '/planner', icon: Calendar, label: '일과표' },
  { href: '/study', icon: BookOpen, label: '스터디' },
  { href: '/settings', icon: Settings, label: '설정' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 shadow-lg z-40">
      <div className="flex">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-pink-400' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
