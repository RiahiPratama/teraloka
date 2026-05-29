'use client';

/**
 * TeraLoka — Hero Section (BALAPOR LP) — Premium Refactor v2
 * Bridge Sprint Day 12 Step 8 Aggressive (10 Mei 2026)
 * ------------------------------------------------------------
 * Hero baru mirror reference LP_01 + LP_02:
 *   - Layout: Left text (40%) + Center Real Map visual (35%) + Right column (25%)
 *   - Right column: Activity Live Feed + SOS Mode Darurat box
 *   - SOS announcement banner di atas headline
 *   - 4 trust badges di bawah CTA buttons
 *   - Center: REAL Leaflet map (BalaporPublicMap) dengan production data
 *     Fallback ke decorative SVG MalUt kalau Phase 0 (no data)
 *
 * Layout responsive:
 *   - Desktop: 3-column grid (text + map + feed)
 *   - Tablet: 2-column (text+feed | map below)
 *   - Mobile: stacked (text → map → feed)
 *
 * v2 Changes:
 *   - Replace decorative MalukuUtaraSvgBg dengan real BalaporPublicMap
 *   - Adaptive: Phase 0 fallback ke SVG, Phase 1+ real map
 *   - Fetch stats + reports di hero (mirror BalaporLiveMapSection logic)
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MalukuUtaraSvgBg } from '@/components/balapor/maluku-utara-svg-bg';
import { ActivityLiveFeed } from '@/components/balapor/activity-live-feed';
import { HeroStatsCounter } from '@/components/balapor/hero-stats-counter';

/* ─── Lazy-load Leaflet map (avoid SSR issues) ─── */
const BalaporPublicMap = dynamic(
  () => import('./balapor-public-map').then((m) => m.BalaporPublicMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: 480,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
        }}
      >
        Memuat peta...
      </div>
    ),
  },
);

const FORM_PATH = '/balapor/buat-laporan';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

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

interface TrustBadge {
  iconName: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
}

const TRUST_BADGES: TrustBadge[] = [
  {
    iconName: 'shield_person',
    iconColor: '#10B981',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    title: 'Aman & Anonim',
    subtitle: 'Identitasmu terlindungi',
  },
  {
    iconName: 'location_on',
    iconColor: '#3B82F6',
    iconBg: 'rgba(59, 130, 246, 0.15)',
    title: 'Berbasis Lokasi',
    subtitle: 'Tepat dan akurat',
  },
  {
    iconName: 'visibility',
    iconColor: '#A855F7',
    iconBg: 'rgba(168, 85, 247, 0.15)',
    title: 'Transparan',
    subtitle: 'Dipantau bersama',
  },
  {
    iconName: 'newspaper',
    iconColor: '#F59E0B',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    title: 'Terhubung BAKABAR',
    subtitle: 'Masalah jadi berita',
  },
];

