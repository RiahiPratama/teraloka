'use client';

/**
 * TeraLoka — CreatorAuditLogPanel
 * Sesi Audit BADONASI (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Riwayat aksi penggalang (verify/reject/suspend/unsuspend/delete).
 * Transparansi akuntabilitas: siapa-ngapain-kapan-kenapa. Toggle/expand
 * biar ga makan tempat. Backend=OTAK (/admin/creators/audit-log); WAJAH.
 */

import { useState, useCallback, useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { ScrollText, ChevronDown, ChevronUp, RefreshCw, ShieldCheck, ShieldX, Ban, RotateCcw, Trash2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface AuditEntry {
  id: string;
  action: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  creator_id: string;
  creator_name: string | null;
  admin_id: string | null;
  admin_name: string | null;
}

const ACTION_META: Record<string, { label: string; color: string; Icon: typeof ShieldCheck }> = {
  verified:    { label: 'Diverifikasi',     color: '#10B981', Icon: ShieldCheck },
  rejected:    { label: 'Ditolak',          color: '#EF4444', Icon: ShieldX },
  suspended:   { label: 'Disuspend',        color: '#F59E0B', Icon: Ban },
  unsuspended: { label: 'Diaktifkan',       color: '#3B82F6', Icon: RotateCcw },
  deleted:     { label: 'Dihapus',          color: '#6B7280', Icon: Trash2 },
};

function fmtWaktu(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CreatorAuditLogPanel() {
  const { t } = useContext(AdminThemeContext);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchLog = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/creators/audit-log?limit=50`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) { setEntries(json.data); setLoaded(true); }
    } catch {} finally { setLoading(false); }
  }, []);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) fetchLog();
  }

  return (
    <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, marginTop: 24, overflow: 'hidden' }}>
      {/* Header toggle */}
      <div onClick={toggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: t.navHover, color: t.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ScrollText size={17} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 1 }}>Riwayat Aksi Penggalang</p>
            <p style={{ fontSize: 11, color: t.textDim }}>Jejak verifikasi, suspend, & hapus — audit akuntabilitas admin</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {expanded && loaded && (
            <button onClick={(e) => { e.stopPropagation(); fetchLog(); }} disabled={loading} title="Refresh"
              style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.navHover, color: t.textDim, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}
          {expanded ? <ChevronUp size={18} color={t.textDim} /> : <ChevronDown size={18} color={t.textDim} />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${t.sidebarBorder}`, padding: 16 }}>
          {loading && !loaded ? (
            <p style={{ fontSize: 12, color: t.textDim }}>Memuat riwayat...</p>
          ) : entries.length === 0 ? (
            <p style={{ fontSize: 12, color: t.textDim }}>Belum ada riwayat aksi.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(e => {
                const m = ACTION_META[e.action] ?? { label: e.action, color: '#6B7280', Icon: ScrollText };
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: t.navHover + '40', border: `1px solid ${t.sidebarBorder}` }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: m.color + '18', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <m.Icon size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: t.textPrimary, marginBottom: 2 }}>
                        <strong style={{ color: m.color }}>{m.label}</strong>
                        {' · '}<strong>{e.creator_name ?? 'Penggalang'}</strong>
                        <span style={{ color: t.textDim }}> oleh {e.admin_name ?? 'Admin'}</span>
                      </p>
                      {e.reason && <p style={{ fontSize: 11, color: t.textDim }}>Alasan: {e.reason}</p>}
                    </div>
                    <span style={{ fontSize: 10, color: t.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtWaktu(e.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
