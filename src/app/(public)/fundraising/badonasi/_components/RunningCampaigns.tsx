// src/app/(public)/fundraising/badonasi/_components/RunningCampaigns.tsx
//
// Async server component. Fetch campaign AKTIF dari API publik, lalu:
//   - ada campaign  → render section "Sedang Berjalan" (grid CampaignCard)
//   - 0 campaign    → render empty-state "Jadilah penggalang pertama"
// Satu komponen, dua mode — jadi grid & empty-state tidak pernah muncul barengan.
//
// 🛡️ VERIFIKASI SEBELUM PAKAI (anti-sotoy):
//   1. ENDPOINT & ENV: pastikan cocok dengan cara /fundraising/page.tsx (list page)
//      fetch campaign. Backend route = GET /funding/campaigns (campaigns-public.ts
//      listCampaigns → status in ['active','completed'], urutan urgent dulu).
//      Sesuaikan `API_BASE` + path bila list page pakai env/path berbeda.
//   2. IMPORT CampaignCard: path di bawah relatif ke folder ini. Kalau CampaignCard
//      ada di fundraising/_components/, path '../../_components/CampaignCard' BENAR.
//      Kalau beda, betulkan.
//   3. SHAPE response: di-handle defensif (json.data | json.campaigns | array).
//
// Caching: ISR revalidate 60s — campaign refresh tiap menit, halaman tetap cepat.
// Gagal fetch / API down → section disembunyikan (return null), LP tidak crash.

import Link from 'next/link'
import { Heart, BadgeCheck, Users, ArrowRight } from 'lucide-react'
import CampaignCard from '../../_components/CampaignCard'

// Samakan dengan page.tsx
const CREATE_CAMPAIGN = '/fundraising/badonasi/galang-dana'
const DONATE = '/fundraising'

const API_BASE = process.env.NEXT_PUBLIC_API_URL // mis. https://api.teraloka.com/api/v1
const LIMIT = 6

type Campaign = {
  id: string
  title: string
  slug: string
  category?: string
  beneficiary_name?: string
  target_amount: number
  collected_amount: number
  donor_count?: number
  cover_image_url?: string
  is_urgent?: boolean
  is_verified?: boolean
  status?: string
  deadline?: string
}

async function fetchActiveCampaigns(): Promise<Campaign[]> {
  if (!API_BASE) return []
  try {
    const res = await fetch(`${API_BASE}/funding/campaigns?limit=${LIMIT}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const json = await res.json()
    const list: Campaign[] = json?.data ?? json?.campaigns ?? (Array.isArray(json) ? json : [])
    // Hanya yang sedang berjalan (jaga-jaga bila API ikut kirim status lain)
    return Array.isArray(list) ? list.filter((c) => c.status !== 'completed').slice(0, LIMIT) : []
  } catch {
    return []
  }
}

export default async function RunningCampaigns() {
  const campaigns = await fetchActiveCampaigns()

  // ── MODE A: ADA campaign → grid "Sedang Berjalan" ─────────────
  if (campaigns.length > 0) {
    return (
      <section className="py-12 md:py-14 px-6 bg-[#F1F5F9]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end flex-wrap gap-3 mb-7">
            <div className="max-w-[640px]">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] mb-2.5 block">● SEDANG BERJALAN</span>
              <h2 className="font-sora text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A] leading-[1.15]">Kebaikan yang sedang berjalan.</h2>
              <p className="text-[14.5px] text-[#64748B] mt-2 leading-relaxed">Campaign warga Maluku Utara yang terverifikasi dan butuh uluran tanganmu sekarang. Setiap rupiah punya jejak terbuka.</p>
            </div>
            <Link href={DONATE} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#BE185D] bg-[#FDF2F8] border border-[#FBCFE8] px-[18px] py-[11px] rounded-xl whitespace-nowrap hover:bg-[#FCE7F3] transition">
              Lihat semua campaign <ArrowRight size={16} />
            </Link>
          </div>

          {/* HP: slider horizontal (swipe, hemat scroll) · Desktop: grid */}
          <div className="service-scroll flex gap-4 overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {campaigns.map((c) => (
              <div key={c.id} className="snap-start shrink-0 w-[80%] min-[480px]:w-[58%] sm:w-auto sm:shrink">
                <CampaignCard campaign={c} variant="card" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // ── MODE B: 0 campaign → empty-state "Jadilah pelopor" ────────
  return (
    <section className="py-12 md:py-14 px-6 bg-[#F1F5F9]">
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] block">BELUM ADA CAMPAIGN — JADILAH YANG PERTAMA</span>
          <h2 className="text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A] leading-tight">Jadilah penggalang pertama di Maluku Utara.</h2>
          <p className="text-[16px] text-[#64748B] leading-relaxed">Belum ada campaign yang jalan. Itu artinya satu hal: kursi pelopor masih kosong, dan bisa jadi milikmu. Satu langkah darimu bisa jadi awal kebaikan besar.</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={CREATE_CAMPAIGN} className="inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-xl text-[15px] font-bold hover:scale-[1.03] transition shadow-[0_18px_44px_-14px_rgba(190,24,93,0.40)]" style={{ background: 'linear-gradient(135deg,#EC4899,#BE185D)' }}>
              <Heart size={19} /> Buat Campaign Pertama
            </Link>
            <a href="#cara" className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] text-[#0F172A] px-6 py-3.5 rounded-xl text-[15px] font-bold hover:bg-[#F1F5F9] transition shadow-[0_10px_30px_-16px_rgba(33,26,29,0.14)]">Cara Kerja</a>
          </div>
        </div>
        <div className="bg-white rounded-[28px] border border-[#E5E7EB] overflow-hidden shadow-[0_22px_55px_-20px_rgba(33,26,29,0.22)]">
          <div className="relative h-40 grid place-items-center" style={{ background: 'linear-gradient(140deg,#FDE3F0,#FAD1E6)' }}>
            <Heart size={42} className="text-[#EC4899]/70" />
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/90 text-[#BE185D] text-[10.5px] font-extrabold tracking-wide px-3 py-1.5 rounded-full">ILUSTRASI — BUKAN CAMPAIGN NYATA</span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F5138] bg-[#E7F2EC] px-2.5 py-1 rounded-full"><BadgeCheck size={13} /> Terverifikasi</span>
              <span className="text-[11px] text-[#64748B]">· Kesehatan</span>
            </div>
            <h4 className="font-sora font-bold text-[18px] text-[#0F172A] leading-snug">Begini campaign-mu nanti tampil</h4>
            <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">Cerita yang menyentuh, progres terbuka, mudah dibagikan ke siapa saja.</p>
            <div className="mt-4 h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden"><div className="h-full w-[58%] rounded-full" style={{ background: 'linear-gradient(90deg,#EC4899,#BE185D)' }} /></div>
            <div className="flex justify-between items-end mt-2"><span className="text-[12px] text-[#64748B]">Terkumpul</span><span className="inline-flex items-center gap-1 text-[12px] text-[#64748B]"><Users size={14} /> donatur</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
