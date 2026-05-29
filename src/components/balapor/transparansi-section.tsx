'use client';

/**
 * TeraLoka — Transparansi Section (BALAPOR Landing)
 * 30 Mei 2026 — Public transparency block
 * ------------------------------------------------------------
 * Self-contained: fetch sendiri + UI sendiri. Mount 1 baris di
 * public landing (setelah FiturUtamaSection).
 *
 * 3 blok:
 *   A. Laporan Warga Terpantau   ← GET /balapor/peta/stats   (no-auth)
 *   B. Status Darurat SOS        ← GET /balapor/sos/public-map (no-auth, admin-curated)
 *   C. CTA Lacak Laporanmu       → flow self-track (auth, Layer 1)
 *
 * Catatan privasi:
 *   - Stats = agregat (verified+published only), nol identitas pelapor.
 *   - SOS = admin opt-in per-laporan (endpoint udah filter expose=TRUE +
 *     note di-truncate). Nampilin emergency_type + GPS = BY DESIGN.
 *   - Tracking personal sengaja lewat login (bukan public-by-number) →
 *     hindari enumerasi status laporan orang lain.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';

const TS_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

// 🛡️ GANTI kalau route halaman lacak laporan (self-track) lo beda.
const LACAK_HREF = '/reports/me';

/* ─── Types (mirror response) ─── */

interface PetaStats {
  total: number;
  by_priority: { urgent: number; high: number; normal: number };
  by_category: Record<string, number>;
  by_status: { verified: number; published: number };
}

interface SosItem {
  id: string;
  display_id: string;
  emergency_type: string;
  status: string;
  latitude: number;
  longitude: number;
  gps_accuracy_meters?: number | null;
  note_preview?: string | null;
  created_at: string;
}

interface RecentReport {
  id: string;
  display_id: string | null;
  title: string;
  category: string | null;
  priority: 'urgent' | 'high' | 'normal';
  status: 'verified' | 'published';
  location_name: string | null;
  created_at: string;
}

/* ─── Label maps ─── */

const CAT_LABELS: Record<string, string> = {
  keamanan: 'Keamanan',
  infrastruktur: 'Infrastruktur',
  lingkungan: 'Lingkungan',
  layanan_publik: 'Layanan Publik',
  kesehatan: 'Kesehatan',
  pendidikan: 'Pendidikan',
  transportasi: 'Transportasi',
  lainnya: 'Lainnya',
};

const EMERGENCY_META: Record<string, { icon: string; label: string; color: string }> = {
  fire: { icon: 'local_fire_department', label: 'Kebakaran', color: '#EF4444' },
  accident: { icon: 'car_crash', label: 'Kecelakaan', color: '#F59E0B' },
  medical: { icon: 'medical_services', label: 'Darurat Medis', color: '#EC4899' },
  crime: { icon: 'gpp_maybe', label: 'Kriminal', color: '#7C3AED' },
  flood: { icon: 'flood', label: 'Banjir', color: '#0891B2' },
  other: { icon: 'emergency', label: 'Darurat', color: '#EF4444' },
};
function emMeta(t: string) {
  return EMERGENCY_META[t] ?? EMERGENCY_META.other;
}

