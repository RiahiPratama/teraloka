'use client';

import Link from 'next/link';
import { useEffect, useState, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const Icons = {
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Wallet: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>,
  CheckCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Heart: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Dollar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  ArrowRight: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
};

function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function AdminFundingDashboard() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [stats, setStats] = useState({
    pending_campaigns: 0, pending_donations: 0,
    total_raised: 0, active_campaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    Promise.all([
      fetch(`${API_URL}/funding/admin/campaigns?status=pending_review&limit=1`, {
        headers: { Authorization: `Bearer ${tk}` },
      }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/donations?status=pending&limit=1`, {
        headers: { Authorization: `Bearer ${tk}` },
      }).then(r => r.json()).catch(() => null),
      // Single source of truth — Hono BRAIN does aggregation
      fetch(`${API_URL}/funding/stats/public`).then(r => r.json()).catch(() => null),
    ]).then(([pC, pD, statsRes]) => {
      setStats({
        pending_campaigns: pC?.meta?.total ?? 0,
        pending_donations: pD?.meta?.total ?? 0,
        total_raised: statsRes?.data?.total_collected ?? 0,
        active_campaigns: statsRes?.data?.active_campaigns ?? 0,
      });
      setLoading(false);
    });
  }, [token]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#EC4899', letterSpacing: '0.1em', marginBottom: 4 }}>
          BADONASI
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
          Dashboard Admin
        </h1>
        <p style={{ fontSize: 14, color: t.textDim }}>
          Kelola kampanye, donasi, dan pengaturan platform penggalangan dana TeraLoka.
        </p>
      </div>

      <AdminFundingSubNav />

      {/* Alert */}
      {(stats.pending_campaigns > 0 || stats.pending_donations > 0) && !loading && (
        <div style={{
          marginBottom: 24,
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 12, padding: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#F59E0B',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icons.Clock />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>
              Ada yang perlu diverifikasi
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: t.textDim }}>
              {stats.pending_campaigns > 0 && (
                <Link
                  href="/admin/funding/campaigns?status=pending_review"
                  style={{ color: t.textPrimary, fontWeight: 600, textDecoration: 'underline' }}
                >
                  {stats.pending_campaigns} kampanye menunggu verifikasi
                </Link>
              )}
              {stats.pending_donations > 0 && (
                <Link
                  href="/admin/funding/donations?status=pending"
                  style={{ color: t.textPrimary, fontWeight: 600, textDecoration: 'underline' }}
                >
                  {stats.pending_donations} donasi menunggu verifikasi
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 32,
      }}>
        <StatCard t={t} icon={<Icons.Clock />} label="Kampanye Pending"
          value={loading ? '...' : stats.pending_campaigns.toLocaleString('id-ID')}
          accent="#F59E0B" highlight={stats.pending_campaigns > 0} />
        <StatCard t={t} icon={<Icons.Clock />} label="Donasi Pending"
          value={loading ? '...' : stats.pending_donations.toLocaleString('id-ID')}
          accent="#F59E0B" highlight={stats.pending_donations > 0} />
        <StatCard t={t} icon={<Icons.Wallet />} label="Total Terkumpul"
          value={loading ? '...' : formatRupiah(stats.total_raised)} accent="#0891B2" />
        <StatCard t={t} icon={<Icons.CheckCircle />} label="Kampanye Aktif"
          value={loading ? '...' : stats.active_campaigns.toLocaleString('id-ID')} accent="#10B981" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, marginBottom: 16 }}>
          Aksi Cepat
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16,
        }}>
          <ActionTile t={t} href="/admin/funding/campaigns" icon={<Icons.Heart />}
            title="Kelola Kampanye"
            desc="Verifikasi, approve, atau tolak kampanye yang diajukan"
            badge={stats.pending_campaigns} gradient="linear-gradient(135deg, #EC4899, #BE185D)" />
          <ActionTile t={t} href="/admin/funding/donations" icon={<Icons.Dollar />}
            title="Kelola Donasi"
            desc="Verifikasi donasi masuk dari bukti transfer donatur"
            badge={stats.pending_donations} gradient="linear-gradient(135deg, #EC4899, #BE185D)" />
          <ActionTile t={t} href="/admin/funding/settings" icon={<Icons.Settings />}
            title="Pengaturan"
            desc="Konfigurasi nilai zakat, fee operasional, dan parameter sistem"
            gradient="linear-gradient(135deg, #475569, #1E293B)" />
        </div>
      </div>

    </div>
  );
}

function StatCard({ t, icon, label, value, accent, highlight }: {
  t: any; icon: React.ReactNode; label: string; value: string;
  accent: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${highlight ? accent + '55' : t.sidebarBorder}`,
      borderRadius: 16, padding: 20,
      boxShadow: highlight ? `0 0 0 3px ${accent}10` : 'none',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: accent + '18', color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 12, color: t.textDim, fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>{value}</p>
    </div>
  );
}

function ActionTile({ t, href, icon, title, desc, badge, gradient }: {
  t: any; href: string; icon: React.ReactNode;
  title: string; desc: string; badge?: number; gradient: string;
}) {
  return (
    <Link href={href} style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 20, textDecoration: 'none',
      display: 'block', transition: 'border-color .15s, box-shadow .15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: gradient, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {icon}
        </div>
        {!!badge && badge > 0 && (
          <span style={{
            background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444',
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
          }}>
            {badge} pending
          </span>
        )}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 12, color: t.textDim, lineHeight: 1.5, marginBottom: 12 }}>{desc}</p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#EC4899' }}>
        Buka <Icons.ArrowRight />
      </div>
    </Link>
  );
}
