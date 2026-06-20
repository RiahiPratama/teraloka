'use client';

// ════════════════════════════════════════════════════════════════
// CommandCenterTabs — BADONASI Single-Layer Navigation
//
// Reusable across ALL admin/funding pages.
// Replaces AdminFundingSubNav (12 tab dobol) dengan 10 tab single-layer
// mirror BALAPOR Command Center paradigm.
//
// Usage di setiap page:
//   import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
//   <CommandCenterTabs active="donations" />
//
// Active key mapping:
//   'overview'      → /admin/funding (Command Center HQ)
//   'campaigns'     → /admin/funding/campaigns
//   'donations'     → /admin/funding/donations
//   'disbursements' → /admin/funding/disbursements
//   'feeremit'      → /admin/funding/fee-remittance
//   'cashflow'      → /admin/funding/cashflow
//   'reports'       → /admin/funding/reports
//   'fraud'         → /admin/funding/fraud
//   'escalations'   → /admin/funding/escalations
//   'penggalang'    → /admin/funding/penggalang
//   'settings'      → /admin/funding/settings
//
// Self-fetches all badge counts on mount.
// Use `refreshKey` prop to force re-fetch after action.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import {
  LayoutDashboard, Heart, HandCoins, Wallet, Receipt,
  ArrowLeftRight, FileText, ShieldAlert, Bell, UserCheck, Settings,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

export type CommandCenterTabKey =
  | 'overview' | 'campaigns' | 'donations' | 'disbursements'
  | 'feeremit' | 'cashflow' | 'reports' | 'fraud'
  | 'escalations' | 'penggalang' | 'settings';

interface Badges {
  pendingCampaigns: number;
  pendingDonations: number;
  pendingDisbursements: number;
  pendingFeeRemittances: number;
  pendingReports: number;
  activeFraudFlags: number;
  pendingEscalations: number;
  pendingCreators: number;
}

const TABS: {
  key: CommandCenterTabKey;
  label: string;
  href: string;
  Icon: any;
  badgeKey?: keyof Badges;
  accent?: 'red';
}[] = [
  { key: 'overview',     label: 'Overview',     href: '/admin/funding',                Icon: LayoutDashboard },
  { key: 'campaigns',    label: 'Kampanye',     href: '/admin/funding/campaigns',      Icon: Heart,           badgeKey: 'pendingCampaigns' },
  { key: 'donations',    label: 'Donasi',       href: '/admin/funding/donations',      Icon: HandCoins,       badgeKey: 'pendingDonations' },
  { key: 'disbursements',label: 'Pencairan',    href: '/admin/funding/disbursements',  Icon: Wallet,          badgeKey: 'pendingDisbursements' },
  { key: 'reports',      label: 'Laporan',      href: '/admin/funding/reports',        Icon: FileText,        badgeKey: 'pendingReports' },
  { key: 'feeremit',     label: 'Setor Fee',    href: '/admin/funding/fee-remittance', Icon: Receipt,         badgeKey: 'pendingFeeRemittances' },
  { key: 'cashflow',     label: 'Aliran Uang',  href: '/admin/funding/cashflow',       Icon: ArrowLeftRight },
  { key: 'fraud',        label: 'Fraud',        href: '/admin/funding/fraud',          Icon: ShieldAlert,     badgeKey: 'activeFraudFlags',     accent: 'red' },
  { key: 'escalations',  label: 'Escalations',  href: '/admin/funding/escalations',    Icon: Bell,            badgeKey: 'pendingEscalations',  accent: 'red' },
  { key: 'penggalang',   label: 'Penggalang',   href: '/admin/funding/penggalang',     Icon: UserCheck,       badgeKey: 'pendingCreators' },
  { key: 'settings',     label: 'Pengaturan',   href: '/admin/funding/settings',       Icon: Settings },
];

export default function CommandCenterTabs({
  active,
  refreshKey = 0,
}: {
  active: CommandCenterTabKey;
  refreshKey?: number;
}) {
  const { t } = useContext(AdminThemeContext);
  const [badges, setBadges] = useState<Badges>({
    pendingCampaigns: 0,
    pendingDonations: 0,
    pendingDisbursements: 0,
    pendingFeeRemittances: 0,
    pendingReports: 0,
    activeFraudFlags: 0,
    pendingEscalations: 0,
    pendingCreators: 0,
  });

  useEffect(() => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const headers = { Authorization: `Bearer ${tk}` };

    Promise.all([
      fetch(`${API_URL}/funding/admin/campaigns?status=pending_review&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/donations?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/disbursements?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/fee-remittances?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/usage-reports/stats`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/fraud/admin/stats`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/escalations?status=unresolved&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/admin/creators/stats`, { headers }).then(r => r.json()).catch(() => null),
    ]).then(([camp, don, disb, feeRem, rep, fraud, esc, creator]) => {
      setBadges({
        pendingCampaigns:      camp?.meta?.total ?? 0,
        pendingDonations:      don?.meta?.total ?? 0,
        pendingDisbursements:  disb?.meta?.total ?? 0,
        pendingFeeRemittances: feeRem?.meta?.total ?? 0,
        pendingReports:        rep?.data?.pending ?? 0,
        activeFraudFlags:      fraud?.data?.active ?? 0,
        pendingEscalations:    esc?.meta?.total ?? 0,
        pendingCreators:       creator?.data?.pending ?? 0,
      });
    });
  }, [refreshKey]);

  return (
    <div style={{
      display: 'flex', gap: 2, marginBottom: 24,
      borderBottom: `1px solid ${t.sidebarBorder}`,
      overflowX: 'auto', paddingBottom: 0,
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.key;
        const badge = tab.badgeKey ? badges[tab.badgeKey] : 0;
        const accentColor = tab.accent === 'red' ? '#EF4444' : '#EC4899';
        const Icon = tab.Icon;

        return (
          <Link
            key={tab.key}
            href={tab.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? accentColor : t.textDim,
              borderBottom: '2px solid transparent',
              borderBottomColor: isActive ? accentColor : 'transparent',
              marginBottom: -1,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 150ms, border-color 150ms',
              position: 'relative',
            }}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            <span>{tab.label}</span>
            {badge > 0 && (
              <span style={{
                background: '#EF4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 999,
                minWidth: 18,
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
