import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

/**
 * FOUNDER COMMAND CENTER
 * 🔴/🟡/🟢 prioritized alerts + Go/No-Go auto-tracker
 * DEFAULT landing page admin
 */

async function getStats() {
  const supabase = await createClient();

  const [articles, reports, listings, campaigns, health] = await Promise.allSettled([
    supabase.from('articles').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('system_health_snapshots').select('*').order('created_at', { ascending: false }).limit(1),
  ]);

  return {
    totalArticles: articles.status === 'fulfilled' ? articles.value.count ?? 0 : 0,
    pendingReports: reports.status === 'fulfilled' ? reports.value.count ?? 0 : 0,
    activeListings: listings.status === 'fulfilled' ? listings.value.count ?? 0 : 0,
    activeCampaigns: campaigns.status === 'fulfilled' ? campaigns.value.count ?? 0 : 0,
    lastHealth: health.status === 'fulfilled' ? health.value.data?.[0] : null,
  };
}

const ADMIN_MENU = [
  { href: '/admin/content', label: 'BAKABAR CMS', emoji: '📰', description: 'Artikel & konten' },
  { href: '/admin/content?tab=reports', label: 'BALAPOR Moderasi', emoji: '📢', description: 'Review laporan warga' },
  { href: '/admin/transport', label: 'Transport', emoji: '🚤', description: 'Speed, Kapal, Ferry' },
  { href: '/admin/listings', label: 'Listing', emoji: '🏘️', description: 'Kos, Properti, Kendaraan, Jasa' },
  { href: '/admin/funding', label: 'BASUMBANG', emoji: '💚', description: 'Campaigns & donasi' },
  { href: '/admin/ticker', label: 'Ticker', emoji: '📢', description: 'News ticker' },
  { href: '/admin/users', label: 'Users', emoji: '👥', description: 'User & roles' },
  { href: '/admin/financial', label: 'Keuangan', emoji: '💰', description: 'Komisi & settlement' },
  { href: '/admin/trust-safety', label: 'Trust & Safety', emoji: '🛡️', description: 'Fraud flags & reports' },
  { href: '/admin/system-health', label: 'System Health', emoji: '🖥️', description: 'Monitoring infra' },
  { href: '/admin/notifications', label: 'Notifikasi', emoji: '📲', description: 'WA & push' },
  { href: '/admin/analytics', label: 'Analytics', emoji: '📊', description: 'PostHog data' },
];

export default async function CommandCenter() {
  const stats = await getStats();

  // Determine alerts
  const alerts: { level: '🔴' | '🟡' | '🟢'; text: string }[] = [];

  if (stats.pendingReports > 5) {
    alerts.push({ level: '🔴', text: `${stats.pendingReports} laporan BALAPOR menunggu moderasi` });
  } else if (stats.pendingReports > 0) {
    alerts.push({ level: '🟡', text: `${stats.pendingReports} laporan menunggu moderasi` });
  }

  if (stats.totalArticles === 0) {
    alerts.push({ level: '🟡', text: 'Belum ada artikel BAKABAR — buat konten pertama!' });
  }

  if (alerts.length === 0) {
    alerts.push({ level: '🟢', text: 'Semua sistem berjalan normal' });
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold">🎯 Command Center</h1>
      <p className="text-sm text-gray-500">Founder Dashboard</p>

      {/* Alerts */}
      <div className="mt-4 space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 text-sm ${
              alert.level === '🔴' ? 'bg-red-50 text-red-700' :
              alert.level === '🟡' ? 'bg-yellow-50 text-yellow-700' :
              'bg-green-50 text-green-700'
            }`}
          >
            {alert.level} {alert.text}
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.totalArticles}</p>
          <p className="text-xs text-gray-500">Artikel</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.pendingReports}</p>
          <p className="text-xs text-gray-500">Laporan Pending</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.activeListings}</p>
          <p className="text-xs text-gray-500">Listing Aktif</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
          <p className="text-xs text-gray-500">Campaign Aktif</p>
        </div>
      </div>

      {/* Admin menu */}
      <div className="mt-6 space-y-2">
        {ADMIN_MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 active:bg-gray-50"
          >
            <span className="text-xl">{item.emoji}</span>
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
