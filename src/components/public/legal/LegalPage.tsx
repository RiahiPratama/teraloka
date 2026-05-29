// src/components/public/legal/LegalPage.tsx
//
// Renderer bersama untuk halaman legal (/privasi /syarat /pedoman /lisensi).
// Server Component — statis, SEO-friendly, tanpa client JS.
// Styling mengikuti idiom Footer.tsx: inline style + CSS variables.
//
// Dependency: react-markdown + remark-gfm  →  npm i react-markdown remark-gfm
// (Jika BAKABAR sudah punya renderer markdown sendiri, ganti bagian <ReactMarkdown> dengan punya Anda.)

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import Logo from '@/components/ui/Logo'

interface LegalPageProps {
  title: string
  updated: string
  content: string
}

/* Komponen markdown → elemen ber-style (CSS var idiom Footer) */
const mdComponents: Components = {
  h2: ({ children }) => (
    <h2 style={{
      fontSize: 19, fontWeight: 700, color: 'var(--text)',
      marginTop: 36, marginBottom: 12, lineHeight: 1.35,
      letterSpacing: '-0.01em',
    }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{
      fontSize: 15, fontWeight: 700, color: 'var(--text)',
      marginTop: 22, marginBottom: 8,
    }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p style={{
      fontSize: 14.5, lineHeight: 1.75, color: 'var(--text-muted)',
      margin: '0 0 14px',
    }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 16px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 16px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-muted)' }}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>{children}</a>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: '0 0 16px', padding: '12px 16px',
      borderLeft: '3px solid var(--orange)',
      background: 'rgba(232,150,58,0.06)',
      borderRadius: '0 8px 8px 0',
      fontSize: 14, lineHeight: 1.7, color: 'var(--text)',
    }}>{children}</blockquote>
  ),
  hr: () => (
    <hr style={{ border: 0, borderTop: '1px solid var(--border-light)', margin: '28px 0' }} />
  ),
  code: ({ children }) => (
    <code style={{
      fontSize: 13, padding: '1px 5px', borderRadius: 5,
      background: 'var(--border-light)', color: 'var(--text)',
    }}>{children}</code>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>{children}</em>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '0 0 18px', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontSize: 13.5,
        border: '1px solid var(--border-light)',
      }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: 'var(--border-light)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th style={{
      textAlign: 'left', padding: '9px 12px', fontWeight: 700,
      color: 'var(--text)', borderBottom: '1px solid var(--border-light)',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '9px 12px', color: 'var(--text-muted)', lineHeight: 1.55,
      borderBottom: '1px solid var(--border-light)',
      borderRight: '1px solid var(--border-light)', verticalAlign: 'top',
    }}>{children}</td>
  ),
}

export function LegalPage({ title, updated, content }: LegalPageProps) {
  return (
    <main style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 72px' }}>

        {/* Breadcrumb + brand */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--text-light)', textDecoration: 'none', marginBottom: 20,
          }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Kembali ke Beranda
          </Link>
          <Logo height={20} />
        </div>

        {/* Header */}
        <header style={{ marginBottom: 8, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
          <h1 style={{
            fontSize: 30, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0,
          }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 10 }}>
            Terakhir diperbarui: {updated}
          </p>
        </header>

        {/* Body */}
        <article style={{ paddingTop: 8 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </article>

        {/* Footnote nav antar-dokumen */}
        <nav style={{
          marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-light)',
          display: 'flex', flexWrap: 'wrap', gap: 16,
        }}>
          {[
            { label: 'Kebijakan Privasi', href: '/privasi' },
            { label: 'Syarat & Ketentuan', href: '/syarat' },
            { label: 'Pedoman Komunitas', href: '/pedoman' },
            { label: 'Lisensi Data', href: '/lisensi' },
          ].map(l => (
            <Link key={l.href} href={l.href} prefetch={false} style={{
              fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600,
            }}>{l.label}</Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
