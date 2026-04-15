import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import CategoryTabs from '@/components/layout/CategoryTabs'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Ticker />
      <Navbar />
      {/* CategoryTabs otomatis hanya muncul di /news — logic ada di dalam komponen */}
      <CategoryTabs />
      <main>{children}</main>
      <Footer />
      <Fab />
    </>
  )
}
