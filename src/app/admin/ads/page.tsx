'use client';

import { useState } from 'react';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import AdsPanel from '@/components/admin/ads/AdsPanel';
import PackagesPanel from '@/components/admin/ads/PackagesPanel';

type Tab = 'ads' | 'packages';

export default function AdsAdminPage() {
  const { t } = useAdminTheme();
  const [tab, setTab] = useState<Tab>('ads');

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: t.textPrimary }}>
      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Ads Management</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>Kelola iklan aktif & konfigurasi paket iklan</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.cardBorder}` }}>
        {[
          { key: 'ads'      as Tab, label: '📢 Iklan' },
          { key: 'packages' as Tab, label: '📦 Paket Iklan' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === key ? '#1B6B4A' : 'transparent'}`,
              color: tab === key ? t.codeText : t.textMuted,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {tab === 'ads'      && <AdsPanel />}
      {tab === 'packages' && <PackagesPanel />}
    </div>
  );
}
