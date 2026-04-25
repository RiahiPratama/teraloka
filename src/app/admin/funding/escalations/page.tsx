'use client';

/**
 * /admin/funding/escalations — Auto-Escalation Admin Page (FIX-G-C)
 * 
 * THEME-AWARE: Uses AdminThemeContext for dark/light mode support
 * (matches existing admin pages like AdminFundingDonationsPage).
 * 
 * Filosofi: Donasi pending > 3 hari + penggalang offline = auto-escalate
 * to admin. Admin verify atau reject dari sini.
 */

import { useEffect, useState, useCallback, useContext } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import AdminFundingSubNav from '@/components/admin/funding/AdminFundingSubNav';
import {
  ArrowLeft, Loader2, AlertTriangle, RefreshCw, CheckCircle2,
  XCircle, Clock, Eye, ChevronRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type StatusFilter = 'unresolved' | 'resolved' | 'all';

interface EscalatedDonation {
  id: string;
  donation_code: string;
  campaign_id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  total_transfer: number;
  verification_status: string;
  escalated_to_admin_at: string;
  escalation_reason: string;
  created_at: string;
  campaigns?: {
    id: string;
    title: string;
    slug: string;
    creator_id: string;
  };
}

interface ScanResult {
  scanned: number;
  escalated: number;
  candidates: Array<{
    donation_id: string;
    donation_code: string;
    campaign_id: string;
    campaign_title: string;
    donor_name: string;
    amount: number;
    days_pending: number;
    creator_offline_since: string | null;
  }>;
}

export default function AdminEscalationsPage() {
  const { t } = useContext(AdminThemeContext);
  const { user, token, isLoading: authLoading } = useAuth();

  const [donations, setDonations] = useState<EscalatedDonation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unresolved');

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanPreview, setShowScanPreview] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [subNavRefresh, setSubNavRefresh] = useState(0);

  const fetchEscalated = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        status: statusFilter,
        limit: '50',
      });
      const res = await fetch(`${API}/funding/admin/escalations?${sp.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setDonations(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchEscalated();
  }, [fetchEscalated]);

  async function handleScan() {
    if (!token) return;
    setScanning(true);
    try {
      const res = await fetch(`${API}/funding/admin/escalations/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          days_since_created: 3,
          dry_run: dryRun,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setScanResult(json.data);
        setShowScanPreview(true);
        if (!dryRun) {
          await fetchEscalated();
          setSubNavRefresh(v => v + 1);
        }
      }
    } catch {
      // silent fail
    } finally {
      setScanning(false);
    }
  }

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.mainBg }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#EC4899' }} />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: t.mainBg }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔒</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Login dibutuhkan</h2>
          <Link
            href="/login"
            style={{
              marginTop: 12,
              display: 'inline-block',
              borderRadius: 12,
              background: '#003526',
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.mainBg, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '24px 16px 16px', borderBottom: `1px solid ${t.sidebarBorder}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <Link
            href="/admin/funding"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: t.textDim,
              textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={14} /> Admin BADONASI
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#F59E0B' }}>
              Auto-Escalation
            </p>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>
            Donasi Tertunda
          </h1>
          <p style={{ fontSize: 13, color: t.textDim, marginTop: 4, lineHeight: 1.5 }}>
            Donasi pending {'>'} 3 hari dari penggalang yang sedang offline. Admin take-over verifikasi.
          </p>
        </div>
      </div>

      {/* SubNav */}
      <div style={{ padding: '16px 16px 0', maxWidth: 1280, margin: '0 auto' }}>
        <AdminFundingSubNav refreshKey={subNavRefresh} />
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        {/* Scan Card */}
        <div style={{
          background: t.navHover,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: t.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
              <RefreshCw size={13} style={{ color: '#EC4899' }} />
              Scan Auto-Escalation
            </h2>
            <p style={{ fontSize: 12, color: t.textDim, lineHeight: 1.5 }}>
              Cari donasi pending {'>'} 3 hari dari penggalang offline. Mark sebagai escalated supaya admin handle.
            </p>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            marginBottom: 16,
          }}>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={e => setDryRun(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#EC4899' }}
            />
            <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 500 }}>
              Dry-run (preview tanpa update)
            </span>
          </label>

          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              width: '100%',
              borderRadius: 10,
              background: '#003526',
              padding: '12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              border: 'none',
              cursor: scanning ? 'not-allowed' : 'pointer',
              opacity: scanning ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 150ms',
            }}
          >
            {scanning ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                Sedang scan...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Run Scan {dryRun ? '(Dry-Run)' : '(Real)'}
              </>
            )}
          </button>

          {/* Scan result */}
          {showScanPreview && scanResult && (
            <div style={{
              marginTop: 16,
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>
                  📊 Hasil Scan
                </p>
                <button
                  onClick={() => setShowScanPreview(false)}
                  style={{
                    fontSize: 11,
                    color: '#3B82F6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Tutup
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{
                  background: t.navHover,
                  border: `1px solid ${t.sidebarBorder}`,
                  borderRadius: 8,
                  padding: 12,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 11, color: t.textDim }}>Total Pending</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>{scanResult.scanned}</p>
                </div>
                <div style={{
                  background: t.navHover,
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: 8,
                  padding: 12,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 11, color: '#F59E0B' }}>
                    {dryRun ? 'Akan di-escalate' : 'Di-escalate'}
                  </p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>
                    {dryRun ? scanResult.candidates.length : scanResult.escalated}
                  </p>
                </div>
              </div>

              {scanResult.candidates.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {scanResult.candidates.slice(0, 10).map(c => (
                    <div key={c.donation_id} style={{
                      background: t.navHover,
                      border: `1px solid ${t.sidebarBorder}`,
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 11,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontWeight: 700, color: t.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.campaign_title}
                        </p>
                        <span style={{ fontWeight: 800, color: '#BE185D' }}>
                          Rp {c.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p style={{ color: t.textDim }}>
                        {c.donor_name} · Kode {c.donation_code} · {c.days_pending} hari pending
                      </p>
                    </div>
                  ))}
                  {scanResult.candidates.length > 10 && (
                    <p style={{ fontSize: 10, color: t.textMuted, textAlign: 'center', padding: 4 }}>
                      Dan {scanResult.candidates.length - 10} donasi lainnya...
                    </p>
                  )}
                </div>
              )}

              {!dryRun && scanResult.escalated > 0 && (
                <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 8, fontWeight: 500 }}>
                  ✓ Donasi di atas sudah di-escalate. List di bawah ter-refresh.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{
          background: t.navHover,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 12,
          padding: 6,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4,
          marginBottom: 16,
        }}>
          {(['unresolved', 'resolved', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                background: statusFilter === s ? '#003526' : 'transparent',
                color: statusFilter === s ? '#fff' : t.textDim,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {s === 'unresolved' ? 'Belum Selesai' : s === 'resolved' ? 'Sudah Selesai' : 'Semua'}
            </button>
          ))}
        </div>

        {/* Escalated list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{
              background: t.navHover,
              border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
            }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#EC4899' }} />
            </div>
          ) : donations.length === 0 ? (
            <div style={{
              background: t.navHover,
              border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
            }}>
              <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                Tidak ada donasi tertunda
              </p>
              <p style={{ fontSize: 12, color: t.textDim }}>
                {statusFilter === 'unresolved'
                  ? 'Semua donasi sudah handled. Klik scan untuk cek lagi.'
                  : 'Tidak ada hasil dengan filter ini.'}
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>
                Menampilkan {donations.length} dari {total} donasi
              </p>
              {donations.map(d => (
                <EscalatedDonationCard key={d.id} donation={d} t={t} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EscalatedDonationCard — theme-aware
// ═══════════════════════════════════════════════════════════════

function EscalatedDonationCard({ donation, t }: { donation: EscalatedDonation; t: any }) {
  const statusMeta = (() => {
    switch (donation.verification_status) {
      case 'verified':
        return { label: 'Verified', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', Icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', Icon: XCircle };
      default:
        return { label: 'Pending', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', Icon: Clock };
    }
  })();
  const StatusIcon = statusMeta.Icon;

  const escalatedAt = new Date(donation.escalated_to_admin_at);
  const daysSinceEscalated = Math.floor(
    (Date.now() - escalatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div style={{
      background: t.navHover,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 12,
      padding: 16,
      transition: 'border-color 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 700,
            color: t.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {donation.campaigns?.title || 'Campaign'}
          </p>
          <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
            Donor: {donation.is_anonymous ? 'Hamba Allah' : donation.donor_name} · Kode {donation.donation_code}
          </p>
        </div>
        <span style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 999,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 700,
          background: statusMeta.bg,
          color: statusMeta.color,
        }}>
          <StatusIcon size={9} />
          {statusMeta.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Donasi</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#BE185D' }}>
            Rp {Number(donation.amount).toLocaleString('id-ID')}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Transfer</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
            Rp {Number(donation.total_transfer).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 8,
      }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
          Alasan Escalation
        </p>
        <p style={{ fontSize: 11, color: t.textPrimary, lineHeight: 1.5 }}>
          {donation.escalation_reason || '—'}
        </p>
        <p style={{ fontSize: 10, color: '#F59E0B', marginTop: 4 }}>
          Di-escalate {daysSinceEscalated === 0 ? 'hari ini' : `${daysSinceEscalated} hari lalu`}
        </p>
      </div>

      <Link
        href={`/admin/funding/donations/${donation.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          borderRadius: 10,
          background: '#003526',
          padding: '8px',
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          textDecoration: 'none',
          transition: 'opacity 150ms',
        }}
      >
        <Eye size={12} />
        Take-Over Verifikasi
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
