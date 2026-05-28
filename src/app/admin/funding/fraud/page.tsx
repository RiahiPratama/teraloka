'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import {
  ShieldAlert, ShieldCheck, AlertCircle, AlertTriangle, AlertOctagon,
  CheckCircle2, BarChart3, HandCoins, Target, User, List,
  RefreshCw, Search, Eye, Shield, MapPin, Info,
} from 'lucide-react';

import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
import FraudFlagsTable, { type FraudFlag } from '@/components/admin/funding/FraudFlagsTable';
import FraudBulkActionsToolbar from '@/components/admin/funding/FraudBulkActionsToolbar';
import FraudFlagDetailModal from '@/components/admin/funding/FraudFlagDetailModal';
import Pagination from '@/components/admin/funding/Pagination';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ⭐ Mission 2P: Filosofi LOCKED - Fraud Detection = OBSERVATIONAL, bukan ENFORCEMENT
// Flag aktif TIDAK block donasi/kampanye dari money flow
// Admin decide: confirmed fraud -> manual action ke entity asal
// Penggalang Maluku Utara sering di 3T -> flag bisa false positive karena kondisi geografis

// ── Types ─────────────────────────────────────────
interface FraudStats {
  active: number;
  resolved: number;
  critical: number;
  high: number;
  by_signal: Record<string, number>;
  by_severity: Record<string, number>;
}

type StatusTab = 'active' | 'resolved' | 'all';

const STATUS_TABS: { key: StatusTab; label: string; Icon: any; color: string }[] = [
  { key: 'active',   label: 'Active',   Icon: AlertCircle,   color: '#EF4444' },
  { key: 'resolved', label: 'Resolved', Icon: CheckCircle2,  color: '#10B981' },
  { key: 'all',      label: 'Semua',    Icon: List,          color: '#6B7280' },
];

const SEVERITY_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: '',         label: 'Semua Severity', color: '' },
  { key: 'critical', label: 'Critical',       color: '#EF4444' },
  { key: 'high',     label: 'High',           color: '#F97316' },
  { key: 'medium',   label: 'Medium',         color: '#F59E0B' },
  { key: 'low',      label: 'Low',            color: '#3B82F6' },
];

const TARGET_OPTIONS: { key: string; label: string; Icon: any }[] = [
  { key: '',         label: 'Semua Target', Icon: List },
  { key: 'donation', label: 'Donasi',       Icon: HandCoins },
  { key: 'campaign', label: 'Kampanye',     Icon: Target },
  { key: 'user',     label: 'User',         Icon: User },
];

