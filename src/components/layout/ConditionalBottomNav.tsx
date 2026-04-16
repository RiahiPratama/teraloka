'use client'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

// Wrapper agar BottomNav muncul di semua halaman publik
// tapi tidak di /admin dan /login
export default function ConditionalBottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  if (pathname.startsWith('/login')) return null
  return <BottomNav />
}