const CATEGORY_EMOJI: Record<string, string> = {
  keamanan: '🛡️',
  infrastruktur: '🚧',
  lingkungan: '🌳',
  layanan_publik: '🏛️',
  kesehatan: '🏥',
  pendidikan: '🎓',
  transportasi: '🚗',
  lainnya: '⋯',
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'URGENT', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  high: { label: 'PENTING', color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  normal: { label: 'NORMAL', color: '#047857', bg: 'rgba(16,185,129,0.12)' },
};
function prioMeta(p: string) {
  return PRIORITY_META[p] ?? PRIORITY_META.normal;
}

function tsRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (isNaN(m)) return '';
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bulan lalu`;
}

/* ─── Component ─── */

export function TransparansiSection() {
  const [stats, setStats] = useState<PetaStats | null>(null);
  const [sos, setSos] = useState<SosItem[] | null>(null);
  const [reports, setReports] = useState<RecentReport[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const r = await fetch(`${TS_API_BASE}/balapor/peta/stats`, { signal: controller.signal });
        if (!r.ok) return;
        const j = await r.json();
        setStats((j?.data ?? j) as PetaStats);
      } catch { /* silent — blok A tampil empty-safe */ }
    })();

    (async () => {
      try {
        const r = await fetch(`${TS_API_BASE}/balapor/peta?limit=6`, { signal: controller.signal });
        if (!r.ok) { setReports([]); return; }
        const j = await r.json();
        const d = (j?.data ?? j) as RecentReport[];
        setReports(Array.isArray(d) ? d.slice(0, 6) : []);
      } catch { setReports([]); }
    })();

    (async () => {
      try {
        const r = await fetch(`${TS_API_BASE}/balapor/sos/public-map`, { signal: controller.signal });
        if (!r.ok) { setSos([]); return; }
        const j = await r.json();
        const d = (j?.data ?? j) as SosItem[];
        setSos(Array.isArray(d) ? d : []);
      } catch { setSos([]); }
    })();

    return () => controller.abort();
  }, []);

  const topCats = stats
    ? Object.entries(stats.by_category).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];
  const maxCat = topCats.length ? topCats[0][1] : 1;

  return (
    <section style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f6f8f7 100%)', padding: '80px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-balapor)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            TRANSPARANSI PUBLIK
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#1f2937', letterSpacing: '-0.8px', marginBottom: 8 }}>
            Dipantau <span style={{ color: 'var(--color-balapor)' }}>bersama</span>, terbuka untuk semua
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Data laporan warga & status darurat — bisa dilihat siapa saja, kapan saja.
          </p>
        </div>

        <div className="transparansi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

          {/* ─── BLOK A — Laporan Warga ─── */}
          <div style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 18, padding: 28,
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(0,53,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#003526', fontSize: 22 }}>verified_user</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#1f2937' }}>Laporan Warga</p>
                <p style={{ fontSize: 11, color: '#6b7280' }}>Terverifikasi & terpantau publik</p>
              </div>
            </div>

            {/* Big number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: '#003526', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {stats ? stats.total.toLocaleString('id-ID') : '—'}
              </span>
              <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>laporan</span>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
              {stats ? `${stats.by_status.verified.toLocaleString('id-ID')} diverifikasi tim · ${stats.by_status.published.toLocaleString('id-ID')} jadi berita BAKABAR` : 'Memuat data…'}
            </p>

            {/* Category bars */}
            {topCats.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Isu paling banyak dilaporkan
                </p>
                {topCats.map(([cat, count]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: '#4b5563', width: 96, flexShrink: 0 }}>
                      {CAT_LABELS[cat] ?? cat}
                    </span>
                    <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(6, (count / maxCat) * 100)}%`, background: 'linear-gradient(90deg, #0891B2, #003526)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1f2937', width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link href="/reports#live-map" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: '#003526', textDecoration: 'none',
            }}>
              Lihat peta lengkap
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </Link>
          </div>

          {/* ─── BLOK B — Status SOS ─── */}
          <div style={{
            background: 'white', border: '1px solid #e5e7eb', borderRadius: 18, padding: 28,
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#EF4444', fontSize: 22 }}>e911_emergency</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#1f2937' }}>Status Darurat SOS</p>
                <p style={{ fontSize: 11, color: '#6b7280' }}>Dipantau real-time 24/7</p>
              </div>
            </div>

            {/* Loading */}
            {sos === null && (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>
                Memuat status darurat…
              </p>
            )}

            {/* Empty = aman */}
            {sos !== null && sos.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '20px 0',
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14,
              }}>
                <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: 36, marginBottom: 8, fontVariationSettings: "'FILL' 1" }}>
                  shield_with_heart
                </span>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#047857', marginBottom: 2 }}>
                  Tidak ada darurat aktif
                </p>
                <p style={{ fontSize: 12, color: '#059669' }}>Situasi Maluku Utara terpantau aman.</p>
              </div>
            )}

            {/* Ada SOS aktif */}
            {sos !== null && sos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sos.slice(0, 3).map((s) => {
                  const m = emMeta(s.emergency_type);
                  return (
                    <div key={s.id} style={{
                      border: `1px solid ${m.color}33`, background: `${m.color}0A`,
                      borderRadius: 12, padding: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${m.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ color: m.color, fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{m.label}</p>
                          <p style={{ fontSize: 10, color: '#6b7280' }}>{tsRelTime(s.created_at)} · sedang ditangani</p>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase',
                          color: '#047857', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                          padding: '3px 8px', borderRadius: 999, flexShrink: 0,
                        }}>
                          Ditangani
                        </span>
                      </div>
                      {s.note_preview && (
                        <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4, marginBottom: 8 }}>
                          “{s.note_preview}”
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, color: m.color, textDecoration: 'none',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                        Lihat lokasi
                        {s.gps_accuracy_meters ? <span style={{ color: '#9ca3af', fontWeight: 500 }}> · ±{s.gps_accuracy_meters}m</span> : null}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── BLOK A2 — Laporan Warga Terbaru ─── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                Laporan Terbaru
              </p>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1f2937' }}>
                Apa yang sedang dilaporkan warga
              </h3>
            </div>
            <Link href="/reports#live-map" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 700, color: '#003526', textDecoration: 'none',
            }}>
              Lihat di peta
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>map</span>
            </Link>
          </div>

          {reports === null && (
            <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>Memuat laporan terbaru…</p>
          )}

          {reports !== null && reports.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>Belum ada laporan terverifikasi.</p>
          )}

          {reports !== null && reports.length > 0 && (
            <div className="transparansi-reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {reports.map((r) => {
                const p = prioMeta(r.priority);
                const catKey = (r.category ?? 'lainnya').toLowerCase();
                const emoji = CATEGORY_EMOJI[catKey] ?? '⋯';
                const catLabel = CAT_LABELS[catKey] ?? 'Lainnya';
                return (
                  <div key={r.id} style={{
                    background: 'white', border: '1px solid #e5e7eb', borderRadius: 14,
                    padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
                        color: p.color, background: p.bg, padding: '3px 8px', borderRadius: 999,
                      }}>
                        {p.label}
                      </span>
                      {r.display_id && (
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {r.display_id}
                        </span>
                      )}
                    </div>
                    <h4 style={{
                      fontSize: 14, fontWeight: 700, color: '#1f2937', lineHeight: 1.4, marginBottom: 12,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    } as CSSProperties}>
                      {r.title}
                    </h4>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: '#6b7280' }}>
                      <span>{emoji} {catLabel}</span>
                      {r.location_name && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#9ca3af' }}>location_on</span>
                          {r.location_name}
                        </span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#9ca3af' }}>schedule</span>
                        {tsRelTime(r.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── BLOK C — CTA Lacak Laporanmu ─── */}
        <div style={{
          background: 'linear-gradient(135deg, #003526 0%, #0891B2 100%)',
          borderRadius: 18, padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 24 }}>track_changes</span>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2 }}>
                Punya laporan? Pantau progresnya.
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                Lacak status laporanmu kapan saja — dari masuk sampai ditindaklanjuti.
              </p>
            </div>
          </div>
          <Link href={LACAK_HREF} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'white', color: '#003526',
            padding: '12px 20px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
          }}>
            Lacak Laporanmu
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Responsive: stack grid di mobile */}
      <style>{`
        @media (max-width: 768px) {
          .transparansi-grid { grid-template-columns: 1fr !important; }
          .transparansi-reports-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .transparansi-reports-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
