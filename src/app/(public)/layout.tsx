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
      {/*
        paddingTop = navbar-top(44) + navbar-height(52) - ticker-spacer(36) = 60px
        Ini mendorong CategoryTabs & konten turun agar tidak tertutup navbar fixed.
        Homepage (page.tsx) handle sendiri via Hero paddingTop — tidak kena efek ini.
      */}
      <div style={{ paddingTop: 72 }}>
        <CategoryTabs />
        <main>{children}</main>
      </div>
      <Footer />
      <Fab />
    </>
  )
}
