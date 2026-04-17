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

function useCountUp(target: number, duration = 900, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (target === 0) return;
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

function KpiCard({ label, sublabel, total, badge, badgeLabel, icon, accent, href, delay = 0 }: {
  label: string; sublabel: string; total: number;
  badge?: number; badgeLabel?: string;
  icon: string; accent: string; href: string; delay?: number;
}) {
  const count = useCountUp(total, 900, delay);
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        {/* Accent blob */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10" style={{ background: accent }} />
        <div className="absolute bottom-0 left-0 h-0.5 w-full opacity-40" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />

        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg shadow-sm" style={{ background: accent }}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
          </div>
          {badge !== undefined && badge > 0 ? (
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#EF4444' }}>
              {badge} {badgeLabel}
            </span>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Oke</span>
          )}
        </div>

        <div className="text-3xl font-black text-gray-900 tracking-tight">{count.toLocaleString('id-ID')}</div>
        <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>
      </div>
    </Link>
  );
}

function ActionItem({ href, icon, label, desc, urgent }: {
  href: string; icon: string; label: string; desc: string; urgent?: boolean;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:translate-x-1 ${
        urgent ? 'border-red-100 bg-red-50/50 hover:bg-red-50' : 'border-gray-100 bg-white hover:bg-gray-50'
      }`}>
      <span className="material-symbols-outlined text-xl" style={{ color: urgent ? '#EF4444' : '#6B7280', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${urgent ? 'text-red-600' : 'text-gray-800'}`}>{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <span className="material-symbols-outlined text-gray-300 text-sm">arrow_forward_ios</span>
    </Link>
  );
}

function QuickOp({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href}
      className="group flex flex-col items-center gap-3 p-5 bg-gray-50 hover:bg-[#003526] rounded-2xl text-center transition-all duration-200">
      <div className="w-12 h-12 bg-white group-hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors shadow-sm">
        <span className="material-symbols-outlined text-[#003526] group-hover:text-white transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <span className="text-xs font-bold text-gray-700 group-hover:text-white transition-colors">{label}</span>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); else setError(d.error?.message || 'Gagal'); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const totalPending = stats
    ? stats.listings.pending + stats.articles.draft + stats.campaigns.pending + stats.reports.pending
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {greeting}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Berikut kondisi platform TeraLoka hari ini.
            {totalPending > 0 && (
              <span className="text-red-500 font-semibold"> {totalPending} item perlu perhatianmu.</span>
            )}
          </p>
        </div>
        {/* System status chip */}
        <div className="hidden md:flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-full shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-gray-600">System Online</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-600">Gagal memuat stats</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
          <button onClick={() => { setError(''); setLoading(true); }}
            className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50">
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      {loading && !error ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 animate-pulse">
              <div className="w-11 h-11 rounded-xl bg-gray-200 mb-4" />
              <div className="h-7 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-100 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Users" sublabel="Pengguna terdaftar" total={stats.users.total}
            icon="group" accent="#0891B2" href="/admin/users" delay={0} />
          <KpiCard label="Listing" sublabel="Kos, properti, kendaraan" total={stats.listings.total}
            badge={stats.listings.pending} badgeLabel="pending"
            icon="home" accent="#1B6B4A" href="/admin/listings" delay={80} />
          <KpiCard label="Artikel" sublabel="BAKABAR & laporan" total={stats.articles.total}
            badge={stats.articles.draft} badgeLabel="draft"
            icon="newspaper" accent="#8B5CF6" href="/office/newsroom/bakabar/hub" delay={160} />
          <KpiCard label="Kampanye" sublabel="BASUMBANG donasi" total={stats.campaigns.total}
            badge={stats.campaigns.pending} badgeLabel="pending"
            icon="volunteer_activism" accent="#E8963A" href="/admin/funding" delay={240} />
          <KpiCard label="Laporan" sublabel="BALAPOR masuk" total={stats.reports.total}
            badge={stats.reports.pending} badgeLabel="baru"
            icon="campaign" accent="#EF4444" href="/admin/reports" delay={320} />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Action Required */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>notification_important</span>
              <h2 className="text-sm font-bold text-gray-800">Perlu Tindakan</h2>
            </div>
            {totalPending > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalPending}</span>
            )}
          </div>
          <div className="p-3 space-y-2">
            {stats?.listings.pending ? (
              <ActionItem href="/admin/listings" icon="home" label={`${stats.listings.pending} Listing Pending`} desc="Review dan aktifkan" urgent />
            ) : null}
            {stats?.articles.draft ? (
              <ActionItem href="/office/newsroom/bakabar/hub" icon="newspaper" label={`${stats.articles.draft} Artikel Draft`} desc="Publish atau arsipkan" />
            ) : null}
            {stats?.campaigns.pending ? (
              <ActionItem href="/admin/funding" icon="volunteer_activism" label={`${stats.campaigns.pending} Kampanye Pending`} desc="Verifikasi BASUMBANG" urgent />
            ) : null}
            {stats?.reports.pending ? (
              <ActionItem href="/admin/reports" icon="campaign" label={`${stats.reports.pending} Laporan BALAPOR`} desc="Moderasi laporan masuk" urgent />
            ) : null}
            {totalPending === 0 && stats && (
              <div className="py-8 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-sm font-semibold text-emerald-600">Semua beres!</p>
                <p className="text-xs text-gray-400 mt-1">Tidak ada item yang perlu ditindak</p>
              </div>
            )}
            {loading && <div className="py-8 text-center text-sm text-gray-400">Memuat...</div>}
          </div>
        </div>

        {/* Daily Insight - gradient card */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-2xl p-8 text-white"
          style={{ background: 'linear-gradient(135deg, #003526 0%, #006b5e 100%)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#95d3ba] mb-4">Platform Insight</p>
            <h3 className="text-4xl font-black tracking-tight mb-2">TeraLoka</h3>
            <p className="text-[#95d3ba]/80 text-sm leading-relaxed mb-8">
              Super App untuk Maluku Utara. Data diambil real-time dari backend API.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Backend', value: 'Online ✓', icon: 'cloud_done' },
                { label: 'Database', value: 'Connected ✓', icon: 'storage' },
              ].map(item => (
                <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <span className="material-symbols-outlined text-[#95d3ba] text-sm">{item.icon}</span>
                  <p className="text-xs text-[#95d3ba]/60 mt-1">{item.label}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Operations */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Menu Cepat</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickOp href="/office/newsroom/bakabar/hub/new" icon="edit_note" label="Tulis Artikel" />
            <QuickOp href="/admin/users" icon="manage_accounts" label="Kelola Users" />
            <QuickOp href="/admin/audit-log" icon="history" label="Audit Log" />
            <QuickOp href="/admin/system-health" icon="health_and_safety" label="System Health" />
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 bg-[#003526]/5 border border-[#003526]/10 rounded-xl px-4 py-3">
        <span className="text-lg">🌊</span>
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-[#003526]">TeraLoka Admin</span>
          {' '}— Super App Maluku Utara.{' '}
          <Link href="/admin/system-health" className="text-[#0891B2] font-medium hover:underline">Cek system health →</Link>
        </p>
      </div>
    </div>
  );
}
