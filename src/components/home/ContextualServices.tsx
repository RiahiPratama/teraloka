import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1'

async function getPublicStats() {
  try {
    const res = await fetch(`${API}/funding/stats/public`, { next: { revalidate: 300 } })
    const data = await res.json()
    if (data.success && data.data) {
      return {
        active_campaigns: data.data.active_campaigns ?? 0,
        total_collected: data.data.total_collected ?? 0,
      }
    }
    return { active_campaigns: 0, total_collected: 0 }
  } catch {
    return { active_campaigns: 0, total_collected: 0 }
  }
}

function formatRupiah(n: number) {
  if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1).replace('.0', '')} M`
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1).replace('.0', '')} jt`
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)} rb`
  return `Rp ${n}`
}

export default async function ContextualServices() {
  const stats = await getPublicStats()

  return (
    <section style={{
      background: 'var(--surface-low)',
      borderTop: '1px solid var(--border-light)',
      borderBottom: '1px solid var(--border-light)',
      padding: '56px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 className="font-sora" style={{
            fontSize: 'clamp(22px, 3vw, 28px)',
            fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)',
          }}>
            Butuh sesuatu hari ini?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Layanan yang paling relevan untukmu saat ini.
          </p>
        </div>

        {/* Cards container — mobile horizontal carousel, desktop 3-col grid */}
        <div
          className="
            flex md:grid
            md:grid-cols-3
            overflow-x-auto md:overflow-visible
            snap-x snap-mandatory md:snap-none
            gap-4
            -mx-6 px-6 md:mx-0 md:px-0
            pb-2 md:pb-0
            scrollbar-none
          "
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >

          {/* Card 1: Speedboat (BAPASIAR) */}
          <div
            className="snap-center md:snap-align-none flex-shrink-0 md:flex-shrink"
            style={{
              background: '#fff', borderRadius: 20,
              border: '1px solid var(--border-light)', overflow: 'hidden',
              minWidth: 'min(85vw, 320px)',
            }}
          >
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(8,145,178,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#0891B2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z"/><path d="M2 16h20"/><path d="M3 19.5c4.5-1 9-1 13 0"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Jadwal Speedboat Hari Ini</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ternate ⇌ Sidangoli</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div style={{ background: 'var(--surface-low)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Berangkat hari ini</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>14:00 WIT</p>
                </div>
                <div style={{ background: 'var(--surface-low)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Mulai dari</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Rp 75.000</p>
                </div>
              </div>
            </div>
            <Link href="/bapasiar/speedboat" style={{
              display: 'block', textDecoration: 'none',
              background: 'rgba(8,145,178,0.07)',
              borderTop: '1px solid rgba(8,145,178,0.15)',
              padding: '12px 20px',
              fontSize: 13, fontWeight: 700, color: '#0891B2',
              textAlign: 'center',
            }}>
              Lihat Jadwal →
            </Link>
          </div>

          {/* Card 2: Kos (BAKOS) */}
          <div
            className="snap-center md:snap-align-none flex-shrink-0 md:flex-shrink"
            style={{
              background: 'var(--primary)', borderRadius: 20, overflow: 'hidden',
              minWidth: 'min(85vw, 320px)',
            }}
          >
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Kos Tersedia di Akehuda</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>8+ kos siap huni</p>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Mulai dari</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  Rp 450.000<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>/bulan</span>
                </p>
              </div>
            </div>
            <Link href="/bakos" style={{
              display: 'block', textDecoration: 'none',
              background: '#fff',
              padding: '12px 20px',
              fontSize: 13, fontWeight: 800, color: 'var(--primary)',
              textAlign: 'center',
            }}>
              Cari Kos →
            </Link>
          </div>

          {/* Card 3: Donasi (BADONASI) — full pink solid, signature service */}
          <div
            className="snap-center md:snap-align-none flex-shrink-0 md:flex-shrink"
            style={{
              background: 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)',
              borderRadius: 20, overflow: 'hidden',
              position: 'relative',
              minWidth: 'min(85vw, 320px)',
            }}
          >
            {/* Subtle decoration */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              pointerEvents: 'none',
            }} />

            <div style={{ padding: '20px 20px 0', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Donasi Aktif</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Bantu warga yang membutuhkan</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>Kampanye Aktif</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
                    {stats.active_campaigns > 0 ? stats.active_campaigns : '—'}
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>Total Terkumpul</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                    {formatRupiah(stats.total_collected)}
                  </p>
                </div>
              </div>
            </div>
            <Link href="/fundraising" style={{
              display: 'block', textDecoration: 'none',
              background: '#fff',
              padding: '12px 20px',
              fontSize: 13, fontWeight: 800, color: '#BE185D',
              textAlign: 'center',
              position: 'relative',
            }}>
              Lihat Donasi →
            </Link>
          </div>
        </div>

        {/* Mobile scroll hint — subtle 3 dots, mobile only */}
        <div
          className="flex md:hidden justify-center items-center gap-1.5 mt-4"
          aria-hidden="true"
        >
          <div style={{ width: 24, height: 4, borderRadius: 99, background: 'var(--text-muted)', opacity: 0.4 }} />
          <div style={{ width: 6, height: 4, borderRadius: 99, background: 'var(--text-muted)', opacity: 0.2 }} />
          <div style={{ width: 6, height: 4, borderRadius: 99, background: 'var(--text-muted)', opacity: 0.2 }} />
        </div>
      </div>
    </section>
  )
}
