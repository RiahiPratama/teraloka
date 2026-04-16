import Ticker            from '@/components/layout/Ticker'
import Navbar            from '@/components/layout/Navbar'
import Hero              from '@/components/home/Hero'
import HeroMobile        from '@/components/home/HeroMobile'
import SpeedboatCard     from '@/components/home/SpeedboatCard'
import ServiceShortcuts  from '@/components/home/ServiceShortcuts'
import StatsBar          from '@/components/home/StatsBar'
import PWAInstallBanner  from '@/components/pwa/PWAInstallBanner'
import PersonalizedNews  from '@/components/home/PersonalizedNews'
import ContextualServices from '@/components/home/ContextualServices'
import ServicesEcosystem from '@/components/home/ServicesEcosystem'
import SocialProof       from '@/components/home/SocialProof'
import CTASection        from '@/components/home/CTASection'
import Footer            from '@/components/layout/Footer'
import Fab               from '@/components/layout/Fab'

export default function HomePage() {
  return (
    <>
      {/* 01 — Ticker berjalan */}
      <Ticker />

      {/* 02 — Navigasi */}
      <Navbar />

      <main>
        {/* 03a — Hero Desktop: split layout foto Ternate + search */}
        <div className="hidden md:block">
          <Hero />
        </div>

        {/* 03b — Hero Mobile: foto background + tagline saja */}
        <HeroMobile />

        {/* 04 — Speedboat Card: di bawah Hero, mobile only */}
        <div className="md:hidden" style={{ padding: '0 16px 12px' }}>
          <SpeedboatCard />
        </div>

        {/* 05 — 2 Card Sekunder: BAKOS + BASUMBANG, mobile only */}
        <div
          className="md:hidden"
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, padding: '0 16px 12px',
          }}
        >
          {/* BAKOS */}
          <a href="/kos" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid rgba(27,107,74,0.15)',
              borderRadius: 16, padding: '14px',
              boxShadow: '0 4px 16px rgba(27,107,74,0.08)',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#1B6B4A',
                background: 'rgba(27,107,74,0.08)',
                padding: '2px 8px', borderRadius: 99,
                display: 'inline-block', marginBottom: 8,
              }}>BAKOS</span>
              <div style={{ fontSize: 15, marginBottom: 4 }}>🏠</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                Cari Kos
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                Mulai 450rb/bln
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1B6B4A' }}>
                Lihat Kos →
              </div>
            </div>
          </a>

          {/* BASUMBANG */}
          <a href="/fundraising" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1.5px solid rgba(232,150,58,0.15)',
              borderRadius: 16, padding: '14px',
              boxShadow: '0 4px 16px rgba(232,150,58,0.08)',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#E8963A',
                background: 'rgba(232,150,58,0.08)',
                padding: '2px 8px', borderRadius: 99,
                display: 'inline-block', marginBottom: 8,
              }}>BASUMBANG</span>
              <div style={{ fontSize: 15, marginBottom: 4 }}>💚</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                Donasi Aktif
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                Bantu yang butuh
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E8963A' }}>
                Lihat Donasi →
              </div>
            </div>
          </a>
        </div>

        {/* 06 — Service Pills horizontal scroll (mobile only) */}
        <div className="md:hidden">
          <ServiceShortcuts />
        </div>

        {/* 07 — Stats Bar: cuaca, jadwal, berita, pengguna */}
        <StatsBar />

        {/* 08 — PWA Install Banner (mobile only, muncul kunjungan ke-2) */}
        <PWAInstallBanner />

        {/* 09 — Untukmu Hari Ini: live articles */}
        <PersonalizedNews />

        {/* 10 — Butuh sesuatu hari ini? contextual services */}
        <ContextualServices />

        {/* 11 — Layanan TeraLoka: services ecosystem grid */}
        <ServicesEcosystem />

        {/* 12 — Dipercaya oleh Warga Maluku Utara: social proof */}
        <SocialProof />

        {/* 13 — CTA: Jadi Bagian dari Gerakan Digital Maluku Utara */}
        <CTASection />
      </main>

      {/* 14 — Footer */}
      <Footer />

      {/* 15 — FAB laporan */}
      <Fab />
    </>
  )
}
