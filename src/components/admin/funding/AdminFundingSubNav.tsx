'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// Single source of truth for admin funding SubNav.
// Self-fetches all badge counts on mount.
// Use `refreshKey` prop to force re-fetch when parent state changes.
// ═══════════════════════════════════════════════════════════════

interface Badges {
  pendingCampaigns: number;
  pendingDonations: number;
  pendingFees: number;
  pendingReports: number;
  activeFraudFlags: number;
  pendingCreators: number;     // ⭐ FIX-E-4-C: Creator KYC pending count
  pendingEscalations: number;  // ⭐ FIX-G-C: Auto-escalated donations
  pendingDisbursements: number; // Pencairan pending admin review
  pendingFeeRemittances: number; // Setor fee owner-submitted, menunggu admin verify
}

export default function AdminFundingSubNav({
  refreshKey = 0,
}: {
  /** Increment this value to force re-fetch badges (e.g., after an action). */
  refreshKey?: number;
}) {
  const { t } = useContext(AdminThemeContext);
  const pathname = usePathname();

  const [badges, setBadges] = useState<Badges>({
    pendingCampaigns: 0,
    pendingDonations: 0,
    pendingFees: 0,
    pendingReports: 0,
    activeFraudFlags: 0,
    pendingCreators: 0,    // ⭐ FIX-E-4-C
    pendingEscalations: 0, // ⭐ FIX-G-C
    pendingDisbursements: 0,
    pendingFeeRemittances: 0,
  });

  useEffect(() => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    const headers = { Authorization: `Bearer ${tk}` };

    // Fetch all 7 badge counts in parallel
    Promise.all([
      fetch(`${API_URL}/funding/admin/campaigns?status=pending_review&limit=1`, { headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/donations?status=pending&limit=1`, { headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/fees/summary`, { headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/usage-reports/stats`, { headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/fraud/admin/stats`, { headers })
        .then(r => r.json()).catch(() => null),
      // ⭐ FIX-E-4-C: Creator KYC stats
      fetch(`${API_URL}/admin/creators/stats`, { headers })
        .then(r => r.json()).catch(() => null),
      // ⭐ FIX-G-C: Escalations count (unresolved)
      fetch(`${API_URL}/funding/admin/disbursements?status=pending&limit=1`, { headers })
        .then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/funding/admin/escalations?status=unresolved&limit=1`, { headers })
        .then(r => r.json()).catch(() => null),
      // ⭐ Phase 4: Setor Fee owner-submitted (pending admin verify)
      fetch(`${API_URL}/funding/admin/fee-remittances?status=pending&limit=1`, { headers })
        .then(r => r.json()).catch(() => null),
    ]).then(([campRes, donRes, feeRes, reportRes, fraudRes, creatorRes, disbRes, escRes, feeRemRes]) => {
      setBadges({
        pendingCampaigns: campRes?.meta?.total ?? 0,
        pendingDonations: donRes?.meta?.total ?? 0,
        pendingFees: feeRes?.data?.pending_count ?? 0,
        pendingReports: reportRes?.data?.pending ?? 0,
        activeFraudFlags: fraudRes?.data?.active ?? 0,
        pendingCreators: creatorRes?.data?.pending ?? 0,    // ⭐
        pendingDisbursements: disbRes?.meta?.total ?? 0,
        pendingEscalations: escRes?.meta?.total ?? 0,        // ⭐ FIX-G-C
        pendingFeeRemittances: feeRemRes?.meta?.total ?? 0,  // ⭐ Phase 4
      });
    });
  }, [refreshKey]);

  const tabs: {
    href: string;
    label: string;
    badge?: number;
    accent?: 'red';
  }[] = [
    // ── Setup ──────────────────────────────────────────────────
    { href: '/admin/funding',               label: 'Dashboard' },
    { href: '/admin/funding/campaigns',     label: 'Kampanye',       badge: badges.pendingCampaigns },
    // ── Transaction Flow ───────────────────────────────────────
    { href: '/admin/funding/donations',     label: 'Donasi',         badge: badges.pendingDonations },
    { href: '/admin/funding/reports',       label: 'Laporan',        badge: badges.pendingReports },
    { href: '/admin/funding/disbursements', label: 'Pencairan',      badge: badges.pendingDisbursements },
    // ── Monitoring ─────────────────────────────────────────────
    { href: '/admin/funding/cashflow',      label: 'Aliran Uang' },
    { href: '/admin/funding/fees',          label: 'Fee Settlement', badge: badges.pendingFees },
    { href: '/admin/funding/fee-remittance', label: 'Setor Fee',     badge: badges.pendingFeeRemittances },
    // ── Risk Layer ─────────────────────────────────────────────
    { href: '/admin/funding/fraud',         label: 'Fraud',          badge: badges.activeFraudFlags,   accent: 'red' },
    { href: '/admin/funding/escalations',   label: 'Escalations',    badge: badges.pendingEscalations, accent: 'red' },
    // ── Config ─────────────────────────────────────────────────
    { href: '/admin/funding/penggalang',    label: 'Penggalang',     badge: badges.pendingCreators },
    { href: '/admin/funding/settings',      label: 'Pengaturan' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      marginBottom: 24,
      borderBottom: `1px solid ${t.sidebarBorder}`,
      overflowX: 'auto',
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
          || (tab.href !== '/admin/funding' && pathname.startsWith(tab.href));
        const accentColor = tab.accent === 'red' ? '#EF4444' : '#EC4899';
        const badgeBg = tab.accent === 'red' ? '#EF4444' : '#EF4444';

        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: active ? accentColor : t.textDim,
              borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
              marginBottom: -1,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 150ms',
            }}
          >
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span style={{
                background: badgeBg,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                minWidth: 20,
                textAlign: 'center',
              }}>
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
