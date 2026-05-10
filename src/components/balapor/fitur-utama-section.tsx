'use client';

/**
 * TeraLoka — Fitur Utama Section (CSS-only mobile slide)
 * Bridge Sprint Day 12 LEGEND FINAL (10 Mei 2026)
 * ------------------------------------------------------------
 * 5 fitur cards premium dengan service identity colors.
 * Mobile: native CSS scroll-snap (zero JS overhead).
 * Desktop: grid 5-col responsive.
 */

import { useEffect, useRef, useState } from 'react';

interface Feature {
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
  title: string;
  description: string;
  subFeatures: string[];
}

const FEATURES: Feature[] = [
  {
    iconName: 'shield_person',
    gradientFrom: '#10B981',
    gradientTo: '#047857',
    shadowColor: 'rgba(16, 185, 129, 0.20)',
    title: 'Aman & Anonim',
    description:
      'Identitas pelapor terlindungi by design. Lapor dengan tenang, fokus ke masalah.',
    subFeatures: [
      'Default mode anonim',
      'Nomor WA hanya untuk admin',
      'Encryption end-to-end',
    ],
  },
  {
    iconName: 'location_on',
    gradientFrom: '#3B82F6',
    gradientTo: '#1E40AF',
    shadowColor: 'rgba(59, 130, 246, 0.20)',
    title: 'Berbasis Lokasi',
    description:
      'GPS akurat untuk tandai lokasi presisi. Visualisasi langsung di peta MalUt.',
    subFeatures: [
      'GPS auto-detect',
      'Validasi lokasi MalUt',
      'Tampil di public map',
    ],
  },
  {
    iconName: 'verified',
    gradientFrom: '#8B5CF6',
    gradientTo: '#5B21B6',
    shadowColor: 'rgba(139, 92, 246, 0.20)',
    title: 'Verifikasi Transparan',
    description:
      'Setiap laporan diverifikasi tim moderator. Status update real-time.',
    subFeatures: [
      'Verifikasi <24 jam',
      'Audit trail public',
      'Konfirmasi pelapor',
    ],
  },
  {
    iconName: 'newspaper',
    gradientFrom: '#F59E0B',
    gradientTo: '#B45309',
    shadowColor: 'rgba(245, 158, 11, 0.20)',
    title: 'Terintegrasi BAKABAR',
    description:
      'Laporan penting otomatis naik jadi berita BAKABAR. Suara warga jadi headline lokal.',
    subFeatures: [
      'Auto-promote logic',
      'Editorial review',
      'Distribusi luas',
    ],
  },
  {
    iconName: 'emergency',
    gradientFrom: '#EF4444',
    gradientTo: '#B91C1C',
    shadowColor: 'rgba(239, 68, 68, 0.20)',
    title: 'Mode SOS Darurat',
    description:
      'Tap sekali, langsung tersambung ke tim respons emergency 24/7.',
    subFeatures: [
      'GPS broadcast',
      'WA admin instant',
      'Authority dispatch',
    ],
  },
];

export function FiturUtamaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: 'white',
        padding: '80px 0',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            textAlign: 'center',
            marginBottom: 56,
            padding: '0 24px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#10B981',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10B981',
              }}
            />
            Fitur Utama
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              color: '#1f2937',
              letterSpacing: '-1px',
              lineHeight: 1.1,
              marginBottom: 12,
            }}
          >
            Dibangun untuk warga,{' '}
            <span style={{ color: 'var(--color-balapor)' }}>oleh warga</span>.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: '#6b7280',
              maxWidth: 600,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Setiap fitur dirancang dengan satu tujuan: memastikan suara warga
            Maluku Utara didengar, diverifikasi, dan ditindaklanjuti.
          </p>
        </div>

        {/* Cards: CSS-only scroll-snap untuk mobile, grid untuk desktop */}
        <div className="fitur-cards">
          {FEATURES.map((feature, idx) => (
            <FeatureCard
              key={idx}
              feature={feature}
              isVisible={isVisible}
              delay={idx * 0.1}
            />
          ))}
        </div>
      </div>

      <style>{`
        .fitur-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          padding: 0 24px;
        }
        @media (min-width: 1100px) {
          .fitur-cards {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        @media (max-width: 768px) {
          .fitur-cards {
            display: flex;
            grid-template-columns: none;
            gap: 14px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: 24px;
            padding: 0 24px 8px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .fitur-cards::-webkit-scrollbar {
            display: none;
          }
          .fitur-cards > * {
            flex: 0 0 86%;
            max-width: 320px;
            scroll-snap-align: center;
          }
        }
      `}</style>
    </section>
  );
}

function FeatureCard({
  feature,
  isVisible,
  delay,
}: {
  feature: Feature;
  isVisible: boolean;
  delay: number;
}) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: 22,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s, box-shadow 0.3s ease, border-color 0.3s ease`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 12px 32px ${feature.shadowColor}`;
        e.currentTarget.style.borderColor = feature.gradientFrom + '40';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.transform = isVisible
          ? 'translateY(0)'
          : 'translateY(20px)';
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${feature.gradientFrom}, ${feature.gradientTo})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          boxShadow: `0 6px 16px ${feature.shadowColor}`,
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
          {feature.iconName}
        </span>
      </div>

      <h3
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: '#1f2937',
          letterSpacing: '-0.3px',
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {feature.title}
      </h3>

      <p
        style={{
          fontSize: 12,
          color: '#6b7280',
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        {feature.description}
      </p>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        {feature.subFeatures.map((sub, idx) => (
          <li
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              fontSize: 11,
              color: '#9ca3af',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 12,
                color: feature.gradientFrom,
                fontVariationSettings: "'FILL' 1, 'wght' 700",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              check_circle
            </span>
            <span style={{ lineHeight: 1.4 }}>{sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
