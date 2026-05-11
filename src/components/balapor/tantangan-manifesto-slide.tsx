'use client';

/**
 * TeraLoka — Tantangan & Manifesto Slide (BALAPOR LP)
 * Bridge Sprint Day 12 Step 8 LEGEND (10 Mei 2026)
 * ------------------------------------------------------------
 * 2-slide carousel: Tantangan ↔ Manifesto.
 * Tab nav atas, auto-slide 9s pause-on-hover, dots, arrows.
 */

import { useEffect, useRef, useState } from 'react';

const AUTO_SLIDE_INTERVAL = 9000;

interface Challenge {
  iconName: string;
  iconColor: string;
  title: string;
  description: string;
}

const CHALLENGES: Challenge[] = [
  {
    iconName: 'cancel',
    iconColor: '#EF4444',
    title: 'Laporan sering hilang tanpa kejelasan.',
    description:
      'Laporan masuk, tapi sulit dipantau perkembangannya. Tidak ada kepastian tindak lanjut.',
  },
  {
    iconName: 'cancel',
    iconColor: '#F59E0B',
    title: 'Masalah publik tenggelam di timeline.',
    description:
      'Laporan di Facebook, Twitter, atau grup WhatsApp cepat tenggelam dan sulit dilacak kembali.',
  },
  {
    iconName: 'cancel',
    iconColor: '#A855F7',
    title: 'Takut bicara karena identitas bisa tersebar.',
    description:
      'Banyak warga ingin melapor tapi takut identitasnya diketahui dan menimbulkan masalah.',
  },
];

interface ManifestoPoint {
  iconName: string;
  iconColor: string;
  title: string;
  description: string;
}

const MANIFESTO_POINTS: ManifestoPoint[] = [
  {
    iconName: 'campaign',
    iconColor: '#10B981',
    title: 'Suara warga berharga',
    description: 'Setiap keluhan adalah bukti bahwa warga peduli. Kami mendengar.',
  },
  {
    iconName: 'visibility',
    iconColor: '#3B82F6',
    title: 'Transparansi membangun percaya',
    description: 'Setiap proses dipublikasikan. Tidak ada yang ditutupi.',
  },
  {
    iconName: 'group',
    iconColor: '#F59E0B',
    title: 'Bersama mendorong perubahan',
    description: 'Seribu suara warga MalUt akan mengubah keadaan.',
  },
];

