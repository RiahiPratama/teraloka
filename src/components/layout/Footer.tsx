'use client'

import Link from 'next/link'
import Logo from '@/components/ui/Logo'

const FOOTER_LINKS = {
  layanan: [
    { label: 'BAKABAR Berita', href: '/news' },
    { label: 'BALAPOR Publik', href: '/reports' },
    { label: 'BAPASIAR Transport', href: '/speed' },
    { label: 'BAKOS Kos-Kosan', href: '/kos' },
    { label: 'BADONASI Donasi', href: '/fundraising' },
  ],
  perusahaan: [
    { label: 'Tentang Kami', href: '/tentang' },
    { label: 'Karir', href: '/karir' },
    { label: 'Kontak Kami', href: '/kontak' },
    { label: 'Media Kit', href: '/media-kit' },
    { label: 'Blog', href: '/blog' },
  ],
  legal: [
    { label: 'Kebijakan Privasi', href: '/privasi' },
    { label: 'Syarat & Ketentuan', href: '/syarat' },
    { label: 'Lisensi Data', href: '/lisensi' },
    { label: 'Pedoman Komunitas', href: '/pedoman' },
  ],
}

const SOCIAL = [
  {
    label: 'Facebook',
    href: 'https://facebook.com/teraloka',
    icon: (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/teraloka',
    icon: (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/teraloka',
    icon: (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
]

export default function Footer() {
  return (
    <footer style={{
      background: '#fff',
      borderTop: '1px solid var(--border-light)',
      padding: '52px 24px 28px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Fix: brand full width mobile, 2 kolom tablet, 4 kolom desktop */}
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 md:gap-10 mb-10">

          {/* Brand — full width di mobile */}
          <div className="col-span-2 md:col-span-1">
            <Logo height={22} />
            <p style={{
              marginTop: 12, fontSize: 13, lineHeight: 1.7,
              color: 'var(--text-muted)', maxWidth: 240,
            }}>
              Digital Curator of the Archipelago.
              Menghubungkan Maluku Utara dalam satu genggaman.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  title={s.label}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#0891B2'
                    el.style.borderColor = '#0891B2'
                    el.style.transform = 'scale(1.1)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'var(--primary)'
                    el.style.borderColor = 'var(--primary)'
                    el.style.transform = 'scale(1)'
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Layanan */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: 14 }}>
              Layanan
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FOOTER_LINKS.layanan.map(l => (
                <li key={l.href}>
                  <Link href={l.href} style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Perusahaan */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: 14 }}>
              Perusahaan
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FOOTER_LINKS.perusahaan.map(l => (
                <li key={l.href}>
                  <Link href={l.href} style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text)', marginBottom: 14 }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FOOTER_LINKS.legal.map(l => (
                <li key={l.href}>
                  <Link href={l.href} style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, paddingTop: 20,
          borderTop: '1px solid var(--border-light)',
          flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-light)' }}>
            © 2026 TeraLoka · Digital Curator of the Archipelago · Maluku Utara, Indonesia
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['TERNATE', 'TIDORE', 'SOFIFI', 'TOBELO'].map(city => (
              <span key={city} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--text-light)',
              }}>
                <svg viewBox="0 0 24 24" width={10} height={10} fill="none"
                  stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
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
