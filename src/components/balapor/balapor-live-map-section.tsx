'use client';

/**
 * TeraLoka — BalaporLiveMapSection
 * Bridge Sprint Day 10 (10 Mei 2026) — Hybrid B+C Live Map Section
 * ------------------------------------------------------------
 * Wrapper section untuk landing page BALAPOR yang adaptif berdasarkan
 * jumlah laporan public:
 *
 *   Phase 0 (total = 0):     Visual demo flow + CTA "Jadi yang pertama"
 *   Phase 1 (total 1-9):     Small map + "Jadilah pioneer" copy + CTA
 *   Phase 2 (total >= 10):   Full map + filter pills + counter
 *
 * Strategy: Single section component yang adapt content, bukan section
 * yang muncul/hilang. Layout shift = anti-conversion.
 *
 * Filosofi:
 *   - Day 1 launch: Phase 0, demo flow educational + CTA
 *   - Early adopter: Phase 1, growth narrative "jadilah pelapor pertama"
 *   - Critical mass: Phase 2, full transparency + exploration tools
 *
 * Performance:
 *   - Stats fetch DULU (lightweight) untuk decide phase
 *   - Reports fetch HANYA kalau Phase 1+ (skip kalau Phase 0)
 *   - <BalaporPublicMap /> dynamic import (avoid SSR Leaflet bundle bloat)
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

/* ─── Lazy-load map (Leaflet has SSR issues) ─── */
const BalaporPublicMap = dynamic(
  () => import('./balapor-public-map').then((m) => m.BalaporPublicMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: 400,
          borderRadius: 14,
          background: '#f9f9f8',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: 13,
        }}
      >
        Memuat peta...
      </div>
    ),
  },
);

/* ─── Types match backend response shape ─── */

interface PublicReport {
  id: string;
  display_id: string | null;
  title: string;
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

interface PublicStats {
  total: number;
  by_priority: { urgent: number; high: number; normal: number };
  by_category: Record<string, number>;
  by_status: { verified: number; published: number };
}

/* ─── Config ─── */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

const FORM_PATH = '/balapor/buat-laporan';

/* ─── 5-step Demo data (Phase 0 fallback) ─── */

const DEMO_STEPS = [
  {
    num: 1,
    title: 'Foto + Tulis',
    icon: 'photo_camera',
    desc: 'Lihat masalah? Foto + jelaskan singkat. GPS otomatis.',
    color: '#EF4444',
  },
  {
    num: 2,
    title: 'Verifikasi',
    icon: 'verified',
    desc: 'Tim TeraLoka cek fakta + lokasi.',
    color: '#3B82F6',
  },
  {
    num: 3,
    title: 'Naik BAKABAR',
    icon: 'newspaper',
    desc: 'Kalau layak, jadi artikel berita. Dibaca ribuan.',
    color: '#10B981',
  },
  {
    num: 4,
    title: 'Aksi Bersama',
    icon: 'groups',
    desc: 'Diskusi publik, kalau perlu donasi via BADONASI.',
    color: '#F59E0B',
  },
  {
    num: 5,
    title: 'Konfirmasi',
    icon: 'check_circle',
    desc: 'Kamu konfirmasi: sudah teratasi atau belum?',
    color: '#10B981',
  },
];

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */

export function BalaporLiveMapSection() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch stats first, then reports (kalau Phase 1+) ── */
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        // 1. Fetch stats (lightweight, decide phase)
        const statsRes = await fetch(`${API_URL}/balapor/peta/stats`, {
          signal: controller.signal,
        });
        if (!statsRes.ok) throw new Error('Gagal memuat statistik');
        const statsJson = await statsRes.json();
        const statsData: PublicStats = statsJson?.data;
        setStats(statsData);

        // 2. Skip reports fetch kalau Phase 0 (no data)
        if (statsData.total === 0) {
          setLoading(false);
          return;
        }

