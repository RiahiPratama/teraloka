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
  const [priorityFilter, setPriority]   = useState('');
  const [categoryFilter, setCategory]   = useState('');
  const [deepdive, setDeepdive]           = useState<any>(null);
  const [deepdiveLoading, setDeepdiveLoading] = useState(false);
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
      if (priorityFilter)  params.set('priority',  priorityFilter);
      if (categoryFilter)  params.set('category',  categoryFilter);
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

  const fetchDeepdive = async () => {
    if (!token || deepdiveLoading) return;
    setDeepdiveLoading(true);
    try {
      const res  = await fetch(`${API}/admin/reports/deepdive`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDeepdive(data.data);
    } catch {}
    finally { setDeepdiveLoading(false); }
  };

  // Fetch deepdive saat tab dibuka
  useEffect(() => {
    if (activeTab === 'deepdive' && !deepdive && !deepdiveLoading) {
      fetchDeepdive();
    }
  }, [activeTab]);

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

                {/* Category filter */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { value: '', label: 'Semua' },
                    { value: 'keamanan',      label: '🛡️ Keamanan' },
                    { value: 'infrastruktur', label: '🔧 Infrastruktur' },
                    { value: 'lingkungan',    label: '🌳 Lingkungan' },
                    { value: 'layanan publik',label: '🏛️ Layanan Publik' },
                    { value: 'kesehatan',     label: '❤️ Kesehatan' },
                    { value: 'pendidikan',    label: '🎓 Pendidikan' },
                    { value: 'transportasi',  label: '🚢 Transportasi' },
                    { value: 'lainnya',       label: '⋯ Lainnya' },
                  ].map(c => (
                    <button key={c.value} onClick={() => setCategory(c.value)}
                      style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${categoryFilter === c.value ? '#1B6B4A' : t.sidebarBorder}`, background: categoryFilter === c.value ? '#1B6B4A' : t.sidebar, color: categoryFilter === c.value ? '#fff' : t.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {c.label}
                    </button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>📊 Deep Dive Analytics</h2>
                  <p style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Data laporan 30 hari terakhir</p>
                </div>
                <button onClick={fetchDeepdive} disabled={deepdiveLoading}
                  style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {deepdiveLoading ? '⏳ Memuat...' : '🔄 Refresh'}
                </button>
              </div>

              {deepdiveLoading && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: t.textDim }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Mengolah data...
                </div>
              )}

              {!deepdiveLoading && !deepdive && (
                <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Siap Menganalisis</p>
                  <p style={{ fontSize: 12, color: t.textDim, marginTop: 6, marginBottom: 16 }}>Klik refresh untuk memuat data analitik</p>
                  <button onClick={fetchDeepdive} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1B6B4A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Muat Data
                  </button>
                </div>
              )}

              {!deepdiveLoading && deepdive && (() => {
                const dd = deepdive;
                // Helper: format pct
                const fmtPct = (n: number | null) => n === null ? '' : n > 0 ? `+${n}%` : `${n}%`;
                const pctColor = (n: number | null) => n === null ? t.textDim : n > 0 ? '#EF4444' : '#10B981';

                // Bar chart max
                const catMax  = Math.max(...(dd.categories?.map((c: any) => c.count) ?? [1]));
                const hourMax = Math.max(...(dd.peak_hours?.map((h: any) => h.count) ?? [1]));

                return (
                  <>
                    {/* Stats bar atas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                      {[
                        { label: 'Laporan 30 Hari', value: dd.stats.total_30days, sub: `${fmtPct(dd.stats.pct_change)} vs periode lalu`, subColor: pctColor(dd.stats.pct_change) },
                        { label: 'Rata-rata per Hari', value: dd.stats.per_day, sub: 'Semua Status' },
                        { label: 'Urgent', value: dd.stats.urgent, sub: `${dd.stats.high} High`, subColor: '#F59E0B' },
                        { label: 'Normal', value: dd.stats.normal, sub: 'Prioritas rendah' },
                      ].map((s, i) => (
                        <div key={i} style={{ background: t.sidebar, borderRadius: 12, border: `1px solid ${t.sidebarBorder}`, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, color: t.textDim, marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.03em' }}>{s.value}</div>
                          {s.sub && <div style={{ fontSize: 11, color: s.subColor || t.textDim, marginTop: 3, fontWeight: 600 }}>{s.sub}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Row 2: Tren + Top Locations */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

                      {/* Tren 30 hari */}
                      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 16 }}>Tren Laporan 30 Hari</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
                          {dd.trend?.map((d: any, i: number) => {
                            const tMax = Math.max(...dd.trend.map((x: any) => x.count), 1);
                            const h    = Math.max(4, Math.round((d.count / tMax) * 80));
                            const isToday = i === dd.trend.length - 1;
                            return (
                              <div key={d.date} title={`${d.date}: ${d.count} laporan`}
                                style={{ flex: 1, height: h, borderRadius: '2px 2px 0 0', background: isToday ? '#1B6B4A' : '#1B6B4A44', cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1B6B4A'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isToday ? '#1B6B4A' : '#1B6B4A44'}
                              />
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textDim, marginTop: 6 }}>
                          <span>{dd.trend?.[0]?.date?.slice(5)}</span>
                          <span>Hari ini</span>
                        </div>
                        {/* Top kategori labels */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                          {dd.categories?.slice(0, 3).map((c: any) => (
                            <span key={c.name} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: t.mainBg, color: t.textMuted, border: `1px solid ${t.sidebarBorder}` }}>
                              {c.name} {c.count}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Top Locations */}
                      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 14 }}>Top Locations</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {dd.top_locations?.slice(0, 5).map((loc: any, i: number) => (
                            <div key={loc.location} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < 2 ? '#EF4444' : i < 4 ? '#F59E0B' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.location}</p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: t.textPrimary }}>{loc.count}</div>
                                {loc.pct_change !== null && (
                                  <div style={{ fontSize: 10, fontWeight: 600, color: pctColor(loc.pct_change) }}>{fmtPct(loc.pct_change)}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Kategori + User Segments + Peak Hour */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 220px', gap: 16 }}>

                      {/* Kategori bar chart */}
                      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 14 }}>Kategori Laporan</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {dd.categories?.slice(0, 6).map((c: any, i: number) => {
                            const barW = Math.max(4, Math.round((c.count / catMax) * 100));
                            const colors = ['#1B6B4A', '#0891B2', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981'];
                            return (
                              <div key={c.name}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, textTransform: 'capitalize' }}>{c.name}</span>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: t.textPrimary }}>{c.count}</span>
                                    {c.pct_change !== null && (
                                      <span style={{ fontSize: 10, fontWeight: 600, color: pctColor(c.pct_change), marginLeft: 6 }}>{fmtPct(c.pct_change)}</span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: t.mainBg }}>
                                  <div style={{ height: 6, borderRadius: 3, background: colors[i % colors.length], width: `${barW}%`, transition: 'width 0.5s ease' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* User Segments donut */}
                      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 14 }}>User Segments</div>
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>{dd.user_segments?.total}</div>
                          <div style={{ fontSize: 10, color: t.textDim }}>Total Laporan</div>
                        </div>
                        {[
                          { label: 'Baru (7 hari)', value: dd.user_segments?.newly_registered, color: '#1B6B4A' },
                          { label: 'Pelapor Aktif',  value: dd.user_segments?.trusted_user,     color: '#0891B2' },
                          { label: 'Tanpa Akun',     value: dd.user_segments?.other,            color: '#9CA3AF' },
                        ].map(s => (
                          <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                              <span style={{ fontSize: 11, color: t.textDim }}>{s.label}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Peak Hour */}
                      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 6 }}>Peak Hour</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1B6B4A', marginBottom: 12 }}>
                          {String(dd.peak_hour).padStart(2, '0')}:00 – {String((dd.peak_hour + 4) % 24).padStart(2, '0')}:00
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 60 }}>
                          {dd.peak_hours?.map((h: any) => {
                            const barH = Math.max(2, Math.round((h.count / hourMax) * 60));
                            const isPeak = h.hour >= dd.peak_hour && h.hour <= dd.peak_hour + 4;
                            return (
                              <div key={h.hour} title={`${String(h.hour).padStart(2,'0')}:00 — ${h.count} laporan`}
                                style={{ flex: 1, height: barH, borderRadius: '2px 2px 0 0', background: isPeak ? '#1B6B4A' : '#1B6B4A33' }} />
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: t.textDim, marginTop: 4 }}>
                          <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
                        </div>
                      </div>
                    </div>

                    {/* Alert Clusters */}
                    {dd.alert_clusters?.length > 0 && (
                      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>🚨 Alert Clusters</span>
                          <span style={{ fontSize: 11, color: t.textDim }}>Lonjakan {'>'} 50% vs periode lalu</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {dd.alert_clusters.map((a: any) => (
                            <div key={a.location} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: a.priority === 'urgent' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', borderRadius: 10, border: `1px solid ${a.priority === 'urgent' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                              <span style={{ fontSize: 16 }}>{a.priority === 'urgent' ? '🔴' : '🟠'}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{a.location}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: a.priority === 'urgent' ? '#EF4444' : '#F59E0B' }}>{a.count} laporan</div>
                                <div style={{ fontSize: 11, color: pctColor(a.pct_change), fontWeight: 600 }}>+{a.pct_change}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
              )}

              {!analysisLoading && !analysis && (
                <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Siap Menganalisis</p>
                  <p style={{ fontSize: 12, color: t.textDim, marginTop: 6, marginBottom: 16 }}>Klik tombol di atas untuk mulai analisis AI</p>
                  <button onClick={fetchAnalysis}
                    style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#1B6B4A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    🔍 Mulai Analisis
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
