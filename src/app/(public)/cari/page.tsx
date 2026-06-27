// ════════════════════════════════════════════════════════════════
// /cari — Halaman hasil Federated Search (SERVER component)
// ════════════════════════════════════════════════════════════════
// Konsumsi kontrak BE: GET ${API}/search?q=&limit= →
//   { success, data: { query, groups:[{vertical,label,total,items:[…]}], action } }
// href item DIBANGUN DI FE (BE cuma balikin vertical + slug/id).
// ════════════════════════════════════════════════════════════════

import Link from 'next/link'
import CariSearchBar from './CariSearchBar'

export const metadata = {
  title: 'Cari — TeraLoka',
  description: 'Cari berita, kos, donasi, dan laporan warga Maluku Utara dalam satu tempat.',
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1'

// Warna aksen per vertical — Pattern AAP (hex kanonik, JANGAN ngarang)
const VERTICAL_ACCENT: Record<string, string> = {
  bakabar: '#8B5CF6',
  bakos: '#D97706',
  badonasi: '#EC4899',
  balapor: '#DC2626',
}

interface SearchItem {
  id: string
  slug: string | null
  title: string
  subtitle: string | null
  thumb: string | null
}
interface SearchGroup {
  vertical: string
  label: string
  total: number
  items: SearchItem[]
}
interface SearchAction {
  type: string
  label: string
}
interface SearchData {
  query: string
  groups: SearchGroup[]
  action: SearchAction | null
}

// href item — LOCK di FE per vertical
function hrefFor(vertical: string, item: SearchItem): string {
  switch (vertical) {
    case 'bakabar':
      return item.slug ? `/bakabar/${item.slug}` : '/bakabar'
    case 'bakos':
      return item.slug ? `/bakos/${item.slug}` : '/bakos'
    case 'badonasi':
      return item.slug ? `/fundraising/${item.slug}` : '/fundraising'
    case 'balapor':
      return '/reports/peta' // BELUM ada detail view per-laporan
    default:
      return '/'
  }
}

async function fetchSearch(query: string): Promise<{ data: SearchData | null; errored: boolean }> {
  try {
    const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
    const json = await res.json()
    if (json?.success && json.data) return { data: json.data as SearchData, errored: false }
    return { data: null, errored: true }
  } catch {
    return { data: null, errored: true }
  }
}

// ─── UI bits ─────────────────────────────────────────────────────

function PageShell({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '88px 16px 64px' }}>
      <h1
        className="font-sora"
        style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text, #111827)', marginBottom: 16 }}
      >
        Cari di TeraLoka
      </h1>
      <CariSearchBar defaultValue={q} />
      <div style={{ marginTop: 28 }}>{children}</div>
    </main>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted, #6B7280)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
      <p style={{ fontSize: 15, fontWeight: 600 }}>{text}</p>
    </div>
  )
}

function ActionCard({ action }: { action: SearchAction }) {
  // CUMA ojek (sesuai kontrak); warna teal kanonik BALAJU #0F766E
  if (action.type !== 'ojek') return null
  return (
    <Link
      href="/balaju"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: '#0F766E', color: '#fff', textDecoration: 'none',
        borderRadius: 16, padding: '16px 18px', marginBottom: 28,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Mau pesan ojek?</div>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>BALAJU — ojek lokal Maluku Utara</div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{action.label} →</span>
    </Link>
  )
}

function ItemCard({ vertical, item }: { vertical: string; item: SearchItem }) {
  const accent = VERTICAL_ACCENT[vertical] ?? '#6B7280'
  const initial = (item.title?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <Link
      href={hrefFor(vertical, item)}
      style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: 10, borderRadius: 14,
        border: '1px solid var(--border-light, #E5E7EB)', background: '#fff',
        textDecoration: 'none',
      }}
    >
      {item.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumb}
          alt=""
          width={56}
          height={56}
          style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#F3F4F6' }}
        />
      ) : (
        <div
          style={{
            width: 56, height: 56, borderRadius: 10, flexShrink: 0,
            background: accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800,
          }}
        >
          {initial}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text, #111827)', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}
        >
          {item.title}
        </div>
        {item.subtitle && (
          <div
            style={{
              fontSize: 12, color: 'var(--text-muted, #6B7280)', marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {item.subtitle}
          </div>
        )}
      </div>
    </Link>
  )
}

function GroupBlock({ group }: { group: SearchGroup }) {
  const accent = VERTICAL_ACCENT[group.vertical] ?? '#6B7280'
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <h2 className="font-sora" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text, #111827)' }}>
          {group.label}
          <span style={{ color: 'var(--text-muted, #6B7280)', fontWeight: 600 }}> · {group.total}</span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.items.map((item) => (
          <ItemCard key={`${group.vertical}-${item.id}`} vertical={group.vertical} item={item} />
        ))}
      </div>
    </section>
  )
}

// ─── Page ────────────────────────────────────────────────────────

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const query = (q ?? '').trim()

  // Guard: kosong / < 2 char → empty state ramah
  if (query.length < 2) {
    return (
      <PageShell q={query}>
        <EmptyHint text="Ketik sesuatu buat mulai cari — berita, kos, donasi, atau laporan." />
      </PageShell>
    )
  }

  const { data, errored } = await fetchSearch(query)

  if (errored || !data) {
    return (
      <PageShell q={query}>
        <EmptyHint text="Pencarian lagi bermasalah. Coba lagi sebentar ya." />
      </PageShell>
    )
  }

  const hasGroups = data.groups.length > 0

  return (
    <PageShell q={query}>
      {data.action && <ActionCard action={data.action} />}

      {hasGroups ? (
        data.groups.map((group) => <GroupBlock key={group.vertical} group={group} />)
      ) : (
        <EmptyHint text={`Gak nemu apa-apa buat “${query}”.`} />
      )}
    </PageShell>
  )
}
