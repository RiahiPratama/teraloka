import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import Hero from '@/components/home/Hero'
import ServiceCarousel from '@/components/home/ServiceCarousel'
import BentoGrid from '@/components/home/BentoGrid'
import AllServices from '@/components/home/AllServices'
import StatsDark from '@/components/home/StatsDark'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'

export default function HomePage() {
  return (
    <>
      {/* ── Ticker berjalan ── */}
      <Ticker />

      {/* ── Navigasi ── */}
      <Navbar />

      {/* ── Hero + search ── */}
      <main>
        <Hero />

        {/* ── Service carousel (manual swipe) ── */}
        <ServiceCarousel />

        {/* ── Bento layanan unggulan ── */}
        <BentoGrid />

        {/* ── Grid semua layanan ── */}
        <AllServices />

        {/* ── Stats kepercayaan warga ── */}
        <StatsDark />
      </main>

      {/* ── Footer ── */}
      <Footer />

      {/* ── FAB laporan ── */}
      <Fab />
    </>
  )
}
