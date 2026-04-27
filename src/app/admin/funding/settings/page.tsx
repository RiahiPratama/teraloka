'use client';

import { useEffect, useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════
const Icons = {
  Save:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Loader:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Check:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  AlertTriangle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Scale:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>,
  Calendar: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  User:    () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Sliders: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  History: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Power:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
type AppConfig = {
  key: string; value: number; unit: string; category: string;
  description: string | null; updated_by: string | null; updated_at: string;
};

type AppSetting = {
  key: string; value: any; description: string | null;
  updated_by: string | null; updated_at: string;
};

type ConfigHistoryEntry = {
  id: string; source_table: 'app_config' | 'app_settings';
  config_key: string; old_value: string | null; new_value: string;
  changed_by: string | null; changed_at: string; reason: string | null;
};

type SubTab = 'operasional' | 'zakat' | 'sistem' | 'audit';

// ═══════════════════════════════════════════════════════════════
// FILTER WHITELIST: BADONASI-relevant settings only (skip viral_*)
// ═══════════════════════════════════════════════════════════════
const BADONASI_SETTINGS_WHITELIST = [
  'donations_enabled', 'maintenance_mode', 'fonnte_balance_threshold',
  'settlement_cycle_day', 'max_upload_size_mb',
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function parseRp(s: string): number {
  return Number(String(s).replace(/\D/g, '')) || 0;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getDisplayName(key: string): string {
  const map: Record<string, string> = {
    zakat_harga_beras_per_kg: 'Harga Beras',
    zakat_harga_emas_per_gram: 'Harga Emas',
    opr_fee_tier_1_max:      'Tier 1: Batas Atas',
    opr_fee_tier_1_percent:  'Tier 1: Persentase',
    opr_fee_tier_1_cap:      'Tier 1: Cap Maksimum',
    opr_fee_tier_2_max:      'Tier 2: Batas Atas',
    opr_fee_tier_2_percent:  'Tier 2: Persentase',
    opr_fee_tier_3_max:      'Tier 3: Batas Atas',
    opr_fee_tier_3_percent:  'Tier 3: Persentase',
    opr_fee_tier_4_percent:  'Tier 4: Persentase (≥ Rp 10jt)',
    opr_min_donation:        'Minimum Donasi',
    opr_tier_trial_limit:    'Trial Tier: Limit Penggalangan',
    opr_tier_standard_limit: 'Standard Tier: Limit Penggalangan',
    donations_enabled:        'Donasi Aktif',
    maintenance_mode:         'Maintenance Mode',
    fonnte_balance_threshold: 'Threshold Saldo Fonnte',
    settlement_cycle_day:     'Cycle Settlement Mingguan',
    max_upload_size_mb:       'Max Upload Foto (MB)',
  };
  return map[key] ?? key;
}

function validateValue(key: string, value: number): string | null {
  if (Number.isNaN(value) || value < 0) return 'Nilai harus angka positif';

  if (key.includes('_percent') && value > 10) return 'Persentase maksimal 10%';

  if (key === 'opr_min_donation') {
    if (value < 5000) return 'Minimum donasi tidak boleh < Rp 5.000';
    if (value > 100000) return 'Minimum donasi tidak boleh > Rp 100.000';
  }
  if (key.includes('_limit') && value < 10000000) return 'Limit tier minimal Rp 10jt';
  if (key === 'opr_fee_tier_1_cap' && value < 500) return 'Cap minimal Rp 500';
  if (key === 'max_upload_size_mb' && (value < 1 || value > 50)) return 'Range 1-50 MB';
  if (key === 'fonnte_balance_threshold') {
    if (value < 10000) return 'Minimum Rp 10.000';
    if (value > 1000000) return 'Maximum Rp 1.000.000';
  }
  if (key.includes('_max') && !key.includes('_size') && value < 50000) {
    return 'Batas atas tier minimal Rp 50.000';
  }

  return null;
}

function getRiskLevel(key: string): 'low' | 'medium' | 'high' | 'critical' {
  if (key === 'maintenance_mode') return 'critical';
  if (key === 'donations_enabled') return 'high';
  if (key.includes('_percent') || key.includes('_max') || key.includes('_cap')) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminFundingSettings() {
  const { t } = useContext(AdminThemeContext);
  const { user, token, isLoading: authLoading } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('operasional');
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [settingEdits, setSettingEdits] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    key: string; label: string; oldValue: any; newValue: any;
    risk: 'low' | 'medium' | 'high' | 'critical';
    onConfirm: () => void;
  } | null>(null);
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  useEffect(() => {
    if (token) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadConfigs(), loadSettings(), loadHistory()]);
    setLoading(false);
  }

  async function loadConfigs() {
    try {
      const res = await fetch(`${API}/config`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConfigs(json.data);
        const initialEdits: Record<string, string> = {};
        json.data.forEach((c: AppConfig) => {
          initialEdits[c.key] = String(Math.round(Number(c.value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        });
        setEdits(initialEdits);
      }
    } catch (err) { console.error('Load configs failed:', err); }
  }

  async function loadSettings() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/config/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const filtered = json.data.filter((s: AppSetting) =>
          BADONASI_SETTINGS_WHITELIST.includes(s.key)
        );
        setSettings(filtered);
        const initialEdits: Record<string, any> = {};
        filtered.forEach((s: AppSetting) => { initialEdits[s.key] = s.value; });
        setSettingEdits(initialEdits);
      }
    } catch (err) { console.error('Load settings failed:', err); }
  }

  async function loadHistory() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/config/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setHistory(json.data);
    } catch (err) { console.error('Load history failed:', err); }
  }

  async function saveConfig(key: string, newValue: number) {
    setSaving(key);
    setMessage(null);
    try {
      const res = await fetch(`${API}/config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: newValue }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `${getDisplayName(key)} berhasil diupdate.` });
        await loadConfigs();
        await loadHistory();
        setSubNavRefresh(p => p + 1);
      } else {
        setMessage({ type: 'error', text: json.error?.message || 'Update gagal.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update gagal.' });
    } finally {
      setSaving(null);
      setConfirmModal(null);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  async function saveSetting(key: string, newValue: any) {
    setSaving(key);
    setMessage(null);
    try {
      const res = await fetch(`${API}/config/settings/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: newValue }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `${getDisplayName(key)} berhasil diupdate.` });
        await loadSettings();
        await loadHistory();
        setSubNavRefresh(p => p + 1);
      } else {
        setMessage({ type: 'error', text: json.error?.message || 'Update gagal.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update gagal.' });
    } finally {
      setSaving(null);
      setConfirmModal(null);
      setTimeout(() => setMessage(null), 5000);
    }
  }

  function requestSaveConfig(key: string, displayName: string, oldValue: number, newValue: number) {
    const validationError = validateValue(key, newValue);
    if (validationError) {
      setMessage({ type: 'error', text: `${displayName}: ${validationError}` });
      setTimeout(() => setMessage(null), 5000);
      return;
    }
    if (oldValue === newValue) {
      setMessage({ type: 'error', text: 'Nilai tidak berubah.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setConfirmModal({
      key, label: displayName, oldValue, newValue,
      risk: getRiskLevel(key),
      onConfirm: () => saveConfig(key, newValue),
    });
  }

  function requestSaveSetting(key: string, displayName: string, oldValue: any, newValue: any) {
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      setMessage({ type: 'error', text: 'Nilai tidak berubah.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setConfirmModal({
      key, label: displayName, oldValue, newValue,
      risk: getRiskLevel(key),
      onConfirm: () => saveSetting(key, newValue),
    });
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textDim }}>
        <Icons.Loader />
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin_funding')) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ maxWidth: 360, background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 12px', width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Alert />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>Akses Ditolak</p>
          <p style={{ fontSize: 12, color: t.textDim, marginBottom: 16 }}>
            Hanya super admin atau admin funding yang bisa akses halaman ini.
          </p>
          <Link href="/admin/funding" style={{ fontSize: 12, fontWeight: 700, color: '#EC4899', textDecoration: 'none' }}>
            ← Kembali
          </Link>
        </div>
      </div>
    );
  }

  const operasionalConfigs = configs.filter(c => c.key.startsWith('opr_'));
  const zakatConfigs = configs.filter(c => c.key.startsWith('zakat_'));

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Pengaturan</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        Pengaturan BADONASI
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Konfigurasi sistem untuk operasional BADONASI. Perubahan langsung berlaku ke production.
      </p>

      <AdminFundingSubNav refreshKey={subNavRefresh} />

      {message && (
        <div style={{
          marginBottom: 20,
          background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: message.type === 'success' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: message.type === 'success' ? '#10B981' : '#EF4444', flexShrink: 0 }}>
            {message.type === 'success' ? <Icons.Check /> : <Icons.Alert />}
          </span>
          <p style={{ fontSize: 13, fontWeight: 600, color: message.type === 'success' ? '#10B981' : '#EF4444' }}>
            {message.text}
          </p>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 12, padding: 4, overflowX: 'auto',
      }}>
        <SubTabButton active={activeSubTab === 'operasional'} icon={<Icons.Sliders />} label="Operasional"
          onClick={() => setActiveSubTab('operasional')} t={t} />
        <SubTabButton active={activeSubTab === 'zakat'} icon={<Icons.Scale />} label="Zakat"
          onClick={() => setActiveSubTab('zakat')} t={t} />
        <SubTabButton active={activeSubTab === 'sistem'} icon={<Icons.Settings />} label="Sistem"
          onClick={() => setActiveSubTab('sistem')} t={t} />
        <SubTabButton active={activeSubTab === 'audit'} icon={<Icons.History />} label="Audit Log"
          onClick={() => setActiveSubTab('audit')} t={t} count={history.length} />
      </div>

      {loading ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', color: t.textDim, marginBottom: 8 }}>
            <Icons.Loader />
          </div>
          <p style={{ fontSize: 12, color: t.textDim }}>Memuat konfigurasi...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'operasional' && (
            <OperasionalTab configs={operasionalConfigs} edits={edits} setEdits={setEdits}
              saving={saving} onSave={requestSaveConfig} t={t} />
          )}
          {activeSubTab === 'zakat' && (
            <ZakatTab configs={zakatConfigs} edits={edits} setEdits={setEdits}
              saving={saving} onSave={requestSaveConfig} t={t} />
          )}
          {activeSubTab === 'sistem' && (
            <SistemTab settings={settings} edits={settingEdits} setEdits={setSettingEdits}
              saving={saving} onSave={requestSaveSetting} t={t} />
          )}
          {activeSubTab === 'audit' && (
            <AuditLogTab history={history} t={t} />
          )}
        </>
      )}

      {confirmModal && (
        <ConfirmationModal modal={confirmModal} onClose={() => setConfirmModal(null)} t={t} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-TAB BUTTON
// ═══════════════════════════════════════════════════════════════
function SubTabButton({ active, icon, label, onClick, t, count }: {
  active: boolean; icon: React.ReactNode; label: string;
  onClick: () => void; t: any; count?: number;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderRadius: 8,
      fontSize: 13, fontWeight: 700,
      color: active ? '#fff' : t.textPrimary,
      background: active ? '#EC4899' : 'transparent',
      border: 'none', cursor: 'pointer',
      whiteSpace: 'nowrap', transition: 'all 150ms',
    }}>
      <span style={{ color: active ? '#fff' : t.textMuted }}>{icon}</span>
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : t.navHover,
          color: active ? '#fff' : t.textDim,
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// OPERASIONAL TAB
// ═══════════════════════════════════════════════════════════════
function OperasionalTab({ configs, edits, setEdits, saving, onSave, t }: any) {
  const groupedConfigs = useMemo(() => ({
    fee: configs.filter((c: AppConfig) => c.category === 'donation_fee'),
    rule: configs.filter((c: AppConfig) => c.category === 'donation_rule'),
    limit: configs.filter((c: AppConfig) => c.category === 'tier_limit'),
  }), [configs]);

  if (configs.length === 0) {
    return <EmptyState message="Belum ada konfigurasi operasional. Run SHIP-1 SQL migration." t={t} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <SectionCard icon={<Icons.Sliders />} title="Tarif Fee TeraLoka"
        description="Persentase fee TeraLoka per donasi (bertingkat per nominal)." t={t}>
        {groupedConfigs.fee.map((c: AppConfig) => (
          <ConfigRow key={c.key} config={c} edits={edits} setEdits={setEdits}
            saving={saving} onSave={onSave} t={t} />
        ))}
      </SectionCard>

      <SectionCard icon={<Icons.AlertTriangle />} title="Aturan Donasi"
        description="Aturan validasi donasi (min nominal, dll)." t={t}>
        {groupedConfigs.rule.map((c: AppConfig) => (
          <ConfigRow key={c.key} config={c} edits={edits} setEdits={setEdits}
            saving={saving} onSave={onSave} t={t} />
        ))}
      </SectionCard>

      <SectionCard icon={<Icons.User />} title="Limit Tier Penggalang"
        description="Maximum nilai penggalangan per tier partner." t={t}>
        {groupedConfigs.limit.map((c: AppConfig) => (
          <ConfigRow key={c.key} config={c} edits={edits} setEdits={setEdits}
            saving={saving} onSave={onSave} t={t} />
        ))}
        <div style={{ padding: 12, background: 'rgba(16,185,129,0.06)', borderRadius: 8, borderLeft: '3px solid #10B981', marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginBottom: 2 }}>
            ⭐ Trusted Tier: Tidak Ada Limit
          </p>
          <p style={{ fontSize: 11, color: t.textDim }}>
            Partner dengan reputasi terpercaya bisa menggalang dana tanpa batasan nominal.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ZAKAT TAB
// ═══════════════════════════════════════════════════════════════
function ZakatTab({ configs, edits, setEdits, saving, onSave, t }: any) {
  if (configs.length === 0) {
    return <EmptyState message="Belum ada konfigurasi zakat." t={t} />;
  }
  return (
    <div style={{ maxWidth: 720 }}>
      <SectionCard icon={<Icons.Scale />} title="Harga Acuan Zakat"
        description="Nilai ini dipakai di kalkulator zakat publik. Update saat harga pasar berubah signifikan." t={t}>
        {configs.map((c: AppConfig) => (
          <ConfigRow key={c.key} config={c} edits={edits} setEdits={setEdits}
            saving={saving} onSave={onSave} t={t} />
        ))}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SISTEM TAB
// ═══════════════════════════════════════════════════════════════
function SistemTab({ settings, edits, setEdits, saving, onSave, t }: any) {
  if (settings.length === 0) {
    return <EmptyState message="Belum ada pengaturan sistem." t={t} />;
  }

  const badonasiSettings = settings.filter((s: AppSetting) => s.key !== 'maintenance_mode');
  const globalSettings = settings.filter((s: AppSetting) => s.key === 'maintenance_mode');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <SectionCard icon={<Icons.Power />} title="Operasional BADONASI"
        description="Pengaturan khusus untuk BADONASI saja." t={t}>
        {badonasiSettings.map((s: AppSetting) => (
          <SettingRow key={s.key} setting={s} edits={edits} setEdits={setEdits}
            saving={saving} onSave={onSave} t={t} />
        ))}
      </SectionCard>

      {globalSettings.length > 0 && (
        <SectionCard icon={<Icons.AlertTriangle />} title="⚠️ Global System"
          description="Pengaturan ini AFFECT SEMUA SERVICE (BAKABAR, BAKOS, dll), bukan cuma BADONASI. Hati-hati saat mengubah."
          t={t} warning>
          {globalSettings.map((s: AppSetting) => (
            <SettingRow key={s.key} setting={s} edits={edits} setEdits={setEdits}
              saving={saving} onSave={onSave} t={t} />
          ))}
        </SectionCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG TAB
// ═══════════════════════════════════════════════════════════════
function AuditLogTab({ history, t }: { history: ConfigHistoryEntry[]; t: any }) {
  if (history.length === 0) {
    return <EmptyState message="Belum ada riwayat perubahan." t={t} />;
  }

  return (
    <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#EC4899' }}><Icons.History /></span>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Riwayat Perubahan ({history.length})
          </h2>
        </div>
        <p style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
          50 perubahan terakhir di config dan settings.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: t.navHover + '55', borderBottom: `1px solid ${t.sidebarBorder}` }}>
              <th style={thStyle(t, 'left', 130)}>Waktu</th>
              <th style={thStyle(t, 'left', 100)}>Sumber</th>
              <th style={thStyle(t, 'left')}>Key</th>
              <th style={thStyle(t, 'right', 120)}>Old</th>
              <th style={thStyle(t, 'right', 120)}>New</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, idx) => {
              const isLast = idx === history.length - 1;
              return (
                <tr key={h.id} style={{ borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}` }}>
                  <td style={tdStyle(t)}>
                    <div style={{ fontSize: 11, color: t.textPrimary }}>{formatDate(h.changed_at)}</div>
                  </td>
                  <td style={tdStyle(t)}>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 4,
                      background: h.source_table === 'app_config' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                      color: h.source_table === 'app_config' ? '#3B82F6' : '#F59E0B',
                    }}>
                      {h.source_table === 'app_config' ? 'CONFIG' : 'SETTING'}
                    </span>
                  </td>
                  <td style={tdStyle(t)}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary }}>
                      {getDisplayName(h.config_key)}
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace' }}>
                      {h.config_key}
                    </div>
                  </td>
                  <td style={{ ...tdStyle(t), textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: t.textDim, fontFamily: 'monospace' }}>
                      {h.old_value ?? '—'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle(t), textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, fontFamily: 'monospace' }}>
                      {h.new_value}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION CARD
// ═══════════════════════════════════════════════════════════════
function SectionCard({ icon, title, description, t, warning, children }: {
  icon: React.ReactNode; title: string; description: string;
  t: any; warning?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: warning ? 'rgba(239,68,68,0.04)' : t.mainBg,
      border: `1px solid ${warning ? 'rgba(239,68,68,0.3)' : t.sidebarBorder}`,
      borderRadius: 16, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: warning ? '#EF4444' : '#EC4899' }}>{icon}</span>
        <h2 style={{
          fontSize: 13, fontWeight: 700, color: t.textPrimary,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {title}
        </h2>
      </div>
      <p style={{ fontSize: 12, color: t.textDim, marginBottom: 20, lineHeight: 1.5 }}>
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIG ROW (numeric value)
// ═══════════════════════════════════════════════════════════════
function ConfigRow({ config, edits, setEdits, saving, onSave, t }: any) {
  const c: AppConfig = config;
  const currentValue = parseRp(edits[c.key] || '0');
  const hasChanged = currentValue !== Number(c.value);
  const isSaving = saving === c.key;
  const displayName = getDisplayName(c.key);
  const isPercent = c.unit === 'percent';

  return (
    <div style={{
      padding: 14, background: t.navHover + '40', borderRadius: 10,
      border: `1px solid ${hasChanged ? '#EC4899' : 'transparent'}`,
      transition: 'border-color 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{displayName}</p>
        <p style={{ fontSize: 10, color: t.textDim, fontFamily: 'monospace' }}>{c.key}</p>
      </div>
      {c.description && (
        <p style={{ fontSize: 11, color: t.textDim, marginBottom: 10 }}>{c.description}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {!isPercent && (
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 12, fontWeight: 600, color: t.textDim,
            }}>Rp</span>
          )}
          <input
            type="text"
            value={edits[c.key]}
            onChange={(e) => {
              const raw = e.target.value;
              const cleaned = isPercent
                ? raw.replace(/[^0-9.]/g, '')
                : parseRp(raw).toLocaleString('id-ID');
              setEdits({ ...edits, [c.key]: cleaned });
            }}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: isPercent ? '10px 36px 10px 12px' : '10px 12px 10px 36px',
              fontSize: 13, fontWeight: 700,
              background: t.mainBg, color: t.textPrimary,
              border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 8, outline: 'none',
            }}
          />
          {isPercent && (
            <span style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 12, fontWeight: 600, color: t.textDim,
            }}>%</span>
          )}
        </div>
        <button
          onClick={() => onSave(c.key, displayName, Number(c.value), currentValue)}
          disabled={!hasChanged || isSaving}
          style={{
            padding: '10px 16px', borderRadius: 8,
            background: hasChanged ? '#EC4899' : t.navHover,
            color: hasChanged ? '#fff' : t.textMuted,
            border: 'none', fontSize: 12, fontWeight: 700,
            cursor: hasChanged && !isSaving ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          {isSaving ? <Icons.Loader /> : <Icons.Save />}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 10, color: t.textMuted }}>
        <Icons.Calendar />
        <span>{formatDate(c.updated_at)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTING ROW (JSONB value)
// ═══════════════════════════════════════════════════════════════
function SettingRow({ setting, edits, setEdits, saving, onSave, t }: any) {
  const s: AppSetting = setting;
  const currentValue = edits[s.key];
  const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(s.value);
  const isSaving = saving === s.key;
  const displayName = getDisplayName(s.key);
  const valueType = typeof s.value;

  return (
    <div style={{
      padding: 14, background: t.navHover + '40', borderRadius: 10,
      border: `1px solid ${hasChanged ? '#EC4899' : 'transparent'}`,
      transition: 'border-color 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>{displayName}</p>
        <p style={{ fontSize: 10, color: t.textDim, fontFamily: 'monospace' }}>{s.key}</p>
      </div>
      {s.description && (
        <p style={{ fontSize: 11, color: t.textDim, marginBottom: 10 }}>{s.description}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          {valueType === 'boolean' ? (
            <ToggleSwitch
              value={Boolean(currentValue)}
              onChange={(v) => setEdits({ ...edits, [s.key]: v })}
              disabled={isSaving}
            />
          ) : valueType === 'number' ? (
            <input
              type="number"
              value={Number(currentValue)}
              onChange={(e) => setEdits({ ...edits, [s.key]: Number(e.target.value) })}
              disabled={isSaving}
              style={{
                width: '100%', padding: '10px 12px',
                fontSize: 13, fontWeight: 700,
                background: t.mainBg, color: t.textPrimary,
                border: `1px solid ${t.sidebarBorder}`, borderRadius: 8, outline: 'none',
              }}
            />
          ) : s.key === 'settlement_cycle_day' ? (
            <select
              value={String(currentValue)}
              onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })}
              disabled={isSaving}
              style={{
                width: '100%', padding: '10px 12px',
                fontSize: 13, fontWeight: 700,
                background: t.mainBg, color: t.textPrimary,
                border: `1px solid ${t.sidebarBorder}`, borderRadius: 8, outline: 'none',
              }}
            >
              <option value="monday">Senin</option>
              <option value="tuesday">Selasa</option>
              <option value="wednesday">Rabu</option>
              <option value="thursday">Kamis</option>
              <option value="friday">Jumat</option>
              <option value="saturday">Sabtu</option>
              <option value="sunday">Minggu</option>
            </select>
          ) : (
            <input
              type="text"
              value={String(currentValue)}
              onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })}
              disabled={isSaving}
              style={{
                width: '100%', padding: '10px 12px',
                fontSize: 13, fontWeight: 700,
                background: t.mainBg, color: t.textPrimary,
                border: `1px solid ${t.sidebarBorder}`, borderRadius: 8, outline: 'none',
              }}
            />
          )}
        </div>
        <button
          onClick={() => onSave(s.key, displayName, s.value, currentValue)}
          disabled={!hasChanged || isSaving}
          style={{
            padding: '10px 16px', borderRadius: 8,
            background: hasChanged ? '#EC4899' : t.navHover,
            color: hasChanged ? '#fff' : t.textMuted,
            border: 'none', fontSize: 12, fontWeight: 700,
            cursor: hasChanged && !isSaving ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          {isSaving ? <Icons.Loader /> : <Icons.Save />}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 10, color: t.textMuted }}>
        <Icons.Calendar />
        <span>{formatDate(s.updated_at)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOGGLE SWITCH
// ═══════════════════════════════════════════════════════════════
function ToggleSwitch({ value, onChange, disabled }: {
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        position: 'relative', width: 56, height: 30,
        borderRadius: 999,
        background: value ? '#10B981' : '#6B7280',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 200ms',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 3, left: value ? 29 : 3,
        width: 24, height: 24, borderRadius: '50%',
        background: '#fff',
        transition: 'left 200ms',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }} />
      <span style={{
        position: 'absolute',
        right: value ? 'auto' : 8,
        left: value ? 8 : 'auto',
        top: '50%', transform: 'translateY(-50%)',
        fontSize: 9, fontWeight: 700, color: '#fff',
      }}>
        {value ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════
function ConfirmationModal({ modal, onClose, t }: any) {
  const riskColors = {
    low:      { bg: 'rgba(59,130,246,0.1)', border: '#3B82F6', text: 'INFO' },
    medium:   { bg: 'rgba(245,158,11,0.1)', border: '#F59E0B', text: 'CAUTION' },
    high:     { bg: 'rgba(239,68,68,0.1)',  border: '#EF4444', text: 'HIGH RISK' },
    critical: { bg: 'rgba(220,38,38,0.15)', border: '#DC2626', text: 'CRITICAL — AFFECT ALL' },
  };
  const risk = riskColors[modal.risk as keyof typeof riskColors];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 16,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.mainBg, borderRadius: 16,
        border: `2px solid ${risk.border}`,
        maxWidth: 480, width: '100%', padding: 24,
      }}>
        <div style={{
          display: 'inline-block',
          padding: '4px 10px', borderRadius: 999,
          background: risk.bg, color: risk.border,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          marginBottom: 12,
        }}>
          ⚠️ {risk.text}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, marginBottom: 8 }}>
          Konfirmasi Perubahan
        </h3>
        <p style={{ fontSize: 13, color: t.textDim, marginBottom: 16 }}>
          Apakah Anda yakin ingin mengubah <strong style={{ color: t.textPrimary }}>{modal.label}</strong>?
        </p>
        <div style={{
          background: t.navHover, borderRadius: 8, padding: 12, marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>SEBELUM</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: t.textDim }}>{String(modal.oldValue)}</p>
          </div>
          <span style={{ fontSize: 18, color: t.textMuted }}>→</span>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 2 }}>SESUDAH</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#EC4899' }}>{String(modal.newValue)}</p>
          </div>
        </div>
        {modal.risk === 'critical' && (
          <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
            ⛔ Pengaturan ini AFFECT SEMUA SERVICE TeraLoka, bukan cuma BADONASI.
            Pastikan Anda memahami impact dari perubahan ini.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 16px', borderRadius: 8,
            background: 'transparent', color: t.textPrimary,
            border: `1px solid ${t.sidebarBorder}`,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Batal
          </button>
          <button onClick={modal.onConfirm} style={{
            padding: '10px 16px', borderRadius: 8,
            background: modal.risk === 'critical' ? '#DC2626' : '#EC4899',
            color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Ya, Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════
function EmptyState({ message, t }: { message: string; t: any }) {
  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 40, textAlign: 'center',
    }}>
      <p style={{ fontSize: 13, color: t.textDim }}>{message}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLE HELPERS
// ═══════════════════════════════════════════════════════════════
function thStyle(t: any, align: 'left' | 'right' | 'center', width?: number): React.CSSProperties {
  return {
    textAlign: align, padding: '10px 12px',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    whiteSpace: 'nowrap', width: width ? `${width}px` : 'auto',
  };
}

function tdStyle(t: any): React.CSSProperties {
  return {
    padding: '12px', color: t.textPrimary, verticalAlign: 'top',
  };
}
