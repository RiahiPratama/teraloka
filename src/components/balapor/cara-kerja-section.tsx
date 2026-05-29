'use client';

/**
 * TeraLoka — Cara Kerja Section (BALAPOR LP)
 * Bridge Sprint Day 12 Step 8 Aggressive Refactor (10 Mei 2026)
 * ------------------------------------------------------------
 * Section "Cara Kerja BALAPOR".
 *
 * Inspired by reference LP_01: 5-step horizontal flow dengan
 * icon circle besar + connector arrows + numbered + emoji.
 *
 * Replaces existing inline cara-kerja section yang 5-step pakai
 * step.highlight pattern. Visual flow lebih prominent + premium.
 */

import { useEffect, useRef, useState } from 'react';

interface Step {
  num: number;
  title: string;
  highlight?: string;
  desc: string;
  iconName: string;
  bgColor: string;
  iconColor: string;
}

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Warga',
    highlight: 'melapor',
    desc: 'Sampaikan masalah dengan foto, lokasi, dan kronologi.',
    iconName: 'campaign',
    bgColor: '#FEE2E2',
    iconColor: '#EF4444',
  },
  {
    num: 2,
    title: 'Diverifikasi admin',
    desc: 'Tim memverifikasi laporan agar valid dan aman.',
    iconName: 'shield_person',
    bgColor: '#D1FAE5',
    iconColor: '#10B981',
  },
  {
    num: 3,
    title: 'Dipublikasikan',
    desc: 'Laporan tampil dan bisa dipantau oleh semua warga.',
    iconName: 'public',
    bgColor: '#DBEAFE',
    iconColor: '#3B82F6',
  },
  {
    num: 4,
    title: 'Dipantau bersama',
    desc: 'Warga ikut memantau dan memberi dukungan.',
    iconName: 'visibility',
    bgColor: '#EDE9FE',
    iconColor: '#8B5CF6',
  },
  {
    num: 5,
    title: 'Naik ke',
    highlight: 'BAKABAR',
    desc: 'Masalah penting akan didorong ke BAKABAR menjadi berita.',
    iconName: 'newspaper',
    bgColor: '#FEF3C7',
    iconColor: '#F59E0B',
  },
];

export function CaraKerjaSection() {
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
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="cara-kerja"
      style={{
        background: 'white',
        padding: '56px 32px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 32,
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
            Cara Kerja BALAPOR
          </p>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              color: '#1f2937',
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}
          >
            Dari laporan hingga{' '}
            <span style={{ color: 'var(--color-balapor)' }}>perubahan nyata</span>
          </h2>
        </div>

        {/* 5-step horizontal flow */}
        <div
          className="cara-kerja-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 16,
            position: 'relative',
            alignItems: 'flex-start',
          }}
        >
          {STEPS.map((step, idx) => (
            <StepItem
              key={step.num}
              step={step}
              isLast={idx === STEPS.length - 1}
              isVisible={isVisible}
              delay={idx * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Mobile responsive — stack vertically */}
      <style>{`
        @media (max-width: 768px) {
          .cara-kerja-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .cara-kerja-grid .arrow-connector {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

// ─── Step Item ─────────────────────────────────────────────────

function StepItem({
  step,
  isLast,
  isVisible,
  delay,
}: {
  step: Step;
  isLast: boolean;
  isVisible: boolean;
  delay: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        textAlign: 'center',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {/* Connector arrow (right side, kecuali last) */}
      {!isLast && (
        <div
          className="arrow-connector"
          style={{
            position: 'absolute',
            top: 30,
            right: -16,
            width: 32,
            height: 1,
            background: 'repeating-linear-gradient(90deg, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              color: '#d1d5db',
              fontSize: 16,
              position: 'absolute',
              right: -2,
              top: -8,
            }}
          >
            chevron_right
          </span>
        </div>
      )}

      {/* Icon Circle besar */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: step.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          position: 'relative',
          zIndex: 2,
          boxShadow: `0 4px 12px ${step.iconColor}25`,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            color: step.iconColor,
            fontSize: 28,
            fontVariationSettings: "'FILL' 1, 'wght' 700",
          }}
        >
          {step.iconName}
        </span>
      </div>

      {/* Title with number */}
      <h3
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: '#1f2937',
          marginBottom: 6,
          letterSpacing: '-0.2px',
        }}
      >
        {step.num}.{' '}
        {step.title}
        {step.highlight && (
          <>
            {' '}
            <span style={{ color: step.iconColor }}>{step.highlight}</span>
          </>
        )}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: '#6b7280',
          lineHeight: 1.5,
        }}
      >
        {step.desc}
      </p>
    </div>
  );
}
