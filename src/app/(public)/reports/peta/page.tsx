'use client';

/**
 * TeraLoka — Halaman Peta Lengkap BALAPOR (/balapor/peta)
 * ------------------------------------------------------------
 * Peta penuh semua laporan terverifikasi se-Maluku Utara + filter.
 * Target dari tombol "Lihat peta lengkap" di landing BALAPOR.
 *
 * MVP scope:
 *   - Fetch 1x (limit 1000) → filter client-side (kategori + prioritas + search)
 *   - Peta besar interaktif (BalaporPublicMap fullView)
 *   - Legend prioritas + hitungan laporan + empty/loading state
 *
 * Data source: GET /balapor/peta (privacy-safe, verified/published only)
 * Konvensi: inline-style (selaras landing BALAPOR).
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const TS_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

/* ─── Map: dynamic import (Leaflet butuh window → ssr:false) ─── */
const BalaporPublicMap = dynamic(
  () => import('@/components/balapor/balapor-public-map').then((m) => m.BalaporPublicMap),
  {
    ssr: false,
    loading: () => (
      <div style={{ width: '100%', height: '72vh', borderRadius: 14, background: '#f1f5f9', border: '1px solid #e5e7eb' }} />
    ),
  },
);

/* ─── Types (match /balapor/peta PublicReport) ─── */
interface PetaReport {
  id: string;
  display_id: string | null;
  title: string;
  body?: string | null;
  category: string | null;
  priority: 'urgent' | 'high' | 'normal';
  status: 'verified' | 'published';
  location_name: string | null;
  location_type: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  has_bakabar_article: boolean;
}

/* ─── Constants (selaras transparansi-section) ─── */
const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'Semua', icon: 'apps' },
  { key: 'keamanan', label: 'Keamanan', icon: 'shield' },
  { key: 'infrastruktur', label: 'Infrastruktur', icon: 'construction' },
  { key: 'lingkungan', label: 'Lingkungan', icon: 'forest' },
  { key: 'layanan_publik', label: 'Layanan Publik', icon: 'account_balance' },
  { key: 'kesehatan', label: 'Kesehatan', icon: 'health_and_safety' },
  { key: 'pendidikan', label: 'Pendidikan', icon: 'school' },
  { key: 'transportasi', label: 'Transportasi', icon: 'directions_car' },
  { key: 'lainnya', label: 'Lainnya', icon: 'category' },
];

const PRIORITIES: { key: string; label: string; color: string }[] = [
  { key: 'all', label: 'Semua prioritas', color: '#6b7280' },
  { key: 'urgent', label: 'Urgent', color: '#EF4444' },
  { key: 'high', label: 'Tinggi', color: '#F59E0B' },
  { key: 'normal', label: 'Normal', color: '#10B981' },
];

const GREEN = '#003526';

export default function PetaPage() {
  const [reports, setReports] = useState<PetaReport[] | null>(null);
  const [err, setErr] = useState(false);
  const [cat, setCat] = useState('all');
  const [prio, setPrio] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(`${TS_API_BASE}/balapor/peta?limit=1000`, { signal: ctrl.signal });
        if (!r.ok) { setErr(true); setReports([]); return; }
        const j = await r.json();
        const d = (j?.data ?? j) as PetaReport[];
        setReports(Array.isArray(d) ? d : []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') { setErr(true); setReports([]); }
      }
    })();
    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    const qq = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (cat !== 'all' && (r.category ?? 'lainnya').toLowerCase() !== cat) return false;
      if (prio !== 'all' && r.priority !== prio) return false;
      if (qq) {
        const hay = `${r.title} ${r.body ?? ''} ${r.location_name ?? ''} ${r.display_id ?? ''}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [reports, cat, prio, q]);

  const total = reports?.length ?? 0;
  const loading = reports === null;
  const empty = !loading && filtered.length === 0;

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 16px 40px' }}>
      {/* ── Header ── */}
      <Link
        href="/balapor"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#6b7280', textDecoration: 'none', marginBottom: 10 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Kembali ke BALAPOR
      </Link>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>
            Peta Laporan Warga
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Sebaran laporan terverifikasi se-Maluku Utara
          </p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: GREEN, background: 'rgba(0,53,38,0.07)', padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          {loading ? 'Memuat…' : `${filtered.length}${filtered.length !== total ? ` / ${total}` : ''} laporan`}
        </span>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: '#9ca3af' }}>search</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, isi laporan, atau lokasi…"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '11px 14px 11px 40px',
              fontSize: 14, color: '#111827', borderRadius: 12, border: '1px solid #e5e7eb',
              outline: 'none', background: '#fff',
            }}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Hapus pencarian"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', border: 0, background: 'transparent', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          )}
        </div>

        {/* Kategori chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {CATEGORIES.map((c) => {
            const on = cat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  padding: '7px 13px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                  border: `1px solid ${on ? GREEN : '#e5e7eb'}`,
                  background: on ? GREEN : '#fff',
                  color: on ? '#fff' : '#374151',
                  transition: 'all .15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Prioritas chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {PRIORITIES.map((p) => {
            const on = prio === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPrio(p.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: `1px solid ${on ? p.color : '#e5e7eb'}`,
                  background: on ? `${p.color}14` : '#fff',
                  color: on ? p.color : '#6b7280',
                  transition: 'all .15s',
                }}
              >
                {p.key !== 'all' && (
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: p.color, display: 'inline-block' }} />
                )}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Peta ── */}
      <div style={{ position: 'relative' }}>
        <BalaporPublicMap reports={filtered} fullView height="72vh" initialZoom={7} />

        {empty && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 24,
            background: 'rgba(255,255,255,0.86)', borderRadius: 14, pointerEvents: 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#9ca3af' }}>
              {err ? 'cloud_off' : 'search_off'}
            </span>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>
              {err ? 'Gagal memuat data peta' : 'Tidak ada laporan yang cocok'}
            </p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0 }}>
              {err ? 'Coba muat ulang halaman.' : 'Coba ubah filter atau kata kunci pencarian.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Legend prioritas ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12, fontSize: 12, color: '#6b7280' }}>
        <span style={{ fontWeight: 700 }}>Prioritas:</span>
        {PRIORITIES.filter((p) => p.key !== 'all').map((p) => (
          <span key={p.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: p.color, display: 'inline-block' }} />
            {p.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
          Lokasi di-anonimkan ke level kelurahan demi privasi pelapor
        </span>
      </div>
    </div>
  );
}