export function HeroSection() {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [hasData, setHasData] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

  // Fetch reports untuk map
  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        // Step 1: Stats prefetch (lightweight, decide phase)
        const statsRes = await fetch(`${API_URL}/balapor/peta/stats`, {
          signal: controller.signal,
        });

        if (!statsRes.ok) throw new Error('stats fetch failed');

        const statsData = await statsRes.json();
        const total = (statsData.data ?? statsData).total ?? 0;

        // Phase 0: gak ada data, skip reports fetch, render fallback
        if (total === 0) {
          setIsLoadingMap(false);
          setHasData(false);
          return;
        }

        // Phase 1+: fetch reports untuk map
        const reportsRes = await fetch(`${API_URL}/balapor/peta?limit=1000`, {
          signal: controller.signal,
        });

        if (!reportsRes.ok) throw new Error('reports fetch failed');

        const reportsData = await reportsRes.json();
        const reportsList: PublicReport[] = (reportsData.data ?? reportsData.reports ?? reportsData) as PublicReport[];

        if (Array.isArray(reportsList) && reportsList.length > 0) {
          setReports(reportsList);
          setHasData(true);
        } else {
          setHasData(false);
        }

        setIsLoadingMap(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('[HeroSection] map data fetch error:', err);
          setIsLoadingMap(false);
          setHasData(false);
        }
      }
    };

    void fetchData();
    return () => controller.abort();
  }, []);

  return (
    <section
      style={{
        background: '#001a13',
        padding: '60px 32px 56px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 720,
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(149, 211, 186, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(149, 211, 186, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* TOP NAV (mini logo + brand) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 56,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--color-balapor)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: 'white',
              fontSize: 16,
            }}
          >
            B
          </div>
          <div>
            <p
              style={{
                fontSize: 17,
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.3px',
              }}
            >
              BALAPOR
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: -2 }}>
              Suara Warga Maluku Utara
            </p>
          </div>
        </div>

        {/* HERO 3-COLUMN LAYOUT */}
        <div
          className="hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr 0.9fr',
            gap: 40,
            alignItems: 'flex-start',
          }}
        >
          {/* LEFT COLUMN: Text + CTA + badges */}
          <div>
            {/* SOS Announcement Banner */}
            <Link
              href="/sos"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px 8px 10px',
                borderRadius: 999,
                background:
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(220, 38, 38, 0.12))',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                marginBottom: 24,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.28), rgba(220, 38, 38, 0.20))';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(220, 38, 38, 0.12))';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                  boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.25)',
                  animation: 'sosPulse 2s ease-in-out infinite',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: 'white',
                    fontSize: 14,
                    fontVariationSettings: "'FILL' 1, 'wght' 700",
                  }}
                >
                  emergency
                </span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    background: 'rgba(239, 68, 68, 0.5)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 4,
                    letterSpacing: '0.5px',
                  }}
                >
                  BARU
                </span>
                Tombol SOS Darurat sekarang LIVE
                <span style={{ opacity: 0.7, fontWeight: 500 }}>→</span>
              </span>
            </Link>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 800,
                color: 'white',
                lineHeight: 1.05,
                letterSpacing: '-1.5px',
                marginBottom: 20,
              }}
            >
              Tempat suara warga{' '}
              <span style={{ color: 'var(--color-balapor)' }}>
                tidak lagi hilang
              </span>
              .
            </h1>

            {/* Sub-headline */}
            <p
              style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.6,
                marginBottom: 28,
                maxWidth: 480,
              }}
            >
              BALAPOR membantu warga Maluku Utara melaporkan masalah publik
              secara aman, transparan, dan bisa dipantau bersama.
            </p>

            {/* CTA buttons */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 32,
                flexWrap: 'wrap',
              }}
            >
              <Link
                href={FORM_PATH}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--color-balapor)',
                  color: 'white',
                  padding: '14px 24px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.35)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  add_circle
                </span>
                Buat Laporan Sekarang
              </Link>

              <a
                href="#cara-kerja"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  padding: '14px 24px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.12)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  play_circle
                </span>
                Lihat Cara Kerja
              </a>
            </div>

            {/* Trust badges 4 row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}
            >
              {TRUST_BADGES.map((badge, idx) => (
                <TrustBadgeRow key={idx} badge={badge} />
              ))}
            </div>
          </div>

          {/* CENTER COLUMN: Real Map (Phase 1+) atau SVG fallback (Phase 0) */}
          <div
            className="hero-map-col"
            style={{
              position: 'relative',
              minHeight: 480,
            }}
          >
            {isLoadingMap ? (
              // Loading state
              <div
                style={{
                  width: '100%',
                  height: 480,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '2px solid rgba(149, 211, 186, 0.2)',
                      borderTopColor: '#95d3ba',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 12px',
                    }}
                  />
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    Memuat peta MalUt...
                  </p>
                </div>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : hasData ? (
              // Phase 1+: Real Leaflet map dengan production data
              <div
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              >
                <BalaporPublicMap
                  reports={reports}
                  height={480}
                  initialZoom={7}
                />

                {/* Floating live counter overlay top-left */}
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'rgba(0, 26, 19, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(149, 211, 186, 0.3)',
                    borderRadius: 999,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 1000,
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10B981',
                      animation: 'liveDotMap 2s ease-in-out infinite',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'white',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {reports.length} laporan terverifikasi
                  </span>
                </div>

                {/* Floating CTA bottom */}
                <a
                  href="#live-map"
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    background: 'rgba(239, 68, 68, 0.95)',
                    backdropFilter: 'blur(12px)',
                    color: 'white',
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                    zIndex: 1000,
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = 'translateY(-1px)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = 'translateY(0)')
                  }
                >
                  Eksplor peta lengkap
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14 }}
                  >
                    arrow_forward
                  </span>
                </a>

                <style>{`
                  @keyframes liveDotMap {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                  }
                `}</style>
              </div>
            ) : (
              // Phase 0: Fallback ke decorative SVG (no data yet)
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: 480,
                  borderRadius: 14,
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <MalukuUtaraSvgBg
                  style={{
                    position: 'static',
                    width: '100%',
                    height: 'auto',
                    maxHeight: 540,
                    opacity: 1,
                  }}
                />

                {/* Phase 0 overlay message */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16,
                    background: 'rgba(0, 26, 19, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(149, 211, 186, 0.20)',
                    borderRadius: 12,
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(149, 211, 186, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: '#95d3ba', fontSize: 20 }}
                    >
                      explore
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: 2,
                      }}
                    >
                      Peta MalUt menunggu cerita pertama
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.4,
                      }}
                    >
                      Marker akan muncul saat ada laporan terverifikasi
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Activity Feed + SOS box */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <ActivityLiveFeed />

            {/* SOS Mode Darurat Box */}
            <Link
              href="/sos"
              style={{
                background:
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.10), rgba(220, 38, 38, 0.05))',
                border: '1px solid rgba(239, 68, 68, 0.30)',
                borderRadius: 16,
                padding: 18,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(220, 38, 38, 0.10))';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.10), rgba(220, 38, 38, 0.05))';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.30)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.20)',
                    animation: 'sosBoxPulse 2.5s ease-in-out infinite',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: 'white',
                      fontSize: 24,
                      fontVariationSettings: "'FILL' 1, 'wght' 700",
                    }}
                  >
                    emergency
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#FCA5A5',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Mode Darurat
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'white',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      marginBottom: 8,
                    }}
                  >
                    Butuh bantuan cepat?
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.5,
                    }}
                  >
                    Gunakan tombol SOS untuk laporan emergency 24/7.
                  </p>

                  <div
                    style={{
                      marginTop: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#FCA5A5',
                    }}
                  >
                    Pelajari lebih lanjut
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 14 }}
                    >
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Live ticker bar di bottom hero */}
        <div
          className="live-ticker"
          style={{
            marginTop: 40,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 999,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: 720,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10B981',
                animation: 'liveDot 2s ease-in-out infinite',
              }}
            />
            LIVE
          </span>

          {/* HeroStatsCounter as ticker content */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <HeroStatsCounter />
          </div>
        </div>
      </div>

      {/* Animations + responsive */}
      <style>{`
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.15); }
        }
        @keyframes sosBoxPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.20); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.10); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .hero-map-col {
            grid-column: span 2 !important;
            order: 3 !important;
          }
        }
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .hero-map-col {
            grid-column: auto !important;
            min-height: 320px !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Trust Badge Row ───────────────────────────────────────────

function TrustBadgeRow({ badge }: { badge: TrustBadge }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 4px',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: badge.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            color: badge.iconColor,
            fontSize: 16,
            fontVariationSettings: "'FILL' 1, 'wght' 600",
          }}
        >
          {badge.iconName}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.2,
          }}
        >
          {badge.title}
        </p>
        <p
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.3,
            marginTop: 1,
          }}
        >
          {badge.subtitle}
        </p>
      </div>
    </div>
  );
}
