'use client';

// ════════════════════════════════════════════════════════════════
// Radar Anggaran — Panel (embed sebagai TAB di BAKABAR Command Center)
// PATH: src/components/admin/radar/radar-panel.tsx
// ────────────────────────────────────────────────────────────────
// CRUD + triase lead pengawasan anggaran. 🛡️ super_admin only —
// di-gate di level TAB (admin/content/page.tsx): tombol tab + konten
// hanya untuk super_admin. Bahasa NETRAL, NO tombol "jadiin artikel".
// ════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import { useLocationTree } from '@/components/shared/locations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { LeadFormModal } from './lead-form-modal';
import { LeadTriaseModal } from './lead-triase-modal';
import {
  WATCHDOG_API,
  STATUS_LABEL,
  STATUS_BADGE,
  STATUS_OPTIONS,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
  PRIORITY_OPTIONS,
  formatPagu,
  type WatchdogLead,
} from './radar-types';

interface TreeNode { id: string; name: string; children?: TreeNode[] }

function flattenLocations(nodes: TreeNode[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (arr?: TreeNode[]) => {
    arr?.forEach((n) => {
      map.set(n.id, n.name);
      if (n.children) walk(n.children);
    });
  };
  walk(nodes);
  return map;
}

export function RadarPanel() {
  const api = useApi();

  const [leads, setLeads] = useState<WatchdogLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Filters (backend: ?status=&priority=&source=)
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [triaseLead, setTriaseLead] = useState<WatchdogLead | null>(null);
  const [deleteLead, setDeleteLead] = useState<WatchdogLead | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // location_id → nama (1 fetch, no N-fetch per row)
  const { data: locTree } = useLocationTree();
  const locMap = useMemo(() => flattenLocations(locTree as TreeNode[] | undefined), [locTree]);

  const fetchLeads = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (sourceFilter.trim()) params.source = sourceFilter.trim();
      const res = await api.get<unknown>(WATCHDOG_API, { params, signal: controller.signal });
      const list = Array.isArray(res) ? res : ((res as { data?: WatchdogLead[] })?.data ?? []);
      setLeads(list as WatchdogLead[]);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setError(err instanceof ApiError ? err.message : 'Gagal memuat lead. Coba lagi.');
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [api, statusFilter, priorityFilter, sourceFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, retryNonce]);

  async function confirmDelete() {
    if (!deleteLead) return;
    setDeleting(true);
    try {
      await api.delete(`${WATCHDOG_API}/${deleteLead.id}`);
      showToast('Lead dihapus.');
      setDeleteLead(null);
      setRetryNonce((n) => n + 1);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal menghapus lead.', false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">Radar Anggaran</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Pengawasan anggaran — catatan internal. Lead “perlu ditelusuri”, bukan vonis.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> Tambah Lead
        </Button>
      </div>

      {/* Filters */}
      <Card padded>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Status"
            placeholder="Semua status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Select
            label="Prioritas"
            placeholder="Semua prioritas"
            options={PRIORITY_OPTIONS}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          />
          <Input
            label="Sumber"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            placeholder="Filter sumber (mis. SIRUP)"
          />
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card padded className="border border-status-critical/30 bg-status-critical/8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-status-critical">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => setRetryNonce((n) => n + 1)}>
              Coba lagi
            </Button>
          </div>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Card padded>
          <p className="text-sm text-text-muted text-center py-8">Memuat lead…</p>
        </Card>
      ) : !error && leads.length === 0 ? (
        <EmptyState
          title="Belum ada lead"
          description="Tambah lead pengawasan anggaran untuk mulai mencatat & triase."
        />
      ) : !error ? (
        <Card padded={false}>
          <div className="divide-y divide-border">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted/40 transition-colors">
                <button
                  type="button"
                  onClick={() => setTriaseLead(lead)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-text truncate">{lead.paket_name}</p>
                    <Badge variant="status" status={STATUS_BADGE[lead.status]}>
                      {STATUS_LABEL[lead.status]}
                    </Badge>
                    <Badge variant="status" status={PRIORITY_BADGE[lead.priority]}>
                      {PRIORITY_LABEL[lead.priority]}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {lead.satker} · {formatPagu(lead.pagu)}
                    {lead.location_id && locMap.get(lead.location_id)
                      ? ` · ${locMap.get(lead.location_id)}`
                      : ''}
                    {lead.source ? ` · ${lead.source}` : ''}
                  </p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {lead.sumber_url && (
                    <a
                      href={lead.sumber_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
                      title="Buka sumber"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteLead(lead)}
                    className="p-1.5 rounded-md text-text-muted hover:bg-status-critical/10 hover:text-status-critical transition-colors"
                    title="Hapus lead"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Create modal */}
      <LeadFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(msg) => {
          setCreateOpen(false);
          showToast(msg);
          setRetryNonce((n) => n + 1);
        }}
      />

      {/* Triase modal */}
      {triaseLead && (
        <LeadTriaseModal
          lead={triaseLead}
          onClose={() => setTriaseLead(null)}
          onSuccess={(msg) => {
            setTriaseLead(null);
            showToast(msg);
            setRetryNonce((n) => n + 1);
          }}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteLead} onClose={deleting ? () => {} : () => setDeleteLead(null)} size="sm">
        <DialogHeader
          icon={<Trash2 size={20} />}
          tone="danger"
          centered
          title="Hapus lead?"
          description={deleteLead?.paket_name}
        />
        <DialogBody>
          <p className="text-sm text-text-muted text-center">
            Lead pengawasan ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDeleteLead(null)} disabled={deleting}>
            Batal
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleting}>
            Hapus
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-[150] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
            toast.ok ? 'bg-status-healthy' : 'bg-status-critical'
          }`}
        >
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </div>
  );
}
