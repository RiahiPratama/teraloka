import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import CategoryTabs from '@/components/layout/CategoryTabs'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'
import BottomNav from '@/components/layout/BottomNav'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Ticker />
      <Navbar />
      <div style={{ paddingTop: 72 }}>
        <CategoryTabs />
        {/* pb-nav: padding bawah di mobile agar konten tidak ketutupan BottomNav */}
        <main className="pb-nav">{children}</main>
      </div>
      <Footer />
      <Fab />
      <BottomNav />
    </>
  )
}
