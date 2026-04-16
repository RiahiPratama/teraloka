'use client';

import { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// Maluku Utara center
const MAP_CENTER = { lat: 1.5, lng: 127.8 };

interface Report {
  id: string;
  title: string;
  status: string;
  category: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  priority: 'urgent' | 'high' | 'normal';
  is_spam: boolean;
  forwarded_at: string | null;
  photos: string[] | null;
}

const PRIORITY_COLOR = {
  urgent: '#EF4444',
  high:   '#F59E0B',
  normal: '#10B981',
};

const PRIORITY_LABEL = {
  urgent: '🔴 Urgent',
  high:   '🟠 High',
  normal: '🟢 Normal',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function isUnhandled(r: Report) {
  const diff = Date.now() - new Date(r.created_at).getTime();
  return r.status === 'pending' && diff > 2 * 3600 * 1000;
}

// ── Leaflet Map Component ──────────────────────────────────────────
function BalaporMap({ reports, t }: { reports: Report[]; t: any }) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if ((window as any).L) {
        initMap();
        return;
      }
      const script = document.createElement('script');
      script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      const L = (window as any).L;
      if (!mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, {
        center: [MAP_CENTER.lat, MAP_CENTER.lng],
        zoom: 8,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      mapInstance.current = map;

      // Add markers
      addMarkers(L, map, reports);
    };

    loadLeaflet();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update markers saat reports berubah
  useEffect(() => {
    if (!mapInstance.current || !(window as any).L) return;
    const L   = (window as any).L;
    const map = mapInstance.current;
    // Clear existing markers
    map.eachLayer((layer: any) => { if (layer instanceof L.Marker || layer instanceof L.CircleMarker) map.removeLayer(layer); });
    addMarkers(L, map, reports);
  }, [reports]);

  const addMarkers = (L: any, map: any, reports: Report[]) => {
    reports
      .filter(r => r.latitude && r.longitude)
      .forEach(r => {
        const color = PRIORITY_COLOR[r.priority] ?? '#10B981';
        const marker = L.circleMarker([r.latitude, r.longitude], {
          radius: r.priority === 'urgent' ? 12 : r.priority === 'high' ? 9 : 7,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 180px;">
            <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px;">${r.title}</div>
            <div style="font-size: 11px; color: #6B7280; margin-bottom: 6px;">${r.location || '—'} · ${timeAgo(r.created_at)}</div>
            <span style="background: ${color}22; color: ${color}; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;">
              ${PRIORITY_LABEL[r.priority]}
            </span>
          </div>
        `);

        marker.addTo(map);
      });
  };

  const withCoords = reports.filter(r => r.latitude && r.longitude).length;

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: 380, borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.sidebarBorder}`, background: '#1a1a2e' }} />

      {/* Map legend */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 12, zIndex: 999 }}>
        {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: '2px solid #fff' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{p}</span>
          </div>
        ))}
      </div>

      {/* No coords notice */}
      {withCoords === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: 14, zIndex: 998 }}>
          <div style={{ background: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: '16px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📍</div>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Belum ada laporan dengan koordinat GPS</p>
            <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>Pin akan muncul saat user izinkan akses lokasi</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const { token } = useAuth();
  const { t }     = useContext(AdminThemeContext);

  const [reports, setReports]     = useState<Report[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setTab]       = useState<'overview' | 'live' | 'deepdive'>('overview');
  const [priorityFilter, setPriority] = useState('');
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionLoading, setAction]= useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (priorityFilter) params.set('priority', priorityFilter);
      const res  = await fetch(`${API}/admin/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setReports(data.data.data);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat', false);
    } finally {
      setLoading(false);
    }
  }, [token, priorityFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Auto-refresh setiap 60 detik
  useEffect(() => {
    const interval = setInterval(fetchReports, 60000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const setPriorityAction = async (id: string, priority: string, title: string) => {
    if (!token) return;
    setAction(id + 'priority');
    try {
      const res  = await fetch(`${API}/admin/reports/${id}/priority`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Priority "${title.slice(0,25)}" → ${priority}`);
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setAction(null); }
  };

  // Stats
  const urgentCount    = reports.filter(r => r.priority === 'urgent').length;
  const highCount      = reports.filter(r => r.priority === 'high').length;
  const unhandledCount = reports.filter(isUnhandled).length;
  const pendingCount   = reports.filter(r => r.status === 'pending').length;

  // Top incidents — urgent dulu, lalu high, sort by created_at
  const topIncidents = [...reports]
    .sort((a, b) => {
      const pOrder = { urgent: 0, high: 1, normal: 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .tab-btn:hover { background: ${t.navHover} !important; }
        .row-hover:hover { background: ${t.navHover} !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>
            🚨 BALAPOR Command Center
          </h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>
            {total} total laporan
            {unhandledCount > 0 && <span style={{ color: '#EF4444', fontWeight: 700 }}> · {unhandledCount} belum ditangani {'>'} 2 jam</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchReports} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔄 Refresh
          </button>
          <Link href="/office/newsroom/balapor" style={{ padding: '7px 16px', borderRadius: 8, background: '#1B6B4A', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            + Global Broadcast
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.sidebarBorder}` }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'live',     label: 'Live Incidents' },
          { key: 'deepdive', label: 'Deep Dive' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setTab(tab.key as any)}
            className="tab-btn"
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? '#1B6B4A' : t.textDim, background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #1B6B4A' : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textDim }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #EF4444', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat data...
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Total Hari Ini', value: total,         color: '#1B6B4A', bg: 'rgba(27,107,74,0.08)'  },
                    { label: 'Urgent',         value: urgentCount,   color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
                    { label: 'High',           value: highCount,     color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
                    { label: 'Belum Ditangani',value: unhandledCount,color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${s.color}22` }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Peta */}
                <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>🗺️ Peta Laporan Maluku Utara</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['', 'urgent', 'high', 'normal'].map(p => (
                        <button key={p} onClick={() => setPriority(p)}
                          style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${priorityFilter === p ? '#1B6B4A' : t.sidebarBorder}`, background: priorityFilter === p ? '#1B6B4A' : 'transparent', color: priorityFilter === p ? '#fff' : t.textDim, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                          {p === '' ? 'Semua' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <BalaporMap reports={reports} t={t} />

                  {/* Map stats */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, padding: '10px 12px', background: t.mainBg, borderRadius: 10 }}>
                    {[
                      { label: 'Urgent', count: urgentCount, color: '#EF4444' },
                      { label: 'High',   count: highCount,   color: '#F59E0B' },
                      { label: 'Normal', count: reports.filter(r => r.priority === 'normal').length, color: '#10B981' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.count} {s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Incidents table */}
                <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>Live Incidents</span>
                    </div>
                    <button onClick={() => setTab('live')} style={{ fontSize: 11, color: '#1B6B4A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      See All →
                    </button>
                  </div>

                  {/* Table header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '8px 16px', fontSize: 9, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', background: t.mainBg, borderBottom: `1px solid ${t.sidebarBorder}` }}>
                    <span>Incident</span><span>Status</span><span>Lokasi</span><span>Waktu</span>
                  </div>

                  {topIncidents.map((r, idx) => {
                    const pc = PRIORITY_COLOR[r.priority];
                    return (
                      <div key={r.id} className="row-hover"
                        style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', padding: '10px 16px', alignItems: 'center', borderBottom: idx < topIncidents.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none', transition: 'background 0.15s' }}>
                        <div style={{ minWidth: 0, paddingRight: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pc, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                          </div>
                          <div style={{ fontSize: 10, color: t.textDim, paddingLeft: 14 }}>{r.category || '—'}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `${pc}22`, color: pc }}>
                            {r.priority === 'urgent' ? '🔴' : r.priority === 'high' ? '🟠' : '🟢'} {r.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: t.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📍 {r.location || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: t.textDim }}>{timeAgo(r.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Total counter */}
                <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary }}>{total}</span>
                    <span style={{ fontSize: 12, color: t.textDim }}>Total Laporan Hari Ini ∨</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444' }}>{urgentCount}</div>
                      <div style={{ fontSize: 10, color: t.textDim }}>Urgent</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>{unhandledCount}</div>
                      <div style={{ fontSize: 10, color: t.textDim }}>Belum Ditangani {'>'} 2 Jam</div>
                    </div>
                  </div>
                </div>

                {/* Top Incidents */}
                <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>Top Incidents</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topIncidents.map(r => {
                      const pc = PRIORITY_COLOR[r.priority];
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                            <p style={{ fontSize: 10, color: t.textDim }}>{r.location || '—'} · {timeAgo(r.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alert lonjakan */}
                {urgentCount > 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 14, border: '1px solid rgba(239,68,68,0.2)', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>🚨</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>Alert</span>
                    </div>
                    <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>
                      Ada <strong>{urgentCount} laporan URGENT</strong> yang perlu segera ditangani.
                    </p>
                    <button onClick={() => { setPriority('urgent'); setTab('live'); }}
                      style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Lihat Urgent →
                    </button>
                  </div>
                )}

                {/* Quick link ke office */}
                <Link href="/office/newsroom/balapor" style={{ display: 'block', background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '14px 18px', textDecoration: 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>📋 Incident Management</div>
                  <div style={{ fontSize: 11, color: t.textDim }}>Buka portal wartawan untuk verifikasi dan tindak laporan</div>
                  <div style={{ fontSize: 11, color: '#1B6B4A', fontWeight: 600, marginTop: 6 }}>Buka Portal →</div>
                </Link>
              </div>
            </div>
          )}

          {/* ── LIVE INCIDENTS TAB ── */}
          {activeTab === 'live' && (
            <div>
              {/* Priority filter */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {[
                  { value: '',        label: '📋 Semua',   count: total },
                  { value: 'urgent',  label: '🔴 Urgent',  count: urgentCount },
                  { value: 'high',    label: '🟠 High',    count: highCount },
                  { value: 'normal',  label: '🟢 Normal',  count: reports.filter(r => r.priority === 'normal').length },
                ].map(f => (
                  <button key={f.value} onClick={() => setPriority(f.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${priorityFilter === f.value ? '#1B6B4A' : t.sidebarBorder}`, background: priorityFilter === f.value ? '#1B6B4A' : t.sidebar, color: priorityFilter === f.value ? '#fff' : t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {f.label}
                    {f.count > 0 && <span style={{ fontSize: 10, fontWeight: 800, padding: '0 5px', borderRadius: 99, background: priorityFilter === f.value ? 'rgba(255,255,255,0.25)' : '#EF4444', color: '#fff' }}>{f.count}</span>}
                  </button>
                ))}
              </div>

              {/* Full table */}
              <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '4px 1fr 110px 130px 90px 120px', padding: '10px 16px', fontSize: 9, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', background: t.mainBg, borderBottom: `1px solid ${t.sidebarBorder}`, gap: 12 }}>
                  <span></span><span>Incident</span><span>Priority</span><span>Lokasi</span><span>Waktu</span><span>Aksi Priority</span>
                </div>

                {reports.map((r, idx) => {
                  const pc = PRIORITY_COLOR[r.priority];
                  return (
                    <div key={r.id} className="row-hover"
                      style={{ display: 'grid', gridTemplateColumns: '4px 1fr 110px 130px 90px 120px', padding: '11px 16px', alignItems: 'center', gap: 12, borderBottom: idx < reports.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none', transition: 'background 0.15s' }}>

                      {/* Priority bar */}
                      <div style={{ width: 4, height: 36, borderRadius: 4, background: pc }} />

                      {/* Title */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{r.title}</p>
                        <p style={{ fontSize: 10, color: t.textDim }}>{r.category || '—'} {r.forwarded_at ? '· ✈️ Diteruskan' : ''}</p>
                      </div>

                      {/* Priority badge */}
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: `${pc}22`, color: pc, display: 'inline-block', width: 'fit-content' }}>
                        {PRIORITY_LABEL[r.priority]}
                      </span>

                      {/* Lokasi */}
                      <div style={{ fontSize: 11, color: t.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📍 {r.location || '—'}
                      </div>

                      {/* Waktu */}
                      <div style={{ fontSize: 11, color: isUnhandled(r) ? '#EF4444' : t.textDim, fontWeight: isUnhandled(r) ? 700 : 400 }}>
                        {timeAgo(r.created_at)}
                        {isUnhandled(r) && <div style={{ fontSize: 9, color: '#EF4444' }}>⚠️ Belum ditangani</div>}
                      </div>

                      {/* Quick priority */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['urgent', 'high', 'normal'] as const).map(p => (
                          <button key={p} onClick={() => setPriorityAction(r.id, p, r.title)}
                            disabled={r.priority === p || actionLoading === r.id + 'priority'}
                            title={`Set ${p}`}
                            style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${r.priority === p ? PRIORITY_COLOR[p] : t.sidebarBorder}`, background: r.priority === p ? PRIORITY_COLOR[p] + '22' : 'transparent', cursor: r.priority === p ? 'default' : 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {p === 'urgent' ? '🔴' : p === 'high' ? '🟠' : '🟢'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {reports.length === 0 && (
                  <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                    <p style={{ color: t.textDim, fontSize: 13 }}>Tidak ada laporan</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DEEP DIVE TAB ── */}
          {activeTab === 'deepdive' && (
            <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <p style={{ color: t.textPrimary, fontSize: 15, fontWeight: 700 }}>Deep Dive Analytics</p>
              <p style={{ color: t.textDim, fontSize: 13, marginTop: 6 }}>Coming soon — Session 7</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