export function TantanganManifestoSlide() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [isVisible, isPaused]);

  return (
    <section
      ref={sectionRef}
      style={{
        background:
          'linear-gradient(135deg, #001a13 0%, #003526 50%, #001a13 100%)',
        padding: '72px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative dot pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(149, 211, 186, 0.05) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(239, 68, 68, 0.08), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(149, 211, 186, 0.06), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Tab Nav */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 24,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              gap: 4,
              padding: 5,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 999,
              backdropFilter: 'blur(12px)',
            }}
            role="tablist"
          >
            <TabButton
              isActive={activeSlide === 0}
              onClick={() => setActiveSlide(0)}
              iconName="warning"
              label="Tantangan"
            />
            <TabButton
              isActive={activeSlide === 1}
              onClick={() => setActiveSlide(1)}
              iconName="favorite"
              label="Manifesto"
            />
          </div>
        </div>

        {/* Slide content */}
        <div style={{ position: 'relative', minHeight: 380 }}>
          <div
            style={{
              position: activeSlide === 0 ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: activeSlide === 0 ? 1 : 0,
              transform:
                activeSlide === 0 ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
              pointerEvents: activeSlide === 0 ? 'auto' : 'none',
            }}
            role="tabpanel"
            aria-hidden={activeSlide !== 0}
          >
            <TantanganContent isVisible={isVisible && activeSlide === 0} />
          </div>

          <div
            style={{
              position: activeSlide === 1 ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              right: 0,
              opacity: activeSlide === 1 ? 1 : 0,
              transform:
                activeSlide === 1 ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
              pointerEvents: activeSlide === 1 ? 'auto' : 'none',
            }}
            role="tabpanel"
            aria-hidden={activeSlide !== 1}
          >
            <ManifestoContent isVisible={isVisible && activeSlide === 1} />
          </div>
        </div>

        {/* Bottom controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
            marginTop: 20,
          }}
        >
          <NavArrow
            direction="prev"
            onClick={() => setActiveSlide(activeSlide === 0 ? 1 : 0)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1].map((idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => setActiveSlide(idx)}
                style={{
                  width: activeSlide === idx ? 28 : 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    activeSlide === idx
                      ? 'var(--color-balapor)'
                      : 'rgba(255,255,255,0.20)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'width 0.4s ease, background 0.3s ease',
                }}
              />
            ))}
          </div>
          <NavArrow
            direction="next"
            onClick={() => setActiveSlide(activeSlide === 0 ? 1 : 0)}
          />
        </div>

        {/* Progress bar */}
        <div
          style={{
            margin: '20px auto 0',
            maxWidth: 200,
            height: 2,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            key={activeSlide}
            style={{
              height: '100%',
              background: 'var(--color-balapor)',
              borderRadius: 999,
              animation: isPaused
                ? 'none'
                : `slideProgress ${AUTO_SLIDE_INTERVAL}ms linear`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes slideProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </section>
  );
}

function TabButton({
  isActive,
  onClick,
  iconName,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  iconName: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        background: isActive ? 'var(--color-balapor)' : 'transparent',
        color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
        border: 'none',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isActive ? '0 4px 12px rgba(239, 68, 68, 0.35)' : 'none',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
        {iconName}
      </span>
      {label}
    </button>
  );
}

function NavArrow({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${direction === 'prev' ? 'Previous' : 'Next'} slide`}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {direction === 'prev' ? 'chevron_left' : 'chevron_right'}
      </span>
    </button>
  );
}

function TantanganContent({ isVisible }: { isVisible: boolean }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 'clamp(26px, 3.5vw, 38px)',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1.15,
          }}
        >
          Tantangan yang kita{' '}
          <span style={{ color: 'var(--color-balapor)' }}>hadapi bersama</span>
        </h2>
      </div>

      <div
        className="challenge-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {CHALLENGES.map((c, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 16,
              padding: 22,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: `opacity 0.6s ease ${idx * 0.1}s, transform 0.6s ease ${idx * 0.1}s, background 0.3s, border-color 0.3s`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: c.iconColor + '20',
                border: `1px solid ${c.iconColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color: c.iconColor,
                  fontSize: 20,
                  fontVariationSettings: "'FILL' 1, 'wght' 700",
                }}
              >
                {c.iconName}
              </span>
            </div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'white',
                lineHeight: 1.3,
                letterSpacing: '-0.2px',
                marginBottom: 8,
              }}
            >
              {c.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.6,
              }}
            >
              {c.description}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .challenge-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function ManifestoContent({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      className="manifesto-2col"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 48,
        alignItems: 'center',
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 'clamp(26px, 3.5vw, 38px)',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1.15,
            marginBottom: 20,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
          }}
        >
          Kenapa BALAPOR{' '}
          <span style={{ color: 'var(--color-balapor)' }}>dibuat?</span>
        </h2>

        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.7,
            marginBottom: 16,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
          }}
        >
          BALAPOR hadir agar masalah publik tidak lagi hilang begitu saja. Ini
          bukan sekadar platform —{' '}
          <strong style={{ color: 'white', fontWeight: 700 }}>
            ini adalah infrastruktur suara warga Maluku Utara
          </strong>
          .
        </p>

        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.5,
            letterSpacing: '-0.3px',
            borderLeft: '3px solid var(--color-balapor)',
            paddingLeft: 14,
            fontStyle: 'italic',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
          }}
        >
          Kita tidak hanya melapor.{' '}
          <span style={{ color: 'var(--color-balapor)' }}>
            Kita membangun perubahan.
          </span>
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {MANIFESTO_POINTS.map((p, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: 16,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: `opacity 0.6s ease ${0.4 + idx * 0.1}s, transform 0.6s ease ${0.4 + idx * 0.1}s, background 0.3s, border-color 0.3s`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: 12,
                background: p.iconColor + '20',
                border: `1px solid ${p.iconColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color: p.iconColor,
                  fontSize: 20,
                  fontVariationSettings: "'FILL' 1, 'wght' 700",
                }}
              >
                {p.iconName}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'white',
                  marginBottom: 4,
                  lineHeight: 1.3,
                }}
              >
                {p.title}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.5,
                }}
              >
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .manifesto-2col {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
      `}</style>
    </div>
  );
}
