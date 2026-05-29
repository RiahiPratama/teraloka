// TUJUAN: src/app/(public)/kontak/page.tsx
// (taro ke folder kontak/ lalu rename jadi page.tsx)
import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { LEGAL_CONFIG } from '@/components/public/legal/legalContent'

// ⚙️ ISI: nomor WhatsApp resmi TeraLoka (format internasional tanpa +, mis. 62812xxxx)
const WHATSAPP = '62800000000' // ← GANTI dengan nomor asli sebelum go-live

export const metadata: Metadata = {
  title: 'Kontak Kami — TeraLoka',
  description:
    'Hubungi TeraLoka untuk pertanyaan umum, urusan privasi/data pribadi, hak jawab editorial, atau kolaborasi.',
}

const KANAL = [
  {
    judul: 'Pertanyaan Umum',
    isi: 'Pertanyaan, masukan, kerja sama, atau apa pun seputar TeraLoka.',
    email: LEGAL_CONFIG.emailKontak,
  },
  {
    judul: 'Privasi & Data Pribadi',
    isi: 'Permohonan akses, koreksi, atau penghapusan data Anda (sesuai UU PDP).',
    email: LEGAL_CONFIG.emailPrivasi,
  },
  {
    judul: 'Hak Jawab & Koreksi',
    isi: 'Keberatan atau klarifikasi atas konten berita maupun laporan warga.',
    email: LEGAL_CONFIG.emailHakJawab,
  },
]

export default function KontakPage() {
  return (
    <main style={{ background: '#fff', minHeight: '70vh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 72px' }}>

        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-light)', textDecoration: 'none', marginBottom: 24,
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Beranda
        </Link>

        <div style={{ marginBottom: 6 }}>
          <Logo height={24} />
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.02em', lineHeight: 1.2, margin: '18px 0 12px',
        }}>
          Hubungi Kami
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: 36 }}>
          Pilih kanal yang sesuai dengan keperluan Anda. Kami tim kecil yang
          berbasis di Ternate — kami berusaha membalas secepat mungkin, biasanya
          dalam beberapa hari kerja.
        </p>

        {/* Kanal email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {KANAL.map(k => (
            <a key={k.email} href={`mailto:${k.email}`} style={{
              display: 'block', padding: '18px 20px', borderRadius: 12,
              border: '1px solid var(--border-light)', textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{k.judul}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 8 }}>{k.isi}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>{k.email}</div>
            </a>
          ))}
        </div>

        {/* WhatsApp */}
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginTop: 22, padding: '14px 20px', borderRadius: 12,
          background: 'var(--primary)', color: '#fff', textDecoration: 'none',
          fontSize: 15, fontWeight: 700,
        }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
          </svg>
          Chat via WhatsApp
        </a>

        {/* Lokasi */}
        <div style={{
          marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-light)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none"
            stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{LEGAL_CONFIG.alamat}</span>
        </div>
      </div>
    </main>
  )
}
