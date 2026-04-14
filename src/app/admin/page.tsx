'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface AdminStats {
  users: { total: number };
  listings: { total: number; pending: number };
  articles: { total: number; draft: number };
  campaigns: { total: number; pending: number };
  reports: { total: number; pending: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── Komponen Stat Card ──────────────────────────────────────────
function StatCard({
  label,
  sublabel,
  total,
  badgeCount,
  badgeLabel,
  icon,
  color,
  href,
  delay = 0,
}: {
  label: string;
  sublabel: string;
  total: number;
  badgeCount?: number;
  badgeLabel?: string;
  icon: string;
  color: { bg: string; icon: string; glow: string; badge: string };
  href: string;
  delay?: number;
}) {
  const [displayed, setDisplayed] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Counter animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      let start = 0;
      const end = total;
      if (end === 0) return;
      const duration = 800;
      const step = Math.ceil(end / (duration / 16));
      const counter = setInterval(() => {
        start += step;
        if (start >= end) {
          setDisplayed(end);
          clearInterval(counter);
        } else {
          setDisplayed(start);
        }
      }, 16);
      return () => clearInterval(counter);
    }, delay);
    return () => clearTimeout(timer);
  }, [total, delay]);

  return (
    <Link
      href={href}
      style={{
        display: 'block',
        textDecoration: 'none',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '20px',
          border: '1px solid #E5E7EB',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = `0 8px 24px ${color.glow}`;
          el.style.borderColor = color.icon;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = 'none';
          el.style.borderColor = '#E5E7EB';
        }}
      >
        {/* Decorative corner */}
        <div style={{
          position: 'absolute',
          top: -20, right: -20,
          width: 80, height: 80,
          borderRadius: '50%',
          background: color.bg,
          opacity: 0.4,
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 12,
            background: color.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            boxShadow: `0 4px 12px ${color.glow}`,
          }}>
            {icon}
          </div>
          {badgeCount !== undefined && badgeCount > 0 && (
            <div style={{
              background: color.badge,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 20,
              whiteSpace: 'nowrap',
            }}>
              {badgeCount} {badgeLabel}
            </div>
          )}
          {(badgeCount === 0 || badgeCount === undefined) && (
            <div style={{
              color: '#10B981',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 20,
              background: 'rgba(16,185,129,0.08)',
            }}>
              ✓ Oke
            </div>
          )}
        </div>

        <div style={{ color: '#111827', fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          {displayed.toLocaleString('id-ID')}
        </div>
        <div style={{ color: '#374151', fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>{sublabel}</div>

        <div style={{
          position: 'absolute',
          bottom: 0, left: 0,
          height: 3,
          width: '100%',
          background: `linear-gradient(to right, ${color.icon}, transparent)`,
          opacity: 0.5,
        }} />
      </div>
    </Link>
  );
}

// ── Komponen Quick Action ───────────────────────────────────────
function QuickAction({ href, icon, label, desc, urgent }: {
  href: string; icon: string; label: string; desc: string; urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: urgent ? 'rgba(239,68,68,0.04)' : '#fff',
        border: `1px solid ${urgent ? 'rgba(239,68,68,0.2)' : '#E5E7EB'}`,
        borderRadius: 12,
        textDecoration: 'none',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = urgent ? 'rgba(239,68,68,0.08)' : '#F9FAFB';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = urgent ? 'rgba(239,68,68,0.04)' : '#fff';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: urgent ? '#EF4444' : '#111827' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{desc}</div>
      </div>
      <span style={{ color: '#D1D5DB', fontSize: 16 }}>→</span>
    </Link>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message || 'Gagal ambil data');
        setStats(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const totalPending = stats
    ? (stats.listings.pending + stats.articles.draft + stats.campaigns.pending + stats.reports.pending)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Welcome ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#111827',
          letterSpacing: '-0.5px',
          fontFamily: "'Outfit', system-ui",
        }}>
          {greeting}, {user?.name?.split(' ')[0] || 'Admin'} 👋
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Berikut kondisi platform TeraLoka hari ini.
          {totalPending > 0 && (
            <span style={{ color: '#EF4444', fontWeight: 600 }}>
              {' '}Ada {totalPending} item yang perlu perhatianmu.
            </span>
          )}
        </p>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#EF4444', fontSize: 13 }}>Gagal memuat stats</div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>{error} — pastikan token valid dan backend aktif.</div>
          </div>
          <button
            onClick={() => { setError(''); setLoading(true); setStats(null); }}
            style={{
              marginLeft: 'auto', background: 'none', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#EF4444', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && !error && (
        <>
          <style>{`
            @keyframes shimmer {
              0% { background-position: -400px 0; }
              100% { background-position: 400px 0; }
            }
            .skeleton {
              background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
              background-size: 800px 100%;
              animation: shimmer 1.2s infinite;
              border-radius: 10px;
            }
          `}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16 }} />
                <div className="skeleton" style={{ width: '60%', height: 28, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '80%', height: 14, marginBottom: 4 }} />
                <div className="skeleton" style={{ width: '50%', height: 12 }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Stat Cards ── */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}>
          <StatCard
            label="Total Users"
            sublabel="Pengguna terdaftar"
            total={stats.users.total}
            icon="👥"
            color={{ bg: 'rgba(8,145,178,0.1)', icon: '#0891B2', glow: 'rgba(8,145,178,0.15)', badge: '#EF4444' }}
            href="/admin/users"
            delay={0}
          />
          <StatCard
            label="Listing"
            sublabel="Kos, properti, kendaraan"
            total={stats.listings.total}
            badgeCount={stats.listings.pending}
            badgeLabel="pending"
            icon="🏠"
            color={{ bg: 'rgba(27,107,74,0.1)', icon: '#1B6B4A', glow: 'rgba(27,107,74,0.15)', badge: '#F59E0B' }}
            href="/admin/listings"
            delay={80}
          />
          <StatCard
            label="Artikel"
            sublabel="BAKABAR & laporan"
            total={stats.articles.total}
            badgeCount={stats.articles.draft}
            badgeLabel="draft"
            icon="📰"
            color={{ bg: 'rgba(139,92,246,0.1)', icon: '#8B5CF6', glow: 'rgba(139,92,246,0.15)', badge: '#8B5CF6' }}
            href="/admin/content"
            delay={160}
          />
          <StatCard
            label="Kampanye"
            sublabel="BASUMBANG donasi"
            total={stats.campaigns.total}
            badgeCount={stats.campaigns.pending}
            badgeLabel="pending"
            icon="❤️"
            color={{ bg: 'rgba(232,150,58,0.1)', icon: '#E8963A', glow: 'rgba(232,150,58,0.15)', badge: '#E8963A' }}
            href="/admin/funding"
            delay={240}
          />
          <StatCard
            label="Laporan"
            sublabel="BALAPOR masuk"
            total={stats.reports.total}
            badgeCount={stats.reports.pending}
            badgeLabel="baru"
            icon="🚨"
            color={{ bg: 'rgba(239,68,68,0.1)', icon: '#EF4444', glow: 'rgba(239,68,68,0.15)', badge: '#EF4444' }}
            href="/admin/content"
            delay={320}
          />
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Perlu Tindakan */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Perlu Tindakan</h2>
            {totalPending > 0 && (
              <div style={{
                marginLeft: 'auto',
                background: '#EF4444',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 20,
              }}>
                {totalPending}
              </div>
            )}
          </div>
          <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stats?.listings.pending ? (
              <QuickAction
                href="/admin/listings"
                icon="🏠"
                label={`${stats.listings.pending} Listing Menunggu Approve`}
                desc="Review dan aktifkan listing baru"
                urgent
              />
            ) : null}
            {stats?.articles.draft ? (
              <QuickAction
                href="/admin/content"
                icon="📰"
                label={`${stats.articles.draft} Artikel Draft`}
                desc="Publish atau arsipkan artikel"
              />
            ) : null}
            {stats?.campaigns.pending ? (
              <QuickAction
                href="/admin/funding"
                icon="❤️"
                label={`${stats.campaigns.pending} Kampanye Pending`}
                desc="Verifikasi kampanye BASUMBANG"
                urgent
              />
            ) : null}
            {stats?.reports.pending ? (
              <QuickAction
                href="/admin/content"
                icon="🚨"
                label={`${stats.reports.pending} Laporan BALAPOR Baru`}
                desc="Moderasi laporan masuk"
                urgent
              />
            ) : null}
            {totalPending === 0 && stats && (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#10B981',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Semua beres!</div>
                <div style={{ color: '#9CA3AF', fontSize: 12 }}>Tidak ada item yang perlu ditindak</div>
              </div>
            )}
            {loading && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Memuat...
              </div>
            )}
          </div>
        </div>

        {/* Menu Cepat */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚀</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Menu Cepat</h2>
          </div>
          <div style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <QuickAction href="/admin/content/new" icon="✍️" label="Tulis Artikel Baru" desc="Buat konten BAKABAR" />
            <QuickAction href="/admin/users" icon="👥" label="Kelola Users" desc="Lihat & upgrade role user" />
            <QuickAction href="/admin/ticker" icon="📡" label="Update Ticker" desc="Running text halaman utama" />
            <QuickAction href="/admin/system-health" icon="🔧" label="System Health" desc="Monitor API & database" />
            <QuickAction href="/admin/analytics" icon="📊" label="Analytics" desc="Trafik & engagement data" />
          </div>
        </div>
      </div>

      {/* ── Footer Info ── */}
      <div style={{
        marginTop: 24,
        padding: '12px 16px',
        background: 'rgba(27,107,74,0.04)',
        border: '1px solid rgba(27,107,74,0.1)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>🌊</span>
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          <span style={{ fontWeight: 600, color: '#1B6B4A' }}>TeraLoka Admin</span>
          {' '}— Super App untuk Maluku Utara. Data diambil real-time dari backend API.{' '}
          <Link href="/admin/system-health" style={{ color: '#0891B2', fontWeight: 500 }}>
            Cek system health →
          </Link>
        </p>
      </div>

    </div>
  );
}
