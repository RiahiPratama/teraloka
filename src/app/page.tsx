import Ticker             from '@/components/layout/Ticker'
import Navbar             from '@/components/layout/Navbar'
import Hero               from '@/components/home/Hero'
import KapalLokalCard     from '@/components/home/KapalLokalCard'
import ServicePills       from '@/components/home/ServicePills'
import StatsBar           from '@/components/home/StatsBar'
import PWAInstallBanner   from '@/components/pwa/PWAInstallBanner'
import PersonalizedNews   from '@/components/home/PersonalizedNews'
import ContextualServices from '@/components/home/ContextualServices'
import ServicesEcosystem  from '@/components/home/ServicesEcosystem'
import SocialProof        from '@/components/home/SocialProof'
import CTASection         from '@/components/home/CTASection'
import Footer             from '@/components/layout/Footer'
import Fab                from '@/components/layout/Fab'

export default function HomePage() {
  return (
    <>
      {/* 01 — Ticker berjalan */}
      <Ticker />

      {/* 02 — Navigasi */}
      <Navbar />

      <main>
        {/* 03 — Hero: desktop split layout + mobile 1 kolom */}
        <Hero />

        {/* 04 — Kapal Lokal Card: di bawah Hero, desktop + mobile */}
        <div style={{ padding: '16px 16px 12px', maxWidth: 640, margin: '0 auto' }}
          className="md:max-w-none md:px-6"
        >
          <KapalLokalCard />
        </div>

        {/* 05 — Service Pills: 4 pills scrollable, desktop + mobile */}
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ServicePills />
        </div>

        {/* 06 — Stats Bar: jadwal, berita, pengguna (tanpa cuaca — sudah ada di Hero + Ticker) */}
        <StatsBar />

        {/* 07 — PWA Install Banner (mobile only, muncul kunjungan ke-2) */}
        <PWAInstallBanner />

        {/* 08 — Untukmu Hari Ini: live articles */}
        <PersonalizedNews />

        {/* 09 — Butuh sesuatu hari ini? contextual services */}
        <ContextualServices />

        {/* 10 — Layanan TeraLoka: services ecosystem grid */}
        <ServicesEcosystem />

        {/* 11 — Dipercaya oleh Warga Maluku Utara: social proof */}
        <SocialProof />

        {/* 12 — CTA: Jadi Bagian dari Gerakan Digital Maluku Utara */}
        <CTASection />
      </main>

      {/* 13 — Footer */}
      <Footer />

      {/* 14 — FAB laporan */}
      <Fab />
    </>
  )
}