// ⭐ Mission 2P-B: 3T-aware signal codes (kemungkinan false positive di Maluku Utara)
// Signal codes HARUS match backend fraud-engine (UPPERCASE).
const SIGNALS_3T_AWARE: Record<string, string> = {
  OFF_HOURS_SPIKE: 'Donasi dini hari (02:00-05:00) bisa natural di MalUt — nelayan/petani aktif subuh, interpretasi timezone WIT',
  VELOCITY_SPIKE: 'Lonjakan donasi bisa karena kampanye viral via grup WhatsApp kampung — wajar di komunitas kecil',
  RAPID_FIRE: 'Donor sama berkali-kali bisa karena 1 HP dipakai bersama (keluarga/warnet) di area sinyal terbatas',
  ROUND_CLUSTER: 'Banyak donasi angka bulat (50rb/100rb) wajar di ekonomi tunai daerah',
};

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminFraudPage() {
  const { t } = useContext(AdminThemeContext);
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── State from URL ──
  const urlStatus = (searchParams.get('status') as StatusTab) || 'active';
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlLimit = Number(searchParams.get('limit')) || 20;
  const urlSeverity = searchParams.get('severity') || '';
  const urlTarget = searchParams.get('target') || '';

  const [activeTab, setActiveTab] = useState<StatusTab>(urlStatus);
  const [page, setPage] = useState(urlPage);
  const [limit, setLimit] = useState(urlLimit);
  const [severity, setSeverity] = useState(urlSeverity);
  const [target, setTarget] = useState(urlTarget);

  // ── Data ──
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // ⭐ Mission 2P-C: Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Modal ──
  const [modalState, setModalState] = useState<{ open: boolean; flagId: string | null; mode: 'view' | 'resolve' }>({
    open: false, flagId: null, mode: 'view',
  });

  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [subNavRefresh, setSubNavRefresh] = useState(0);
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── URL sync ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'active') params.set('status', activeTab);
    if (page !== 1) params.set('page', String(page));
    if (limit !== 20) params.set('limit', String(limit));
    if (severity) params.set('severity', severity);
    if (target) params.set('target', target);

    const qs = params.toString();
    router.replace(`/admin/funding/fraud${qs ? '?' + qs : ''}`, { scroll: false });
  }, [activeTab, page, limit, severity, target, router]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API_URL}/fraud/admin/stats`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setStats(json.data);
    } catch {}
  }, []);

  // ── Fetch flags ──
  const fetchFlags = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (activeTab !== 'all') qs.set('status', activeTab);
      if (severity) qs.set('severity', severity);
      if (target) qs.set('target_type', target);
      qs.set('page', String(page));
      qs.set('limit', String(limit));

      const res = await fetch(`${API_URL}/fraud/admin/flags?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFlags(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
        setSelectedIds(new Set());  // ⭐ 2P-C: reset selection saat data berubah (hindari stale)
      }
    } catch {}
    setLoading(false);
  }, [activeTab, severity, target, page, limit]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  // ── Handlers ──

  function switchTab(tab: StatusTab) {
    setActiveTab(tab);
    setPage(1);
  }

  // ⭐ Mission 2P-C: Selection handlers
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const activeFlagIds = flags.filter(f => f.status === 'active').map(f => f.id);
    setSelectedIds(prev => {
      // Kalau semua active sudah ke-select → clear. Else → select semua active.
      const allSelected = activeFlagIds.length > 0 && activeFlagIds.every(id => prev.has(id));
      return allSelected ? new Set() : new Set(activeFlagIds);
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedFlags = flags.filter(f => selectedIds.has(f.id));

  function openModal(f: FraudFlag, mode: 'view' | 'resolve') {
    setModalState({ open: true, flagId: f.id, mode });
  }

  function handleModalSuccess() {
    fetchStats();
    fetchFlags();
    setSubNavRefresh(r => r + 1);
  }

  async function handleScanAll() {
    const tk = localStorage.getItem('tl_token');
    if (!tk) { showToast(false, 'Session expired'); return; }

    setScanning(true);
    try {
      // Run both donation & campaign scans in parallel
      const [dRes, cRes] = await Promise.all([
        fetch(`${API_URL}/fraud/admin/scan-all`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()),
        fetch(`${API_URL}/fraud/admin/scan-all-campaigns`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()),
      ]);

      const totalFlags = (dRes?.data?.total_flags ?? 0) + (cRes?.data?.total_flags ?? 0);
      const scanned = (dRes?.data?.scanned ?? 0) + (cRes?.data?.scanned ?? 0);
      showToast(true, `✓ Scan complete: ${scanned} entities, ${totalFlags} flags`);

      fetchStats();
      fetchFlags();
      setSubNavRefresh(r => r + 1);
    } catch (err: any) {
      showToast(false, err.message ?? 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  // ── Render ──
  const activeCount = stats?.active ?? 0;

  return (
    <AdminAuthGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Fraud Detection</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontSize: 28, fontWeight: 800, color: t.textPrimary,
        }}>
          <span style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
          }}>
            <ShieldAlert size={22} strokeWidth={2.2} />
          </span>
          Fraud Detection
        </h1>
        <button
          onClick={handleScanAll}
          disabled={scanning}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 10, border: 'none',
            background: scanning ? '#9CA3AF' : 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: scanning ? 'not-allowed' : 'pointer',
            boxShadow: scanning ? 'none' : '0 2px 8px rgba(239,68,68,0.25)',
          }}>
          <RefreshCw size={14} strokeWidth={2.5} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning...' : 'Manual Scan All'}
        </button>
      </div>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 8 }}>
        Review & resolve 12 fraud signals (7 donasi + 5 kampanye). Auto-scan aktif setiap verify donation & approve campaign.
      </p>
      {/* ⭐ Mission 2P: Filosofi LOCKED disclaimer */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 14px', marginBottom: 24,
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 10,
      }}>
        <Info size={14} strokeWidth={2.5} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11, color: t.textDim, margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: '#3B82F6' }}>Info-only:</strong> Fraud flag tidak otomatis blokir donasi/kampanye dari money flow. 
          Admin review + decide action manual. 
          <strong style={{ color: t.textPrimary }}>Konteks 3T:</strong> Penggalang Maluku Utara sering di area sinyal terbatas — 
          flag bisa false positive karena kondisi geografis.
        </p>
      </div>

      <CommandCenterTabs active="fraud" refreshKey={subNavRefresh} />

      {/* ⭐ Mission 2P: Stats Hierarchy Refactor — Active container + severity breakdown */}
      {stats && (() => {
        // by_severity might have keys: critical/high/medium/low
        const medium = stats.by_severity?.medium ?? 0;
        const low = stats.by_severity?.low ?? 0;
        return (
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16,
          }}>
            {/* ACTIVE FLAGS — parent container with breakdown */}
            <div style={{
              background: stats.active > 0 ? 'rgba(239,68,68,0.04)' : t.mainBg,
              border: `1px solid ${stats.active > 0 ? 'rgba(239,68,68,0.2)' : t.sidebarBorder}`,
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 700, color: '#EF4444',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}>
                    <AlertCircle size={13} strokeWidth={2.5} />
                    Active Flags
                  </p>
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#EF4444', margin: 0, lineHeight: 1 }}>
                    {stats.active}
                  </p>
                </div>
                <span style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>
                  klik breakdown → filter
                </span>
              </div>
              {/* Severity breakdown — clickable filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'critical', label: 'Critical', count: stats.critical, color: '#EF4444', Icon: AlertTriangle },
                  { key: 'high',     label: 'High',     count: stats.high,     color: '#F97316', Icon: AlertOctagon },
                  { key: 'medium',   label: 'Medium',   count: medium,         color: '#F59E0B', Icon: AlertCircle },
                  { key: 'low',      label: 'Low',      count: low,            color: '#3B82F6', Icon: Info },
                ].map(s => {
                  const active = severity === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => { setSeverity(active ? '' : s.key); setPage(1); }}
                      disabled={s.count === 0}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 999,
                        fontSize: 11, fontWeight: 700,
                        cursor: s.count > 0 ? 'pointer' : 'not-allowed',
                        opacity: s.count > 0 ? 1 : 0.4,
                        background: active ? s.color : `${s.color}15`,
                        color: active ? '#fff' : s.color,
                        border: `1px solid ${active ? s.color : s.color + '40'}`,
                        transition: 'all 150ms',
                      }}
                    >
                      <s.Icon size={11} strokeWidth={2.5} />
                      {s.label}
                      <span style={{
                        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                        color: active ? '#fff' : s.color,
                        fontSize: 10, fontWeight: 800,
                        padding: '1px 7px', borderRadius: 999,
                      }}>
                        {s.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RESOLVED — separate card */}
            <div style={{
              background: t.mainBg,
              border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 12, padding: 16,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 11, fontWeight: 700, color: '#10B981',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  marginBottom: 4,
                }}>
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                  Resolved
                </p>
                <p style={{ fontSize: 32, fontWeight: 800, color: '#10B981', margin: 0, lineHeight: 1 }}>
                  {stats.resolved}
                </p>
              </div>
              <p style={{ fontSize: 10, color: t.textMuted, marginTop: 8, marginBottom: 0 }}>
                Flag yang sudah di-review admin
              </p>
            </div>
          </div>
        );
      })()}

      {/* ⭐ Mission 2P: Signal Breakdown — Icon-based, no monospace */}
      {stats && Object.keys(stats.by_signal).length > 0 && (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12, padding: 14, marginBottom: 20,
        }}>
          <p style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700, color: t.textMuted, 
            textTransform: 'uppercase', letterSpacing: '0.06em', 
            marginBottom: 10,
          }}>
            <BarChart3 size={13} strokeWidth={2.5} />
            Breakdown by Signal
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(stats.by_signal)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([signal, count]) => {
                const is3T = !!SIGNALS_3T_AWARE[signal];
                return (
                  <span key={signal} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 600,
                    padding: '6px 12px', borderRadius: 8,
                    background: is3T ? 'rgba(139,92,246,0.08)' : t.navHover,
                    border: is3T ? '1px solid rgba(139,92,246,0.25)' : `1px solid ${t.sidebarBorder}`,
                    color: t.textPrimary,
                  }}>
                    {is3T && <MapPin size={11} strokeWidth={2.5} color="#8B5CF6" />}
                    {signal.replace(/_/g, ' ')} 
                    <strong style={{ color: is3T ? '#8B5CF6' : t.textPrimary }}>
                      {count as number}
                    </strong>
                  </span>
                );
              })}
          </div>
          <p style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic', marginTop: 8, marginBottom: 0 }}>
            <MapPin size={9} strokeWidth={2.5} color="#8B5CF6" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
            <strong style={{ color: '#8B5CF6' }}>Ungu</strong> = signal yang kemungkinan false positive karena kondisi 3T Maluku Utara
          </p>
        </div>
      )}

      {/* Status Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', flexWrap: 'wrap',
      }}>
        {STATUS_TABS.map(tab => {
          const active = activeTab === tab.key;
          const count = stats
            ? (tab.key === 'all' ? stats.active + stats.resolved : stats[tab.key as 'active' | 'resolved'])
            : 0;
          const TabIcon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : t.textPrimary,
                background: active ? '#1F2937' : t.mainBg,
                border: `1px solid ${active ? '#1F2937' : t.sidebarBorder}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              <TabIcon size={13} strokeWidth={2.5} color={active ? '#fff' : tab.color} />
              <span>{tab.label}</span>
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : t.navHover,
                color: active ? '#fff' : t.textDim,
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                minWidth: 20, textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Dropdowns */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={severity}
          onChange={e => { setSeverity(e.target.value); setPage(1); }}
          style={selectStyle(t)}
        >
          {SEVERITY_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        <select
          value={target}
          onChange={e => { setTarget(e.target.value); setPage(1); }}
          style={selectStyle(t)}
        >
          {TARGET_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>

        {(severity || target) && (
          <button
            onClick={() => { setSeverity(''); setTarget(''); setPage(1); }}
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: `1px dashed ${t.sidebarBorder}`,
              background: 'transparent', color: t.textDim,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            × Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, padding: 60, textAlign: 'center',
          color: t.textDim, fontSize: 14,
        }}>
          Memuat flags...
        </div>
      ) : (
        <>
          <FraudFlagsTable
            flags={flags}
            onRowAction={(action, flag) => openModal(flag, action)}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
          />

          {total > 0 && (
            <Pagination
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={l => { setLimit(l); setPage(1); }}
            />
          )}
        </>
      )}

      {/* Detail Modal */}
      <FraudFlagDetailModal
        open={modalState.open}
        flagId={modalState.flagId}
        initialMode={modalState.mode}
        onClose={() => setModalState({ open: false, flagId: null, mode: 'view' })}
        onSuccess={handleModalSuccess}
        onToast={showToast}
      />

      {/* ⭐ Mission 2P-C: Bulk Actions Toolbar (floating, muncul saat ada selection) */}
      <FraudBulkActionsToolbar
        selectedIds={selectedIds}
        selectedFlags={selectedFlags}
        onClear={clearSelection}
        onComplete={() => { fetchStats(); fetchFlags(); }}
        onToast={showToast}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 70,
          padding: '12px 20px', borderRadius: 12,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          fontWeight: 600, fontSize: 14, maxWidth: 420,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}
      </div>
    </AdminAuthGuard>
  );
}

// ── Stat Card ────────────────────────────────────

function StatCard({
  label, value, color, t, alert,
}: {
  label: string; value: string; color: string; t: any; alert?: boolean;
}) {
  return (
    <div style={{
      background: alert ? color + '10' : t.mainBg,
      border: `1px solid ${alert ? color + '40' : t.sidebarBorder}`,
      borderRadius: 12, padding: 14,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 700,
        color: alert ? color : t.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color }}>
        {value}
      </p>
    </div>
  );
}

// ── Style helpers ────────────────────────────────

function selectStyle(t: any): React.CSSProperties {
  return {
    padding: '9px 14px', borderRadius: 10,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg, color: t.textPrimary,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
    minWidth: 160,
  };
}
