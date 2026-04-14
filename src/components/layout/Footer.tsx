import Link from 'next/link'
import Logo from '@/components/ui/Logo'

const FOOTER_LINKS = {
  layanan: [
    { label: 'BAKABAR Berita', href: '/bakabar' },
    { label: 'BALAPOR Publik', href: '/balapor' },
    { label: 'BAPASIAR Transport', href: '/bapasiar' },
    { label: 'BAKOS Kos', href: '/bakos' },
    { label: 'BASUMBANG', href: '/basumbang' },
  ],
  perusahaan: [
    { label: 'Tentang Kami', href: '/tentang' },
    { label: 'Karir', href: '/karir' },
    { label: 'Kontak Kami', href: '/kontak' },
    { label: 'Pusat Bantuan', href: '/bantuan' },
  ],
  legal: [
    { label: 'Kebijakan Privasi', href: '/privasi' },
    { label: 'Syarat & Ketentuan', href: '/syarat' },
    { label: 'Lisensi Data', href: '/lisensi' },
  ],
}

const CITIES = ['TERNATE', 'TOBELO', 'SOFIFI']

export default function Footer() {
  return (
    <footer
      style={{
        background: '#fff',
        borderTop: '1px solid var(--border-light)',
        padding: '48px 24px 28px',
      }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-9">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo height={22} />
            <p className="mt-3 text-[13px] leading-relaxed max-w-[220px]" style={{ color: 'var(--text-muted)' }}>
              Digital Curator of the Celebes Sea. Menghubungkan Maluku Utara dalam satu genggaman.
            </p>
          </div>

          {/* Layanan */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text)' }}>
              Layanan
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.layanan.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] transition-colors duration-200 hover:text-indigo-600" style={{ color: 'var(--text-muted)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Perusahaan */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text)' }}>
              Perusahaan
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.perusahaan.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] transition-colors duration-200 hover:text-indigo-600" style={{ color: 'var(--text-muted)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text)' }}>
              Legal
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] transition-colors duration-200 hover:text-indigo-600" style={{ color: 'var(--text-muted)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row justify-between items-center gap-3 pt-5"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <p className="text-[11px]" style={{ color: 'var(--text-light)' }}>
            © 2026 TeraLoka · Digital Curator of the Celebes Sea · Maluku Utara, Indonesia
          </p>
          <div className="flex gap-4">
            {CITIES.map((city) => (
              <span
                key={city}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-light)' }}
              >
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
