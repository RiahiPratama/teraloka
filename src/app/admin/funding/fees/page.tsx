'use client';

/**
 * /admin/funding/fees — Fee Settlement (standalone, legacy entry).
 * Konten di-ekstrak ke <FeeSettlementPanel/>. Halaman ini = shell
 * (auth + breadcrumb + nav). Juga di-embed di /fee-remittance (sub-tab).
 */

import Link from 'next/link';
import { useState, useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';
import FeeSettlementPanel from '@/components/admin/funding/FeeSettlementPanel';

export default function AdminFeesPage() {
  const { t } = useContext(AdminThemeContext);
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  return (
    <AdminAuthGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 8 }}>
          <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
          <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
          <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Fee Settlement</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
          🧾 Fee Settlement
        </h1>
        <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
          Pantau setoran fee operasional dari partner ke TeraLoka — transparansi revenue platform.
        </p>

        <CommandCenterTabs active="feeremit" refreshKey={subNavRefresh} />

        <FeeSettlementPanel onSubNavRefresh={() => setSubNavRefresh(r => r + 1)} />
      </div>
    </AdminAuthGuard>
  );
}
