import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Ticker />
      <Navbar />
      <main>{children}</main>
      <Footer />
      <Fab />
    </>
  )
}
