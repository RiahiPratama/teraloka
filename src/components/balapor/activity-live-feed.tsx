'use client';

/**
 * TeraLoka — Activity Live Feed (BALAPOR Hero)
 * Bridge Sprint Day 12 Step 8 Aggressive Refactor (10 Mei 2026)
 * ------------------------------------------------------------
 * Live activity feed di hero right column LP BALAPOR.
 *
 * Inspired by reference LP_01 + LP_02 (ChatGPT design pattern).
 *
 * Data source: /balapor/peta (existing endpoint Day 9)
 * Transform: report → activity entry dengan timestamp relative
 *
 * Activity types yang ditampilkan:
 *   1. "Laporan baru dari [lokasi]" → status verified
 *   2. "Laporan diverifikasi tim" → status verified + recent
 *   3. "Naik ke BAKABAR" → has_bakabar_article=true
 *
 * Pre-launch friendly:
 *   - Empty state: "Aktivitas akan tampil di sini saat warga mulai melaporkan"
 *   - Loading skeleton 3 row
 *   - Error: silent fail dengan minimal placeholder
 *
 * Update strategy:
 *   - Initial fetch on mount
 *   - Auto-refresh setiap 30s (lightweight polling)
 */

import { useEffect, useState } from 'react';

interface MapReport {
  id: string;
  display_id: string | null;
  title: string;
  category: string | null;
  priority: 'urgent' | 'high' | 'normal';
  status: 'verified' | 'published';
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  has_bakabar_article: boolean;
}

interface ActivityEntry {
  id: string;
  type: 'new_report' | 'verified' | 'bakabar';
  title: string;
  subtitle: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  timestamp: string;
  relativeTime: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';
const REFRESH_INTERVAL_MS = 30000; // 30s polling
const MAX_ACTIVITIES = 4;

export function ActivityLiveFeed() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchActivities = async () => {
      try {
        const res = await fetch(`${API_URL}/balapor/peta?limit=20`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('fetch failed');

        const response = await res.json();
        const reports: MapReport[] = (response.data ?? response.reports ?? response) as MapReport[];

        if (!active) return;

        const transformed = transformReportsToActivities(reports);
        setActivities(transformed);
        setIsLoading(false);
        setError(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('[ActivityFeed] fetch error:', err);
          if (active) {
            setError(true);
            setIsLoading(false);
          }
        }
      }
    };

    void fetchActivities();
    const interval = setInterval(() => void fetchActivities(), REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: 20,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '0.3px',
          }}
        >
          Aktivitas Platform
        </p>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.5px',
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
      </div>

      {/* Content */}
      {isLoading && <ActivityLoadingSkeleton />}
      {!isLoading && error && <ActivityErrorState />}
      {!isLoading && !error && activities.length === 0 && <ActivityEmptyState />}
      {!isLoading && !error && activities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activities.slice(0, MAX_ACTIVITIES).map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {/* Footer link */}
      {!isLoading && !error && activities.length > 0 && (
        <a
          href="/reports#live-map"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#95d3ba')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
        >
          <span>Lihat semua aktivitas</span>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 14 }}
          >
            arrow_forward
          </span>
        </a>
      )}

      <style>{`
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

// ─── Activity Row ──────────────────────────────────────────────

function ActivityRow({ activity }: { activity: ActivityEntry }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 10,
          background: activity.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            color: activity.iconColor,
            fontSize: 16,
            fontVariationSettings: "'FILL' 1, 'wght' 600",
          }}
        >
          {activity.iconName}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.4,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activity.title}
        </p>
        <p
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.3,
          }}
        >
          {activity.subtitle} · {activity.relativeTime}
        </p>
      </div>
    </div>
  );
}

// ─── Empty/Loading/Error States ────────────────────────────────

function ActivityLoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 10,
                width: '85%',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 4,
                marginBottom: 6,
                animation: 'pulse 2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
            <div
              style={{
                height: 8,
                width: '50%',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 4,
                animation: 'pulse 2s ease-in-out infinite',
                animationDelay: `${i * 0.15 + 0.1}s`,
              }}
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function ActivityEmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '20px 12px',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 10px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 20,
          }}
        >
          campaign
        </span>
      </div>
      <p
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
        }}
      >
        Aktivitas akan tampil di sini<br />
        saat warga mulai melaporkan
      </p>
    </div>
  );
}

function ActivityErrorState() {
  return (
    <p
      style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        padding: '12px 0',
      }}
    >
      Tidak dapat memuat aktivitas saat ini
    </p>
  );
}

// ─── Transform reports → activity entries ─────────────────────

function transformReportsToActivities(reports: MapReport[]): ActivityEntry[] {
  if (!Array.isArray(reports) || reports.length === 0) {
    return [];
  }

  // Sort by created_at descending (most recent first)
  const sorted = [...reports].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const activities: ActivityEntry[] = [];

  for (const report of sorted) {
    // Activity 1: Naik ke BAKABAR (priority highest)
    if (report.has_bakabar_article && activities.length < MAX_ACTIVITIES * 2) {
      activities.push({
        id: `${report.id}-bakabar`,
        type: 'bakabar',
        title: `Naik ke BAKABAR`,
        subtitle: report.location_name ?? 'Maluku Utara',
        iconName: 'newspaper',
        iconBg: 'rgba(168, 85, 247, 0.15)',
        iconColor: '#A855F7',
        timestamp: report.created_at,
        relativeTime: getRelativeTime(report.created_at),
      });
    }

    // Activity 2: Verified (kalau status verified)
    if (report.status === 'verified' && activities.length < MAX_ACTIVITIES * 2) {
      activities.push({
        id: `${report.id}-verified`,
        type: 'verified',
        title: `Laporan diverifikasi tim`,
        subtitle: report.location_name ?? 'Maluku Utara',
        iconName: 'verified',
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981',
        timestamp: report.created_at,
        relativeTime: getRelativeTime(report.created_at),
      });
    }

    // Activity 3: New report (default)
    if (activities.length < MAX_ACTIVITIES * 2) {
      activities.push({
        id: `${report.id}-new`,
        type: 'new_report',
        title: `Laporan baru di ${report.location_name ?? 'MalUt'}`,
        subtitle: capitalize(report.category ?? 'umum'),
        iconName: 'campaign',
        iconBg: 'rgba(239, 68, 68, 0.15)',
        iconColor: '#EF4444',
        timestamp: report.created_at,
        relativeTime: getRelativeTime(report.created_at),
      });
    }
  }

  // Take top MAX_ACTIVITIES, dedup similar
  return activities.slice(0, MAX_ACTIVITIES);
}

function getRelativeTime(iso: string): string {
  const now = Date.now();
  const past = new Date(iso).getTime();
  const diffMs = now - past;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return `${Math.floor(diffDay / 7)} minggu lalu`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
