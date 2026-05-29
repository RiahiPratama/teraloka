'use client';

/**
 * TeraLoka — Transparansi Section (BALAPOR Landing) — Premium Redesign
 * 30 Mei 2026
 * ------------------------------------------------------------
 * Arah desain: "civic dashboard premium" (depth + warna + tipografi tegas).
 * Inspirasi: Stripe (gradient mesh), Linear (hero metric + depth), Arc/Framer (warna).
 *
 * 3 blok: A. Laporan Warga · B. Status SOS · C. CTA Lacak.
 * Privasi: stats agregat, SOS admin-opt-in, tracking via login (bukan public-by-number).
 */

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';

const TS_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

// 🛡️ GANTI kalau route halaman lacak laporan (self-track) lo beda.
const LACAK_HREF = '/my-reports';

/* ─── Types ─── */
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
  resolution?: 'open' | 'ditangani' | 'selesai';
}

/* ─── Maps ─── */
const CAT_LABELS: Record<string, string> = {
  keamanan: 'Keamanan', infrastruktur: 'Infrastruktur', lingkungan: 'Lingkungan',
  layanan_publik: 'Layanan Publik', kesehatan: 'Kesehatan', pendidikan: 'Pendidikan',
  transportasi: 'Transportasi', lainnya: 'Lainnya',
};
const CATEGORY_ICON: Record<string, string> = {
  keamanan: 'shield', infrastruktur: 'construction', lingkungan: 'forest', layanan_publik: 'account_balance',
  kesehatan: 'health_and_safety', pendidikan: 'school', transportasi: 'directions_car', lainnya: 'category',
};
const CATEGORY_COLOR: Record<string, string> = {
  keamanan: '#7C3AED', infrastruktur: '#D97706', lingkungan: '#059669', layanan_publik: '#0891B2',
  kesehatan: '#EC4899', pendidikan: '#6366F1', transportasi: '#2563EB', lainnya: '#6b7280',
};
function catColor(c: string) { return CATEGORY_COLOR[c] ?? '#6b7280'; }

const EMERGENCY_META: Record<string, { icon: string; label: string; color: string }> = {
  fire: { icon: 'local_fire_department', label: 'Kebakaran', color: '#EF4444' },
  accident: { icon: 'car_crash', label: 'Kecelakaan', color: '#F59E0B' },
  medical: { icon: 'medical_services', label: 'Darurat Medis', color: '#EC4899' },
  crime: { icon: 'gpp_maybe', label: 'Kriminal', color: '#7C3AED' },
  flood: { icon: 'flood', label: 'Banjir', color: '#0891B2' },
  other: { icon: 'emergency', label: 'Darurat', color: '#EF4444' },
};
function emMeta(t: string) { return EMERGENCY_META[t] ?? EMERGENCY_META.other; }

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'URGENT', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  high: { label: 'PENTING', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  normal: { label: 'NORMAL', color: '#047857', bg: 'rgba(16,185,129,0.1)' },
};
function prioMeta(p: string) { return PRIORITY_META[p] ?? PRIORITY_META.normal; }

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

