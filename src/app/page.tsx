import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/home/Hero'
import PersonalizedNews from '@/components/home/PersonalizedNews'
import ContextualServices from '@/components/home/ContextualServices'
import ServicesEcosystem from '@/components/home/ServicesEcosystem'
import SocialProof from '@/components/home/SocialProof'
import CTASection from '@/components/home/CTASection'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'

export default function HomePage() {
  return (
    <>
      {/* 01 — Ticker berjalan */}
      <Ticker />

      {/* 02 — Navigasi */}
      <Navbar />

      <main>
        {/* 03 — Hero: split layout foto Ternate + search */}
        <Hero />

        {/* 04 — Untukmu Hari Ini: live articles */}
        <PersonalizedNews />

        {/* 05 — Butuh sesuatu hari ini? contextual services */}
        <ContextualServices />

        {/* 06 — Layanan TeraLoka: services ecosystem grid */}
        <ServicesEcosystem />

        {/* 07 — Dipercaya oleh Warga Maluku Utara: social proof */}
        <SocialProof />

        {/* 08 — CTA: Jadi Bagian dari Gerakan Digital Maluku Utara */}
        <CTASection />
      </main>

      {/* 09 — Footer */}
      <Footer />

      {/* 10 — FAB laporan */}
      <Fab />
    </>
  )
}