        // 3. Fetch reports
        const reportsRes = await fetch(`${API_URL}/balapor/peta?limit=200`, {
          signal: controller.signal,
        });
        if (!reportsRes.ok) throw new Error('Gagal memuat laporan');
        const reportsJson = await reportsRes.json();
        setReports(reportsJson?.data ?? []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message ?? 'Gagal memuat data');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, []);

  /* ── Determine phase ── */
  const total = stats?.total ?? 0;
  const phase: 0 | 1 | 2 = total === 0 ? 0 : total < 10 ? 1 : 2;

  return (
    <section
      style={{
        background: 'white',
        padding: '80px 32px',
        borderTop: '1px solid #f3f4f6',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* ─── Section Header ─── */}
        <SectionHeader phase={phase} stats={stats} loading={loading} />

        {/* ─── Section Body — adaptif by phase ─── */}
        {loading && <LoadingState />}

        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && phase === 0 && <Phase0Demo />}

        {!loading && !error && phase === 1 && (
          <Phase1SmallMap reports={reports} stats={stats!} />
        )}

        {!loading && !error && phase === 2 && (
          <Phase2FullMap reports={reports} stats={stats!} />
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: Section Header
   ════════════════════════════════════════════════════════════════ */

function SectionHeader({
  phase,
  stats,
  loading,
}: {
  phase: 0 | 1 | 2;
  stats: PublicStats | null;
  loading: boolean;
}) {
  let kicker = 'TRANSPARANSI WARGA';
  let title: string;
  let subtitle: string;

  if (phase === 0) {
    title = 'Begini Cara Kerja BALAPOR';
    subtitle = 'Lapor masalah → publik tahu → solusi bersama. 5 langkah sederhana.';
  } else if (phase === 1) {
    title = 'Pelapor Pertama Sedang Bicara';
    subtitle = `${stats?.total ?? 0} laporan terverifikasi dalam 30 hari. Jadilah suara berikutnya.`;
  } else {
    title = 'Lapor Sekarang Berdampak Nyata';
    subtitle = loading
      ? 'Memuat data laporan...'
      : `${stats?.total ?? 0} laporan terverifikasi dari warga Maluku Utara dalam 30 hari terakhir.`;
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#EF4444',
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {kicker}
      </p>
      <h2
        style={{
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 800,
          color: '#1f2937',
          letterSpacing: '-0.8px',
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 600, margin: '0 auto' }}>
        {subtitle}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: Loading State
   ════════════════════════════════════════════════════════════════ */

function LoadingState() {
  return (
    <div
      style={{
        height: 400,
        background: '#f9f9f8',
        borderRadius: 14,
        border: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: 13,
      }}
    >
      Memuat data...
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: Error State
   ════════════════════════════════════════════════════════════════ */

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 32,
        background: '#FEF2F2',
        borderRadius: 14,
        border: '1px solid #FECACA',
        textAlign: 'center',
        color: '#991B1B',
        fontSize: 13,
      }}
    >
      <p style={{ marginBottom: 8, fontWeight: 700 }}>⚠️ Gagal memuat data</p>
      <p style={{ color: '#7F1D1D' }}>{message}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: Phase 0 — Visual Demo Flow
   ════════════════════════════════════════════════════════════════ */

function Phase0Demo() {
  return (
    <>
      {/* Demo flow grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {DEMO_STEPS.map((step) => (
          <div
            key={step.num}
            style={{
              background: '#f9f9f8',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: 20,
              textAlign: 'center',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'white',
                border: `2px solid ${step.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: step.color, fontSize: 22 }}
              >
                {step.icon}
              </span>
            </div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: step.color,
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              LANGKAH {step.num}
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: 6,
              }}
            >
              {step.title}
            </p>
            <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <Link
          href={FORM_PATH}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 28px',
            background: '#EF4444',
            color: 'white',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add_alert
          </span>
          Jadi Pelapor Pertama
        </Link>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Anonim aman · GPS otomatis · 100% gratis
        </p>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: Phase 1 — Small Map + Pioneer Copy
   ════════════════════════════════════════════════════════════════ */

function Phase1SmallMap({
  reports,
  stats,
}: {
  reports: PublicReport[];
  stats: PublicStats;
}) {
  return (
    <>
      {/* Pioneer message banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)',
          border: '1px solid #F59E0B',
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 28 }}>🌱</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>
            BALAPOR baru mulai berkembang.
          </p>
          <p style={{ fontSize: 12, color: '#78350F' }}>
            {stats.total} pelapor pertama sudah berani bicara. Suara kamu memperkuat
            ekosistem ini.
          </p>
        </div>
      </div>

      {/* Small map */}
      <BalaporPublicMap reports={reports} height={320} disableCluster={true} />

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link
          href={FORM_PATH}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#EF4444',
            color: 'white',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(239,68,68,0.2)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            add_alert
          </span>
          Tambah Suara Kamu
        </Link>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: Phase 2 — Full Map + Stats Counter
   ════════════════════════════════════════════════════════════════ */

function Phase2FullMap({
  reports,
  stats,
}: {
  reports: PublicReport[];
  stats: PublicStats;
}) {
  return (
    <>
      {/* Stats counter strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatsCard
          value={stats.total}
          label="Total Laporan"
          color="#EF4444"
          icon="campaign"
        />
        <StatsCard
          value={stats.by_status.verified}
          label="Terverifikasi"
          color="#10B981"
          icon="verified"
        />
        <StatsCard
          value={stats.by_status.published}
          label="Naik BAKABAR"
          color="#003526"
          icon="newspaper"
        />
        <StatsCard
          value={stats.by_priority.urgent}
          label="Urgent"
          color="#DC2626"
          icon="priority_high"
        />
      </div>

      {/* Full map */}
      <BalaporPublicMap reports={reports} height={480} />

      {/* CTA below */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link
          href={FORM_PATH}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#EF4444',
            color: 'white',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(239,68,68,0.2)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            add_alert
          </span>
          Tambah Laporan Kamu
        </Link>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Klik titik di peta untuk lihat detail · Cluster akan terbuka saat di-zoom
        </p>
      </div>
    </>
  );
}

/* ─── StatsCard helper ─── */

function StatsCard({
  value,
  label,
  color,
  icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 14,
        textAlign: 'center',
        transition: 'border-color 0.2s',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 6px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color, fontSize: 18 }}
        >
          {icon}
        </span>
      </div>
      <p
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#1f2937',
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#6b7280',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
    </div>
  );
}
