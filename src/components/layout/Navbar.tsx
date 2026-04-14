import Link from 'next/link'
import Logo from '@/components/ui/Logo'

const NAV_LINKS = [
  { label: 'BAKABAR', href: '/bakabar' },
  { label: 'BALAPOR', href: '/balapor' },
  { label: 'BAPASIAR', href: '/bapasiar' },
  { label: 'BAKOS', href: '/bakos' },
  { label: 'BASUMBANG', href: '/basumbang' },
]

export default function Navbar() {
  return (
    <header className="fixed top-8 left-0 right-0 z-50 px-6">
      <nav
        className="glass-nav max-w-[1200px] mx-auto flex items-center justify-between rounded-full px-6 py-2.5 pr-2.5"
        style={{
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(53,37,205,0.08)',
        }}
      >
        {/* Left: Logo + Links */}
        <div className="flex items-center">
          <Link href="/" aria-label="TeraLoka Home">
            <Logo height={26} />
          </Link>

          <div className="hidden md:flex items-center gap-1 ml-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/masuk"
            className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 hover:bg-gray-100/70"
            style={{ color: 'var(--text-muted)' }}
          >
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--primary)',
              boxShadow: '0 4px 16px rgba(53,37,205,0.25)',
            }}
          >
            Daftar Gratis
          </Link>
        </div>
      </nav>
    </header>
  )
}
