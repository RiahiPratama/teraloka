'use client';

/**
 * TeraLoka — Hero Stats Counter (BALAPOR LP)
 * Bridge Sprint Day 12 evening (10 Mei 2026)
 * ------------------------------------------------------------
 * Replace hardcoded "0 laporan masuk" di hero LP BALAPOR
 * dengan REAL stats fetch + animated count-up.
 *
 * Endpoint: GET /balapor/peta/stats
 * Returns: { total, by_priority, by_category, by_status }
 *
 * Behavior:
 *   - Fetch on mount
 *   - Animated count-up dari 0 → real value (1.5s easing)
 *   - Loading state: skeleton
 *   - Error state: silent fail dengan placeholder "—"
 *   - Pre-launch friendly: kalau total=0, tampil 0 (gak hide)
 */

import { useEffect, useState, useRef } from 'react';

interface PublicStats {
  total: number;
  by_priority: { urgent: number; high: number; normal: number };
  by_category: Record<string, number>;
  by_status: { verified: number; published: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

export function HeroStatsCounter() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/balapor/peta/stats`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((response) => {
        // Response shape: { success: true, data: { total, ... } }
        const data = response.data ?? response;
        setStats(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('[HeroStats] fetch error:', err);
          setError(true);
        }
      });

    return () => controller.abort();
  }, []);

  // Loading skeleton
  if (!stats && !error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            height: 56,
            width: 200,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 12,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: 16,
            width: 160,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 6,
          }}
        />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Error fallback — silent, tampil "—"
  if (error || !stats) {
    return (
      <div>
        <h2
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: 'white',
            lineHeight: 1,
            letterSpacing: '-1px',
            marginBottom: 8,
          }}
        >
          — laporan masuk
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Data tidak tersedia
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero stat: Total laporan with count-up */}
      <h2
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: 'white',
          lineHeight: 1,
          letterSpacing: '-1px',
          marginBottom: 8,
        }}
      >
        <CountUp end={stats.total} duration={1500} />{' '}
        <span style={{ fontWeight: 600, opacity: 0.85, fontSize: 28 }}>
          laporan
        </span>
      </h2>

      {/* Sub-metrics row */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <SubMetric
          dotColor="#F87171"
          label="Urgent"
          value={stats.by_priority.urgent}
        />
        <SubMetric
          dotColor="#FBBF24"
          label="High"
          value={stats.by_priority.high}
        />
        <SubMetric
          dotColor="#10B981"
          label="Verified"
          value={stats.by_status.verified}
        />
        <SubMetric
          dotColor="#60A5FA"
          label="Published"
          value={stats.by_status.published}
        />
      </div>
    </div>
  );
}

// ─── Count-up animation component ─────────────────────────────

function CountUp({
  end,
  duration = 1500,
}: {
  end: number;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Easing function (ease-out-quart untuk slowing-down feel)
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = ease(progress);
      const current = Math.round(end * eased);
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration]);

  return <span>{value.toLocaleString('id-ID')}</span>;
}

// ─── Sub Metric Pill ─────────────────────────────────────────

function SubMetric({
  dotColor,
  label,
  value,
}: {
  dotColor: string;
  label: string;
  value: number;
}) {
  return (
    <span
      style={{
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
          background: dotColor,
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600 }}>{value}</span>
      <span style={{ opacity: 0.7 }}>{label}</span>
    </span>
  );
}
