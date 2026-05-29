'use client';

/**
 * TeraLoka — Komunitas Awal Section v3 (cream warm bg)
 * Bridge Sprint Day 13 morning (11 Mei 2026)
 * ------------------------------------------------------------
 * Background change: hijau dark → cream warm (#fef6e8)
 * Avoids hijau dobel dengan Tantangan-Manifesto section di atasnya.
 * Cards adjusted untuk light bg dengan colored accents.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const FORM_PATH = '/balapor/buat-laporan';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

interface BenefitCard {
  iconName: string;
  iconBg: string;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  bgGradient: string;
  shadowColor: string;
  borderColor: string;
  title: string;
  description: string;
}

const BENEFITS: BenefitCard[] = [
  {
    iconName: 'workspace_premium',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#10B981',
    gradientFrom: '#10B981',
    gradientTo: '#047857',
    bgGradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    shadowColor: 'rgba(16, 185, 129, 0.20)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    title: 'Dapatkan Founding Badge',
    description: '100 orang pertama mendapat badge eksklusif Founding Reporter di profil mereka.',
  },
  {
    iconName: 'group_add',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: '#F59E0B',
    gradientFrom: '#F59E0B',
    gradientTo: '#B45309',
    bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    shadowColor: 'rgba(245, 158, 11, 0.20)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    title: 'Ajak teman jadi pelapor',
    description: 'Bantu komunitas tumbuh dengan mengajak teman dan keluarga ikut bergabung.',
  },
  {
    iconName: 'route',
    iconBg: 'rgba(168, 85, 247, 0.15)',
    iconColor: '#A855F7',
    gradientFrom: '#A855F7',
    gradientTo: '#7E22CE',
    bgGradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    shadowColor: 'rgba(168, 85, 247, 0.20)',
    borderColor: 'rgba(168, 85, 247, 0.25)',
    title: 'Bentuk arah BALAPOR bersama',
    description: 'Vote fitur baru, beri masukan langsung, tentukan arah platform ini ke depan.',
  },
];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #EF4444, #DC2626)',
  'linear-gradient(135deg, #F59E0B, #B45309)',
  'linear-gradient(135deg, #10B981, #047857)',
  'linear-gradient(135deg, #3B82F6, #1E40AF)',
  'linear-gradient(135deg, #A855F7, #7E22CE)',
];

export function KomunitasAwalSection() {
  const [count, setCount] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/balapor/peta/stats`, { signal: controller.signal })
      .then((r) => r.json())
      .then((response) => {
        const data = response.data ?? response;
        setCount(data.total ?? 0);
      })
      .catch(() => setCount(0));
    return () => controller.abort();
  }, []);

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
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: 'linear-gradient(135deg, #fef6e8 0%, #fdf2e0 100%)',
        padding: '56px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative subtle pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(239, 68, 68, 0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div
          className="komunitas-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: 60,
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          {/* Left */}
          <div
            style={{
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
              Komunitas Awal
            </p>

            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 800,
                color: '#1f2937',
                lineHeight: 1.1,
                letterSpacing: '-1px',
                marginBottom: 16,
              }}
            >
              Jadilah bagian dari{' '}
              <span style={{ color: 'var(--color-balapor)' }}>perubahan</span>.
            </h2>

            <p
              style={{
                fontSize: 15,
                color: '#4b5563',
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              BALAPOR baru dimulai, dan suara pertamamu sangat berarti. Bersama
              kita bangun budaya transparansi di Maluku Utara.
            </p>

            <div
              style={{
                background: 'white',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 24,
                flexWrap: 'wrap',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {AVATAR_GRADIENTS.map((gradient, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: gradient,
                      border: '2px solid white',
                      marginLeft: idx === 0 ? 0 : -10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16 }}
                    >
                      person
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, minWidth: 120 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1f2937',
                    lineHeight: 1.3,
                  }}
                >
                  {count !== null ? count.toLocaleString('id-ID') : '0'} warga sudah bergabung
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginTop: 2,
                  }}
                >
                  Jadilah bagian dari komunitas awal
                </p>
              </div>
            </div>

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
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                add_circle
              </span>
              Jadi Pelapor Pertama
            </Link>
          </div>

          {/* Right: 3 colored benefit cards */}
          <div className="benefit-cards">
            {BENEFITS.map((benefit, idx) => (
              <BenefitCardItem
                key={idx}
                benefit={benefit}
                isVisible={isVisible}
                delay={0.1 + idx * 0.12}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .benefit-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .komunitas-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .benefit-cards {
            flex-direction: row;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            margin-inline: -24px;
            padding: 0 24px 8px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 12px;
          }
          .benefit-cards::-webkit-scrollbar {
            display: none;
          }
          .benefit-cards > * {
            flex: 0 0 84%;
            max-width: 320px;
            scroll-snap-align: center;
          }
        }
      `}</style>
    </section>
  );
}

function BenefitCardItem({
  benefit,
  isVisible,
  delay,
}: {
  benefit: BenefitCard;
  isVisible: boolean;
  delay: number;
}) {
  return (
    <div
      style={{
        background: benefit.bgGradient,
        border: `1px solid ${benefit.borderColor}`,
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s, border-color 0.3s, box-shadow 0.3s, transform 0.3s`,
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 14px ${benefit.shadowColor.replace('0.20', '0.10')}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = benefit.gradientFrom + '50';
        e.currentTarget.style.boxShadow = `0 12px 32px ${benefit.shadowColor}`;
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = benefit.borderColor;
        e.currentTarget.style.boxShadow = `0 4px 14px ${benefit.shadowColor.replace('0.20', '0.10')}`;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${benefit.gradientFrom}, ${benefit.gradientTo})`,
        }}
      />

      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${benefit.gradientFrom}, ${benefit.gradientTo})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 6px 14px ${benefit.shadowColor}`,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            color: 'white',
            fontSize: 22,
            fontVariationSettings: "'FILL' 1, 'wght' 700",
          }}
        >
          {benefit.iconName}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: '#1f2937',
            marginBottom: 4,
            lineHeight: 1.3,
          }}
        >
          {benefit.title}
        </h3>
        <p
          style={{
            fontSize: 12,
            color: '#4b5563',
            lineHeight: 1.5,
          }}
        >
          {benefit.description}
        </p>
      </div>
    </div>
  );
}
