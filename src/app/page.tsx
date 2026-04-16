import Ticker          from '@/components/layout/Ticker'
import Navbar          from '@/components/layout/Navbar'
import Hero            from '@/components/home/Hero'
import HeroMobile      from '@/components/home/HeroMobile'
import ServiceShortcuts from '@/components/home/ServiceShortcuts'
import StatsBar        from '@/components/home/StatsBar'
import PWAInstallBanner from '@/components/pwa/PWAInstallBanner'
import PersonalizedNews from '@/components/home/PersonalizedNews'
import ContextualServices from '@/components/home/ContextualServices'
import ServicesEcosystem from '@/components/home/ServicesEcosystem'
import SocialProof     from '@/components/home/SocialProof'
import CTASection      from '@/components/home/CTASection'
import Footer          from '@/components/layout/Footer'
import Fab             from '@/components/layout/Fab'

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

        {/* 03b — Hero Mobile: card speedboat besar + 2 card sekunder */}
        <HeroMobile />

        {/* 04 — Service Pills horizontal scroll (mobile only) */}
        <div className="md:hidden">
          <ServiceShortcuts />
        </div>

        {/* 05 — Stats Bar: cuaca, jadwal, berita, pengguna */}
        <StatsBar />

        {/* 06 — PWA Install Banner (mobile only, muncul kunjungan ke-2) */}
        <PWAInstallBanner />

        {/* 07 — Untukmu Hari Ini: live articles */}
        <PersonalizedNews />

        {/* 08 — Butuh sesuatu hari ini? contextual services */}
        <ContextualServices />

        {/* 09 — Layanan TeraLoka: services ecosystem grid */}
        <ServicesEcosystem />

        {/* 10 — Dipercaya oleh Warga Maluku Utara: social proof */}
        <SocialProof />

        {/* 11 — CTA: Jadi Bagian dari Gerakan Digital Maluku Utara */}
        <CTASection />
      </main>

      {/* 12 — Footer */}
      <Footer />

      {/* 13 — FAB laporan */}
      <Fab />
    </>
  )
}
