'use client';

/**
 * TeraLoka — Admin Ads Page (Tab Container)
 * SESI 5A BATCH 3 (18 Mei 2026) — Tab Advertiser Integration
 * ────────────────────────────────────────────────────────────────────
 * Route: /admin/ads
 *
 * 3 Tabs:
 *   1. Iklan         — AdsCommandCenter (Mission 8 Sub-Phase 8-E)
 *   2. Pricing Tiers — PricingTiersPanel + StrategicBar (SESI 3)
 *   3. Advertiser    — AdvertiserPanel (SESI 5A) — NEW
 *
 * Future tab (SESI 5D scope):
 *   4. Financial ADS — Revenue analytics ADS-domain
 *
 * Migration history:
 *   - SESI 3 (18 Mei 2026): Z2 Tailwind v4 migration + Opsi C Cleanup
 *     · AdminThemeContext + inline style → Tailwind v4 utility-first
 *     · Tab "Paket Iklan" (PackagesPanel) REMOVED
 *   - SESI 4 (18 Mei 2026): Legacy ad_packages DROPPED entirely
 *     · DB table dropped + ads.package_id column dropped + FK dropped
 *     · /packages/* endpoints removed
 *     · PackagesPanel.tsx file deleted
 *   - SESI 5A (18 Mei 2026): Tab Advertiser added
 *     · advertiser_accounts entity wired
 *     · 11 admin endpoints + 5 frontend components
 *     · Politik compliance built-in (Pasal 270 UU Pemilu)
 *
 * Pattern AAP locked 15 Mei 2026 — konsisten dengan AdPreviewModal
 * + BulkActionModal + PricingTier* components.
 */

import { useState } from 'react';
import { Megaphone, DollarSign, Users, Layout } from 'lucide-react';
import AdsPanel from '@/components/admin/ads/AdsCommandCenter';
import PricingStrategicBar from '@/components/admin/ads/pricing-tiers/PricingStrategicBar';
import PricingTiersPanel from '@/components/admin/ads/pricing-tiers/PricingTiersPanel';
import AdvertiserPanel from '@/components/admin/ads/advertisers/AdvertiserPanel';
// SESI 5D-2 (19 Mei 2026): Tab Layout Iklan documentation hub
import AdsLayoutDocumentation from '@/components/admin/ads/AdsLayoutDocumentation';
import { cn } from '@/lib/utils';

type Tab = 'ads' | 'pricing' | 'advertisers' | 'layout';

interface TabConfig {
  key:   Tab;
  label: string;
  icon:  typeof Megaphone;
}

const TABS: TabConfig[] = [
  { key: 'ads',         label: 'Iklan',         icon: Megaphone  },
  { key: 'pricing',     label: 'Pricing Tiers', icon: DollarSign },
  { key: 'advertisers', label: 'Advertiser',    icon: Users      },
  { key: 'layout',      label: 'Layout Iklan',  icon: Layout     }, // SESI 5D-2
];

export default function AdsAdminPage() {
  const [tab, setTab] = useState<Tab>('ads');
  // SESI 5D-2 Phase C: bridge filter posisi dari Tab Layout → Tab IKLAN
  const [jumpFilterPosition, setJumpFilterPosition] = useState<string | null>(null);

  // Handler buat AdsLayoutDocumentation: switch tab + propagate filter
  const handleJumpToAds = (positionKey: string) => {
    setJumpFilterPosition(positionKey);
    setTab('ads');
  };

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-[20px] font-extrabold text-text">Ads Management</h1>
        <p className="text-[12px] text-text-muted mt-0.5">
          Kelola iklan, pricing tier, &amp; advertiser TeraLoka
        </p>
      </div>

      {/* ── Tab Switcher (Tailwind v4) ── */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px whitespace-nowrap',
              tab === key
                ? 'border-ads text-ads'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {tab === 'ads' && (
        <AdsPanel
          initialFilterPosition={jumpFilterPosition}
          onFilterPositionConsumed={() => setJumpFilterPosition(null)}
        />
      )}

      {tab === 'pricing' && (
        <div className="flex flex-col gap-4">
          {/* Strategic Bar (CAS Mode color-coded) */}
          <PricingStrategicBar />

          {/* Pricing Tiers Panel (list dengan Tab Active/Legacy + Quick Actions) */}
          <PricingTiersPanel />
        </div>
      )}

      {tab === 'advertisers' && <AdvertiserPanel />}

      {/* SESI 5D-2 (19 Mei 2026): Layout Iklan documentation hub */}
      {tab === 'layout' && (
        <AdsLayoutDocumentation onJumpToAds={handleJumpToAds} />
      )}
    </div>
  );
}
