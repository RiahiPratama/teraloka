'use client';

/**
 * TeraLoka — Ekosistem Section (Zoom-Style Carousel)
 * Bridge Sprint Day 12 evening polish (10 Mei 2026)
 * ------------------------------------------------------------
 * Cross-promote 6 layanan TeraLoka dari LP BALAPOR.
 *
 * Inspired by zoom.com card carousel:
 *   - Horizontal scroll dengan auto-advance (6s per card)
 *   - Manual nav: arrow buttons + dot indicators
 *   - Hover lift effect + scale
 *   - Service identity colors (CSS vars) per card
 *
 * Services (per memori TeraLoka roadmap):
 *   1. BALAPOR  - Active (current page, highlighted)
 *   2. SOS      - LIVE (NEW badge, link prominent)
 *   3. BAKABAR  - Active
 *   4. BADONASI - Active
 *   5. BAPASIAR - Coming soon
 *   6. BAKOS    - Coming soon
 *
 * Sprint 2A Batch 1 (14 Mei 2026):
 *   - BAKABAR href: /news → /bakabar (route migration)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface ServiceCard {
  key: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  status: 'current' | 'live' | 'active' | 'soon';
  icon: string;
  colorVar: string; // CSS variable name
  gradientFrom: string;
  gradientTo: string;
}

const SERVICES: ServiceCard[] = [
  {
    key: 'balapor',
    name: 'BALAPOR',
    tagline: 'Suara Warga MalUt',
    description: 'Lapor banjir, jalan rusak, sampah. Diverifikasi tim TeraLoka & dipantau publik bersama.',
    href: '/reports',
    status: 'current',
    icon: 'campaign',
    colorVar: '--color-balapor',
    gradientFrom: '#EF4444',
    gradientTo: '#B91C1C',
  },
  {
    key: 'sos',
    name: 'SOS Darurat',
    tagline: 'Siaran darurat ke komunitas',
    description: 'Siaran darurat ke peta komunitas. Bukan pengganti darurat resmi — hubungi 112 dulu.',
    href: '/sos',
    status: 'live',
    icon: 'emergency',
    colorVar: '--color-balapor',
    gradientFrom: '#EF4444',
    gradientTo: '#DC2626',
  },
  {
    key: 'bakabar',
    name: 'BAKABAR',
    tagline: 'Berita Lokal Maluku Utara',
    description: 'Portal berita kontekstual MalUt. Dibuat oleh kontributor lokal, untuk warga lokal.',
    href: '/bakabar',
    status: 'active',
    icon: 'newspaper',
    colorVar: '--color-bakabar',
    gradientFrom: '#8B5CF6',
    gradientTo: '#5B21B6',
  },
  {
    key: 'badonasi',
    name: 'BADONASI',
    tagline: 'Donasi & Crowdfunding',
    description: 'Kampanye kemanusiaan transparan. Dana langsung ke rekening mitra penyelenggara, bisa dipantau.',
    href: '/fundraising',
    status: 'active',
    icon: 'volunteer_activism',
    colorVar: '--color-badonasi',
    gradientFrom: '#EC4899',
    gradientTo: '#BE185D',
  },
  {
    key: 'bapasiar',
    name: 'BAPASIAR',
    tagline: 'Tiket Kapal & Speedboat',
    description: 'Booking transportasi laut antar pulau MalUt. Real-time slot, anti-bypass.',
    href: '#',
    status: 'soon',
    icon: 'directions_boat',
    colorVar: '--color-bapasiar',
    gradientFrom: '#0EA5E9',
    gradientTo: '#075985',
  },
  {
    key: 'bakos',
    name: 'BAKOS',
    tagline: 'Kos & Properti',
    description: 'Marketplace kos, kontrakan, properti. Verified listing + WA relay anti-spam.',
    href: '#',
    status: 'soon',
    icon: 'home_work',
    colorVar: '--color-bakos',
    gradientFrom: '#F59E0B',
    gradientTo: '#78350F',
  },
];

const AUTO_SLIDE_MS = 6000;
const VISIBLE_CARDS_DESKTOP = 3;

export function EkosistemSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Total slides (loop kalau scroll-snap)
  const totalSlides = SERVICES.length;

  // Auto-slide
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_SLIDE_MS);

    return () => clearInterval(interval);
  }, [isPaused, totalSlides]);

  // Scroll-triggered fade-in
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

  // Sync scroll position dengan active index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cardWidth = container.offsetWidth / VISIBLE_CARDS_DESKTOP;
    container.scrollTo({
      left: cardWidth * activeIndex,
      behavior: 'smooth',
    });
  }, [activeIndex]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  return (
    <section
      ref={sectionRef}
      style={{
        background: '#f9f9f8',
        padding: '56px 0 56px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 32,
            padding: '0 32px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(0, 53, 38, 0.08)',
              color: '#003526',
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Layanan Lengkap
          </span>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              color: '#1f2937',
              lineHeight: 1.1,
              letterSpacing: '-1px',
              marginBottom: 12,
            }}
          >
            Berbagai Layanan dalam 1 Aplikasi.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: '#6b7280',
              maxWidth: 600,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            TeraLoka adalah <strong>Gerbang Digital Maluku Utara</strong> —
            satu aplikasi, semua layanan warga.
          </p>
        </div>

        {/* Carousel container */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Cards scrollable row */}
          <div
            ref={containerRef}
            style={{
              display: 'flex',
              gap: 20,
              padding: '8px 32px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
            className="ekosistem-scroll"
          >
            {SERVICES.map((service, idx) => (
              <ServiceCardItem
                key={service.key}
                service={service}
                isActive={idx === activeIndex}
                isVisible={isVisible}
                delay={idx * 0.08}
              />
            ))}
          </div>

          {/* Navigation arrows */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous service"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24, color: '#1f2937' }}
            >
              arrow_back
            </span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next service"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24, color: '#1f2937' }}
            >
              arrow_forward
            </span>
          </button>
        </div>

        {/* Dot indicators */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 32,
          }}
        >
          {SERVICES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                width: idx === activeIndex ? 28 : 8,
                height: 8,
                borderRadius: 999,
                border: 'none',
                background: idx === activeIndex ? '#003526' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .ekosistem-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

// ─── Service Card ──────────────────────────────────────────────

function ServiceCardItem({
  service,
  isActive,
  isVisible,
  delay,
}: {
  service: ServiceCard;
  isActive: boolean;
  isVisible: boolean;
  delay: number;
}) {
  const isClickable = service.status !== 'soon';
  const cardContent = (
    <div
      style={{
        flex: '0 0 calc(33.333% - 14px)',
        minWidth: 280,
        maxWidth: 380,
        scrollSnapAlign: 'start',
        background: `linear-gradient(135deg, ${service.gradientFrom}08 0%, ${service.gradientFrom}15 100%)`,
        borderRadius: 20,
        padding: 24,
        boxShadow: isActive
          ? `0 12px 32px ${service.gradientFrom}25`
          : `0 4px 14px ${service.gradientFrom}12`,
        border: '1px solid',
        borderColor: isActive ? service.gradientFrom + '50' : service.gradientFrom + '25',
        transition: 'all 0.4s ease',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}s`,
        cursor: isClickable ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        height: 280,
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = `0 16px 40px ${service.gradientFrom}30`;
          e.currentTarget.style.borderColor = service.gradientFrom + '60';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isVisible
          ? 'translateY(0)'
          : 'translateY(20px)';
        e.currentTarget.style.boxShadow = isActive
          ? `0 12px 32px ${service.gradientFrom}25`
          : `0 4px 14px ${service.gradientFrom}12`;
        e.currentTarget.style.borderColor = isActive
          ? service.gradientFrom + '50'
          : service.gradientFrom + '25';
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${service.gradientFrom}, ${service.gradientTo})`,
        }}
      />

      {/* Status badge */}
      <StatusBadge status={service.status} gradientFrom={service.gradientFrom} />

      {/* Service icon */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${service.gradientFrom}, ${service.gradientTo})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          boxShadow: `0 4px 12px ${service.gradientFrom}30`,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            color: 'white',
            fontSize: 28,
            fontVariationSettings: "'FILL' 1, 'wght' 700",
          }}
        >
          {service.icon}
        </span>
      </div>

      {/* Service name + tagline */}
      <div style={{ marginBottom: 12 }}>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#1f2937',
            letterSpacing: '-0.3px',
            marginBottom: 4,
          }}
        >
          {service.name}
        </h3>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: service.gradientFrom,
          }}
        >
          {service.tagline}
        </p>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 13,
          color: '#6b7280',
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {service.description}
      </p>

      {/* CTA */}
      {isClickable && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            color: service.gradientFrom,
            marginTop: 12,
          }}
        >
          {service.status === 'current' ? 'Anda di sini' : 'Buka layanan'}
          {service.status !== 'current' && (
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              arrow_forward
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!isClickable || service.status === 'current') {
    return cardContent;
  }

  return (
    <Link href={service.href} style={{ textDecoration: 'none', flex: '0 0 auto' }}>
      {cardContent}
    </Link>
  );
}

// ─── Status Badge ──────────────────────────────────────────────

function StatusBadge({
  status,
  gradientFrom,
}: {
  status: ServiceCard['status'];
  gradientFrom: string;
}) {
  const configs = {
    current: { label: 'ANDA DI SINI', bg: 'rgba(0, 53, 38, 0.08)', color: '#003526' },
    live: { label: 'NEW · LIVE', bg: gradientFrom, color: 'white' },
    active: { label: 'AKTIF', bg: 'rgba(16, 185, 129, 0.12)', color: '#047857' },
    soon: { label: 'COMING SOON', bg: '#f1f5f9', color: '#64748b' },
  };

  const cfg = configs[status];

  return (
    <span
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.5px',
        padding: '4px 8px',
        borderRadius: 6,
      }}
    >
      {cfg.label}
    </span>
  );
}