/* ─── Shared card style ─── */
const CARD: CSSProperties = {
  background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfd 100%)',
  border: '1px solid rgba(16,24,40,0.06)',
  borderRadius: 22,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 20px 44px -18px rgba(16,24,40,0.16)',
};

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
      } catch { /* empty-safe */ }
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
    ? Object.entries(stats.by_category)
        .filter(([cat]) => cat.toLowerCase() !== 'lainnya')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];
  const maxCat = topCats.length ? topCats[0][1] : 1;

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '56px 32px',
        backgroundColor: '#f7faf9',
        backgroundImage:
          'radial-gradient(55% 45% at 12% 0%, rgba(8,145,178,0.10), transparent 70%), radial-gradient(50% 50% at 100% 25%, rgba(0,53,38,0.09), transparent 72%), radial-gradient(40% 40% at 70% 100%, rgba(232,150,58,0.06), transparent 70%)',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
            color: '#0891B2', background: 'rgba(8,145,178,0.1)',
            padding: '6px 14px', borderRadius: 999, marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#0891B2', display: 'inline-block' }} className="ts-pulse" />
            Transparansi Publik
          </span>
          <h2 style={{
            fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 800, color: '#0f211b',
            letterSpacing: '-1.2px', lineHeight: 1.1, marginBottom: 12,
          }}>
            Dipantau <span style={{
              background: 'linear-gradient(120deg, #0891B2 0%, #E8963A 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>bersama</span>, terbuka untuk semua
          </h2>
          <p style={{ fontSize: 15, color: '#5b6b66', maxWidth: 520, margin: '0 auto' }}>
            Data laporan warga & status darurat — bisa dilihat siapa saja, kapan saja.
          </p>
        </div>

        {/* Grid A | B */}
        <div className="ts-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 20, marginBottom: 20 }}>

          {/* ── BLOK A ── */}
          <div style={{ ...CARD, padding: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, rgba(0,53,38,0.12), rgba(8,145,178,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#003526', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0f211b' }}>Laporan Warga</p>
                <p style={{ fontSize: 12, color: '#7a8a85' }}>Terverifikasi & terpantau publik</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
              <span style={{
                fontSize: 54, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-2px',
                background: 'linear-gradient(125deg, #003526 0%, #0891B2 100%)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {stats ? stats.total.toLocaleString('id-ID') : '—'}
              </span>
              <span style={{ fontSize: 15, color: '#7a8a85', fontWeight: 600, paddingBottom: 6 }}>laporan</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#047857', background: 'rgba(16,185,129,0.1)', padding: '5px 11px', borderRadius: 999 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {stats ? stats.by_status.verified.toLocaleString('id-ID') : '—'} diverifikasi
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#0891B2', background: 'rgba(8,145,178,0.1)', padding: '5px 11px', borderRadius: 999 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>newspaper</span>
                {stats ? stats.by_status.published.toLocaleString('id-ID') : '—'} jadi berita
              </span>
            </div>

            {topCats.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Isu paling banyak dilaporkan
                </p>
                {topCats.map(([cat, count]) => {
                  const cc = catColor(cat.toLowerCase());
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, color: '#4b5563', width: 100, flexShrink: 0, fontWeight: 500 }}>
                        {CAT_LABELS[cat] ?? cat}
                      </span>
                      <div style={{ flex: 1, height: 9, background: '#eef2f1', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(8, (count / maxCat) * 100)}%`, background: `linear-gradient(90deg, ${cc}99, ${cc})`, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#1f2937', width: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/reports#live-map" className="ts-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#003526', textDecoration: 'none' }}>
              Lihat peta lengkap
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_forward</span>
            </Link>
          </div>

          {/* ── BLOK B ── */}
          <div style={{ ...CARD, padding: 30, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#EF4444', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>e911_emergency</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0f211b' }}>Status Darurat SOS</p>
                <p style={{ fontSize: 12, color: '#7a8a85', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#EF4444', display: 'inline-block' }} className="ts-pulse" />
                  Dipantau real-time 24/7
                </p>
              </div>
            </div>

            {sos === null && (
              <p style={{ fontSize: 13, color: '#9ca3af', padding: '24px 0', textAlign: 'center' }}>Memuat status darurat…</p>
            )}

            {sos !== null && sos.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '28px 0',
                background: 'radial-gradient(circle at 50% 30%, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
                border: '1px solid rgba(16,185,129,0.22)', borderRadius: 16,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 999, background: 'rgba(16,185,129,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: 30, fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#047857', marginBottom: 3 }}>Tidak ada darurat aktif</p>
                <p style={{ fontSize: 12.5, color: '#059669' }}>Situasi Maluku Utara terpantau aman.</p>
              </div>
            )}

            {sos !== null && sos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sos.slice(0, 3).map((s) => {
                  const m = emMeta(s.emergency_type);
                  return (
                    <div key={s.id} style={{ border: `1px solid ${m.color}30`, background: `linear-gradient(180deg, ${m.color}0D, ${m.color}05)`, borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ color: m.color, fontSize: 19, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 800, color: '#1f2937' }}>{m.label}</p>
                          <p style={{ fontSize: 10.5, color: '#6b7280' }}>{tsRelTime(s.created_at)} · sedang ditangani</p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: '#047857', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', padding: '3px 8px', borderRadius: 999, flexShrink: 0 }}>
                          Ditangani
                        </span>
                      </div>
                      {s.note_preview && (
                        <p style={{ fontSize: 11.5, color: '#4b5563', lineHeight: 1.4, marginBottom: 8 }}>“{s.note_preview}”</p>
                      )}
                      <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noopener noreferrer" className="ts-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: m.color, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>location_on</span>
                        Lihat lokasi
                        {s.gps_accuracy_meters ? <span style={{ color: '#9ca3af', fontWeight: 500 }}> · ±{s.gps_accuracy_meters}m</span> : null}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
              <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#9ca3af', flexShrink: 0, marginTop: 1 }}>info</span>
                <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                  Tombol SOS darurat aktif 24/7. Lokasi hanya tampil bila pelapor &amp; tim menyetujui — privasi tetap dijaga.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── BLOK A2 — Laporan Terbaru ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>Laporan Terbaru</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f211b', letterSpacing: '-0.5px' }}>Apa yang sedang dilaporkan warga</h3>
            </div>
            <Link href="/reports#live-map" className="ts-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 700, color: '#003526', textDecoration: 'none' }}>
              Lihat di peta
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>map</span>
            </Link>
          </div>

          {reports === null && <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>Memuat laporan terbaru…</p>}
          {reports !== null && reports.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', padding: '20px 0' }}>Belum ada laporan terverifikasi.</p>}

          {reports !== null && reports.length > 0 && (
            <div className="ts-reports" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {reports.map((r) => {
                const p = prioMeta(r.priority);
                const catKey = (r.category ?? 'lainnya').toLowerCase();
                const catIcon = CATEGORY_ICON[catKey] ?? 'category';
                const catLabel = CAT_LABELS[catKey] ?? 'Lainnya';
                const cc = catColor(catKey);
                const res = r.resolution ?? 'open';
                const steps = [
                  { label: 'Diverifikasi', done: true },
                  { label: 'Ditangani', done: res === 'ditangani' || res === 'selesai' },
                  { label: 'Selesai', done: res === 'selesai' },
                ];
                return (
                  <div key={r.id} style={{ ...CARD, borderRadius: 16, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 4, background: `linear-gradient(90deg, ${cc}, ${cc}99)` }} />
                    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.3, color: p.color, background: p.bg, padding: '3px 8px', borderRadius: 999 }}>{p.label}</span>
                        {r.display_id && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.display_id}</span>}
                        {r.status === 'published' && (
                          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, letterSpacing: 0.3, color: '#0891B2', background: 'rgba(8,145,178,0.1)', padding: '3px 8px', borderRadius: 999 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>newspaper</span>
                            BERITA
                          </span>
                        )}
                      </div>
                      <h4 style={{
                        fontSize: 14.5, fontWeight: 700, color: '#1f2937', lineHeight: 1.4, marginBottom: 14,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      } as CSSProperties}>{r.title}</h4>
                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, color: '#6b7280' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: cc, background: `${cc}14`, padding: '4px 10px 4px 8px', borderRadius: 999 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{catIcon}</span>
                          {catLabel}
                        </span>
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

                      {/* Stepper progres resolusi (civic) */}
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex' }}>
                        {steps.map((st, i) => (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            {i < steps.length - 1 && (
                              <div style={{ position: 'absolute', top: 6, left: '50%', width: '100%', height: 2, background: steps[i + 1].done ? '#0891B2' : '#e5e7eb' }} />
                            )}
                            <div style={{ width: 14, height: 14, borderRadius: 999, background: st.done ? '#0891B2' : '#ffffff', border: `2px solid ${st.done ? '#0891B2' : '#d1d5db'}`, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {st.done && <span className="material-symbols-outlined" style={{ fontSize: 9, color: '#ffffff', fontVariationSettings: "'FILL' 1" }}>check</span>}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: st.done ? '#0f211b' : '#9ca3af', marginTop: 5, textAlign: 'center', lineHeight: 1.15 }}>{st.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── BLOK C — CTA ── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(120deg, #003526 0%, #0891B2 100%)',
          borderRadius: 22, padding: '28px 32px',
          boxShadow: '0 24px 48px -16px rgba(0,53,38,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 88% 12%, rgba(255,255,255,0.18), transparent 45%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 26 }}>track_changes</span>
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 3, letterSpacing: '-0.3px' }}>Punya laporan? Pantau progresnya.</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>Lacak status laporanmu kapan saja — dari masuk sampai ditindaklanjuti.</p>
            </div>
          </div>
          <Link href={LACAK_HREF} className="ts-cta-btn" style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'white', color: '#003526', padding: '13px 22px', borderRadius: 12,
            fontSize: 13.5, fontWeight: 800, textDecoration: 'none', flexShrink: 0,
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          }}>
            Lacak Laporanmu
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_forward</span>
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ts-grid { grid-template-columns: 1fr !important; }
          .ts-reports { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .ts-reports { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .ts-link { transition: gap .2s ease; }
        .ts-link:hover { gap: 10px; }
        .ts-cta-btn { transition: transform .2s ease, box-shadow .2s ease; }
        .ts-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(0,0,0,0.2); }
        @keyframes tsPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.8); } }
        .ts-pulse { animation: tsPulse 1.8s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
