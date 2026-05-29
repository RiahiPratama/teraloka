// TUJUAN: src/app/(public)/tentang/page.tsx
// (taro ke folder tentang/ lalu rename jadi page.tsx)
import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'

export const metadata: Metadata = {
  title: 'Tentang Kami — TeraLoka',
  description:
    'TeraLoka adalah platform digital hiperlokal untuk Maluku Utara — menghubungkan warga lewat berita, laporan publik, donasi, dan layanan lokal dalam satu genggaman.',
}

const LAYANAN = [
  { nama: 'BAKABAR', desc: 'Berita lokal Maluku Utara dengan integritas editorial.' },
  { nama: 'BALAPOR', desc: 'Laporan warga yang diverifikasi — suara akar rumput.' },
  { nama: 'BADONASI', desc: 'Penggalangan dana untuk sesama, transparan.' },
  { nama: 'BAPASIAR', desc: 'Informasi transportasi laut antarpulau.' },
  { nama: 'BAKOS', desc: 'Cari kos & hunian di sekitar Anda.' },
]

const NILAI = [
  { judul: 'Lokal sepenuhnya', isi: 'Dibangun di Ternate, untuk warga Maluku Utara — bukan adaptasi platform luar.' },
  { judul: 'Transparan', isi: 'Kami terbuka soal cara kerja, data, dan siapa yang bertanggung jawab.' },
  { judul: 'Independen', isi: 'Suara warga tidak ditentukan oleh kepentingan satu pihak.' },
]

export default function TentangPage() {
  return (
    <main style={{ background: '#fff', minHeight: '70vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 72px' }}>

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

        {/* Hero */}
        <div style={{ marginBottom: 8 }}>
          <Logo height={26} />
        </div>
        <h1 style={{
          fontSize: 34, fontWeight: 800, color: 'var(--text)',
          letterSpacing: '-0.02em', lineHeight: 1.15, margin: '20px 0 14px',
        }}>
          Menghubungkan Maluku Utara<br />dalam satu genggaman.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: 600 }}>
          TeraLoka adalah platform digital hiperlokal untuk wilayah Maluku Utara —
          tempat warga mendapat berita, melaporkan masalah, menggalang bantuan,
          dan menemukan layanan di sekitarnya, dalam satu aplikasi.
        </p>

        {/* Misi */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Kenapa TeraLoka ada
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--text-muted)' }}>
            Informasi dan layanan publik di daerah kepulauan sering tersebar, lambat,
            dan sulit dijangkau. TeraLoka hadir untuk merapikannya: satu ruang sipil
            tempat warga bisa mengetahui apa yang terjadi di sekitarnya, bersuara atas
            masalah yang mereka temui, dan saling membantu — dengan cara yang terbuka
            dan bisa dipertanggungjawabkan.
          </p>
        </section>

        {/* Layanan */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
            Apa yang kami sediakan
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {LAYANAN.map(l => (
              <div key={l.nama} style={{
                display: 'flex', gap: 14, alignItems: 'baseline',
                paddingBottom: 14, borderBottom: '1px solid var(--border-light)',
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: 'var(--primary)',
                  letterSpacing: '0.02em', minWidth: 92,
                }}>{l.nama}</span>
                <span style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-muted)' }}>{l.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Nilai */}
        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
            Yang kami pegang
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {NILAI.map(n => (
              <div key={n.judul}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>{n.judul}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-muted)', margin: 0 }}>{n.isi}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Transparansi badan hukum */}
        <section style={{
          marginTop: 40, padding: '18px 20px',
          background: 'rgba(232,150,58,0.06)',
          borderLeft: '3px solid var(--orange)', borderRadius: '0 10px 10px 0',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Soal status kami
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>
            TeraLoka saat ini dikelola sebagai sebuah inisiatif yang sedang dalam proses
            pembentukan badan hukum di Indonesia. Kami memilih untuk terbuka soal ini —
            sama seperti kami terbuka soal cara kami mengelola data Anda. Selengkapnya di{' '}
            <Link href="/privasi" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Kebijakan Privasi</Link>{' '}dan{' '}
            <Link href="/syarat" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Syarat &amp; Ketentuan</Link>.
          </p>
        </section>

        {/* CTA kontak */}
        <section style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>
            Punya pertanyaan, masukan, atau ingin berkolaborasi?
          </p>
          <Link href="/kontak" style={{
            display: 'inline-block', padding: '11px 26px', borderRadius: 10,
            background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
          }}>
            Hubungi Kami
          </Link>
        </section>
      </div>
    </main>
  )
}
