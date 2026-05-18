'use client';

/**
 * TeraLoka — Admin Ads Page (Tab Container)
 * SESI 3 BATCH 1B (18 Mei 2026) — Z2 Tailwind v4 Migration + Opsi C Cleanup
 * ────────────────────────────────────────────────────────────────────
 * Route: /admin/ads
 *
 * 2 Tabs:
 *   1. Iklan          — AdsCommandCenter (Mission 8 Sub-Phase 8-E)
 *   2. Pricing Tiers  — PricingTiersPanel + StrategicBar (SESI 3)
 *
 * Tab "Paket Iklan" (PackagesPanel) REMOVED (Opsi C — Aggressive Cleanup):
 *   - Filosofi "Jangan Bikin Fungsi Dobel" — Riahi locked 18 Mei 2026
 *   - File PackagesPanel.tsx tetap di disk sampai SESI 4 cleanup
 *   - Backend /packages/* endpoints @deprecated tetap jalan (rollback safety)
 *   - DB ad_packages table preserved (legacy ads.package_id integrity)
 *
 * Migration history:
 *   - AdminThemeContext + inline style → Tailwind v4 utility-first
 *   - Pattern AAP locked 15 Mei 2026
 *   - Konsisten dengan AdPreviewModal + BulkActionModal (Sub-Phase 8-E-6)
 */

import { useState } from 'react';
import { Megaphone, DollarSign, AlertTriangle } from 'lucide-react';
import AdsPanel from '@/components/admin/ads/AdsCommandCenter';
import PricingStrategicBar from '@/components/admin/ads/pricing-tiers/PricingStrategicBar';
import PricingTiersPanel from '@/components/admin/ads/pricing-tiers/PricingTiersPanel';
import { cn } from '@/lib/utils';

type Tab = 'ads' | 'pricing';

interface TabConfig {
  key:   Tab;
  label: string;
  icon:  typeof Megaphone;
}

const TABS: TabConfig[] = [
  { key: 'ads',     label: 'Iklan',         icon: Megaphone  },
  { key: 'pricing', label: 'Pricing Tiers', icon: DollarSign },
];

export default function AdsAdminPage() {
  const [tab, setTab] = useState<Tab>('ads');

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-[20px] font-extrabold text-text">Ads Management</h1>
        <p className="text-[12px] text-text-muted mt-0.5">
          Kelola iklan aktif &amp; pricing tier configuration
        </p>
      </div>

      {/* ── Tab Switcher (Tailwind v4) ── */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px',
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
      {tab === 'ads' && <AdsPanel />}

      {tab === 'pricing' && (
        <div className="flex flex-col gap-4">
          {/* Migration Notice Ribbon */}
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-status-warning/8 border border-status-warning/30">
            <AlertTriangle size={14} className="text-status-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-status-warning leading-snug">
                Legacy <code className="font-mono text-[10px] bg-status-warning/12 px-1 rounded">ad_packages</code> deprecated.
              </p>
              <p className="text-[10px] text-text-muted mt-0.5 leading-snug">
                Pricing Tiers v1.1 sekarang source of truth. Legacy endpoints tetap functional sampai SESI 4 cleanup.
              </p>
            </div>
          </div>

          {/* Strategic Bar (CAS Mode color-coded) */}
          <PricingStrategicBar />

          {/* Pricing Tiers Panel (list dengan Tab Active/Legacy + Quick Actions) */}
          <PricingTiersPanel />
        </div>
      )}
    </div>
  );
}
