'use client'

// Aktivitasku (11 Jun 2026) — FEED gabungan lintas-vertikal + filter chip (pola super-app).
// 1 fetch ke /me/activity (OTAK yang agregasi+sort+paginate). FE cuma render.
// Chip dinamis dari response.verticals — cuma vertikal yang ADA datanya.
// Nambah vertikal di backend = otomatis muncul di sini (nol perubahan FE).
// GREP-MARKER: AKTIVITASKU_FEED_V1

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import {
  Bike, Package, Car, HeartHandshake, Megaphone, Home,
  MapPin, Clock, ChevronRight, Inbox, Loader2, ArrowRight, type LucideIcon,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

interface ActivityItem {
  id: string
  vertical: string
  type: string
  title: string
  subtitle: string | null
  status: string | null
  amount: number | null
  timestamp: string
  href: string
}

// ─── Meta per vertikal: label chip + ikon kartu ────────────────
const VERTICAL_META: Record<string, { label: string; Icon: LucideIcon; tint: string }> = {
  balaju:   { label: 'BALAJU',   Icon: Bike,          tint: 'text-[#1B6B4A] bg-[#1B6B4A]/10' },
  badonasi: { label: 'BADONASI', Icon: HeartHandshake, tint: 'text-rose-600 bg-rose-50' },
  balapor:  { label: 'BALAPOR',  Icon: Megaphone,      tint: 'text-sky-600 bg-sky-50' },
  bakos:    { label: 'BAKOS',    Icon: Home,           tint: 'text-amber-600 bg-amber-50' },
}
function vmeta(v: string) {
  return VERTICAL_META[v] ?? { label: v.toUpperCase(), Icon: Inbox, tint: 'text-gray-500 bg-gray-100' }
}

// Ikon spesifik per service_type BALAJU (override ikon vertikal).
const BALAJU_TYPE_ICON: Record<string, LucideIcon> = { ride_bike: Bike, courier: Package, ride_car: Car }

// ─── Status mentah (lintas-domain) -> label + warna badge ──────
function statusMeta(status: string | null): { label: string; cls: string } | null {
  if (!status) return null
  switch (status) {
    // BALAJU
    case 'completed': return { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'cancelled': return { label: 'Dibatalkan', cls: 'bg-red-50 text-red-600 border-red-200' }
    case 'no_driver': return { label: 'Tak ada driver', cls: 'bg-gray-100 text-gray-500 border-gray-200' }
    case 'open':
    case 'matched':
    case 'arrived':
    case 'ongoing': return { label: 'Berlangsung', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    // BADONASI
    case 'verified': return { label: 'Terverifikasi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'pending': return { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'rejected': return { label: 'Ditolak', cls: 'bg-red-50 text-red-600 border-red-200' }
    default: return { label: status, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
}

function formatRupiah(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Jayapura',
    })
  } catch { return '' }
}

export default function AktivitasPage() {
  const { user, token } = useAuth()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [verticals, setVerticals] = useState<string[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const fetchFeed = useCallback(async (f: string) => {
    if (!token) return
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`${API_URL}/me/activity?filter=${f}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'Gagal memuat aktivitas')
      setItems(Array.isArray(json.data?.items) ? json.data.items : [])
      // verticals dari response 'all' = sumber chip. Saat filter spesifik, JANGAN
      // sempitkan daftar chip (biar user bisa balik) — cuma update pas filter 'all'.
      if (f === 'all' && Array.isArray(json.data?.verticals)) setVerticals(json.data.verticals)
    } catch (e: any) {
      setErr(e?.message || 'Gagal memuat aktivitas')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (user && token) fetchFeed(filter)
  }, [user, token, filter, fetchFeed])

  const chips = ['all', ...verticals]

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
      <h1 className="text-xl font-extrabold text-gray-900">Aktivitasku</h1>
      <p className="mt-0.5 text-sm text-gray-500">Riwayat aktivitasmu di seluruh layanan TeraLoka.</p>

      {/* Chip filter — dinamis dari vertikal yang punya data */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {chips.map((key) => {
          const active = filter === key
          const label = key === 'all' ? 'Semua' : vmeta(key).label
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? 'border-[#1B6B4A] bg-[#1B6B4A] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Feed */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat aktivitas…
          </div>
        ) : err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm font-medium text-red-600">{err}</p>
            <button onClick={() => fetchFeed(filter)} className="mt-2 text-xs font-bold text-red-700 underline">
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-3">
            {items.map((it) => <ActivityCard key={`${it.vertical}-${it.id}`} item={it} />)}
          </div>
        )}
      </div>

      {/* Bridge BALAPOR (Opsi B) — laporan sipil = proses berkelanjutan, punya halaman
          kaya sendiri (/my-reports). Feed fokus transaksi; ini jembatan, bukan item. */}
      {!loading && filter === 'all' && (
        <Link
          href="/my-reports"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white p-4 transition hover:border-sky-400 hover:bg-sky-50/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-600">
            <Megaphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-gray-900">Laporan Saya (BALAPOR)</div>
            <div className="text-xs text-gray-500">Lihat status laporan wargamu di halaman khusus.</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
        </Link>
      )}
    </div>
  )
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const meta = vmeta(item.vertical)
  // BALAJU: ikon per service_type kalau bisa ditebak dari type; default ikon vertikal.
  const Icon =
    item.vertical === 'balaju'
      ? (BALAJU_TYPE_ICON[item.type === 'ride_order' ? 'ride_bike' : item.type] ?? meta.Icon)
      : meta.Icon
  const badge = statusMeta(item.status)

  return (
    <Link
      href={item.href}
      className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#1B6B4A]/40 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${meta.tint}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{meta.label}</div>
            <div className="truncate text-sm font-bold text-gray-900">{item.title}</div>
          </div>
        </div>
        {badge && (
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      {item.subtitle && <div className="mt-2 truncate text-xs text-gray-500">{item.subtitle}</div>}

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="h-3 w-3" /> {formatDate(item.timestamp)}
        </span>
        <div className="flex items-center gap-2">
          {item.amount != null && (
            <span className="text-sm font-extrabold text-[#1B6B4A]">{formatRupiah(item.amount)}</span>
          )}
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ filter }: { filter: string }) {
  const isAll = filter === 'all'
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
      <Inbox className="mx-auto h-10 w-10 text-gray-300" />
      <p className="mt-3 text-sm font-bold text-gray-700">
        {isAll ? 'Belum ada aktivitas' : `Belum ada aktivitas ${vmeta(filter).label}`}
      </p>
      <p className="mt-1 text-xs text-gray-400">Aktivitasmu di layanan TeraLoka akan muncul di sini.</p>
      {isAll && (
        <Link href="/balaju" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1B6B4A] px-4 py-2 text-xs font-bold text-white">
          Jelajahi layanan <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}
