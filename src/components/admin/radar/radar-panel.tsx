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
import { Plus, Trash2, ExternalLink, Database } from 'lucide-react';
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
  SORT_OPTIONS,
  PAGU_PRESETS,
  FLAG_CHIP_CLASS,
  flagTooltip,
  isEnriched,
  formatPagu,
  formatFetchedAt,
  sirupDetailUrl,
  type WatchdogLead,
  type WatchdogStatus,
  type Flag,
} from './radar-types';

interface TreeNode { id: string; name: string; children?: TreeNode[] }

// 🛡️ Hierarki chip (DISPLAY-ONLY — jangan ubah data lead.flags): kalau lead punya
// pagu_relatif (amber/menonjol), sembunyiin pagu_besar (biru) di card itu — amber
// sudah nyiratin "besar + menonjol". Cegah noise (live: pagu_besar nempel 100/100,
// pagu_relatif cuma 10/100 → tanpa ini amber ketelen tembok biru).
function displayFlags(flags?: Flag[]): Flag[] {
  if (!flags || flags.length === 0) return [];
  const hasRelatif = flags.some((f) => f.code === 'pagu_relatif');
  return hasRelatif ? flags.filter((f) => f.code !== 'pagu_besar') : flags;
}

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

  // Filters (backend: ?status=&priority=&source=&min_pagu=&satker=&sort=)
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [minPagu, setMinPagu] = useState('');           // preset min_pagu (value string)
  const [satkerInput, setSatkerInput] = useState('');   // raw input (drive field only)
  const [debouncedSatker, setDebouncedSatker] = useState(''); // ← yang masuk fetch params+deps
  const [sort, setSort] = useState('pagu_desc');        // default match backend
  const [onlyFlagged, setOnlyFlagged] = useState(false); // client-side filter (no refetch)

  // Debounce satker: input mentah → debouncedSatker (400ms). Cuma debounced yg ke-fetch.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSatker(satkerInput), 400);
    return () => clearTimeout(t);
  }, [satkerInput]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [triaseLead, setTriaseLead] = useState<WatchdogLead | null>(null);
  const [triaseInitialStatus, setTriaseInitialStatus] = useState<WatchdogStatus | undefined>(undefined);
  const [deleteLead, setDeleteLead] = useState<WatchdogLead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null); // id quick-action in-flight

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
      if (minPagu) params.min_pagu = minPagu;
      if (debouncedSatker.trim()) params.satker = debouncedSatker.trim();
      params.sort = sort;
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
  }, [api, statusFilter, priorityFilter, sourceFilter, minPagu, debouncedSatker, sort]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, retryNonce]);

  // 🛡️ Quick-action status dari kartu — HANYA transisi low-stakes (ditelusuri/tidak_layak).
  // "layak" SENGAJA gak di sini (lihat openTriaseLayak) → wajib lewat modal + framework.
  async function updateStatusQuick(lead: WatchdogLead, newStatus: WatchdogStatus, label: string) {
    setStatusBusy(lead.id);
    try {
      await api.patch(`${WATCHDOG_API}/${lead.id}`, { status: newStatus });
      showToast(`Status → ${label}`);
      setRetryNonce((n) => n + 1);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal ubah status.', false);
    } finally {
      setStatusBusy(null);
    }
  }

  // 🛡️ "Layak Telusur" dari kartu → BUKA modal dgn status pre-set 'layak' (BUKAN PATCH
  // langsung) supaya framework 3-lensa muncul. Human gap dijaga.
  function openTriaseLayak(lead: WatchdogLead) {
    setTriaseInitialStatus('layak');
    setTriaseLead(lead);
  }

  function openTriase(lead: WatchdogLead) {
    setTriaseInitialStatus(undefined);
    setTriaseLead(lead);
  }

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

  // Toggle "hanya yang ada flag" = client-side (no refetch). flags dari response.
  const visible = onlyFlagged ? leads.filter((l) => (l.flags?.length ?? 0) > 0) : leads;

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

        {/* Radar Smart v1: pagu preset + satker (debounced) + sort */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Pagu minimal</label>
            <div className="flex flex-wrap gap-1.5">
              {PAGU_PRESETS.map((p) => (
                <button
                  key={p.value || 'all'}
                  type="button"
                  onClick={() => setMinPagu(p.value)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    minPagu === p.value
                      ? 'bg-brand-teal text-white border-brand-teal'
                      : 'bg-surface text-text-muted border-border hover:bg-surface-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Satker"
            value={satkerInput}
            onChange={(e) => setSatkerInput(e.target.value)}
            placeholder="Cari satker…"
          />
          <Select
            label="Urutkan"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
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

      {/* Counter + toggle "hanya yang ada flag" */}
      {!loading && !error && leads.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            Menampilkan <span className="font-semibold text-text">{visible.length}</span> dari{' '}
            <span className="font-semibold text-text">{leads.length}</span>
            {onlyFlagged && ' · difilter: hanya yang ada sinyal'}
          </p>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
              className="accent-brand-teal"
            />
            <span className="text-xs font-medium text-text-muted">Hanya yang ada sinyal</span>
          </label>
        </div>
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
      ) : !error && visible.length === 0 ? (
        <Card padded>
          <p className="text-sm text-text-muted text-center py-8">
            Tidak ada lead dengan sinyal di hasil ini. Matikan filter “Hanya yang ada sinyal”.
          </p>
        </Card>
      ) : !error ? (
        <Card padded={false}>
          <div className="divide-y divide-border">
            {visible.map((lead) => {
              const shown = displayFlags(lead.flags);
              const link = sirupDetailUrl(lead) ?? lead.sumber_url;
              const isSirup = !!sirupDetailUrl(lead);
              const busy = statusBusy === lead.id;
              return (
                <div key={lead.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-muted/40 transition-colors">
                  <button
                    type="button"
                    onClick={() => openTriase(lead)}
                    className="flex-1 min-w-0 text-left"
                  >
                    {/* Baris 1: judul + status/prioritas + status-data (ikon, read-only) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-text truncate">{lead.paket_name}</p>
                      <Badge variant="status" status={STATUS_BADGE[lead.status]}>
                        {STATUS_LABEL[lead.status]}
                      </Badge>
                      <Badge variant="status" status={PRIORITY_BADGE[lead.priority]}>
                        {PRIORITY_LABEL[lead.priority]}
                      </Badge>
                      {/* Status DATA (read-only) — ikon non-interaktif, bukan toggle/centang.
                          Netral/abu, TERPISAH dari chip "Sinyal:" (status data ≠ sinyal). */}
                      {isEnriched(lead) && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-text-muted"
                          title="Lead sudah ter-sync detail SIRUP"
                        >
                          <Database size={11} className="shrink-0" /> Detail
                        </span>
                      )}
                    </div>

                    {/* Baris 2: PAGU prominent + Sinyal prominent (di-scan duluan).
                        🛡️ Pagu bold/gede TAPI warna teks NORMAL (netral) — bukan merah/alarm. */}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className="text-base font-bold text-text tabular-nums">
                        {formatPagu(lead.pagu)}
                      </span>
                      {shown.map((f) => (
                        <span
                          key={f.code}
                          title={flagTooltip(f)}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${FLAG_CHIP_CLASS[f.tone]}`}
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>

                    {/* Baris 3: metadata sekunder (muted, kecil) + freshness */}
                    <p className="text-[11px] text-text-subtle mt-1 truncate">
                      {lead.satker}
                      {lead.location_id && locMap.get(lead.location_id)
                        ? ` · ${locMap.get(lead.location_id)}`
                        : ''}
                      {lead.source ? ` · ${lead.source}` : ''}
                      {` · ${formatFetchedAt(lead.detail_fetched_at)}`}
                    </p>
                  </button>

                  {/* Aksi (di LUAR button — no nested interactive) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Quick-action status: low-stakes inline. 'layak' → buka modal (framework). */}
                    {lead.status === 'baru' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatusQuick(lead, 'ditelusuri', 'Sedang Ditelusuri')}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-text-muted border border-border hover:bg-surface-muted disabled:opacity-50"
                      >
                        Telusuri
                      </button>
                    )}
                    {lead.status !== 'layak' && (
                      <button
                        type="button"
                        onClick={() => openTriaseLayak(lead)}
                        title="Tandai Layak Telusur (buka panduan 3-lensa)"
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-status-healthy border border-status-healthy/30 hover:bg-status-healthy/8"
                      >
                        Layak…
                      </button>
                    )}
                    {lead.status !== 'baru' && lead.status !== 'tidak_layak' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatusQuick(lead, 'tidak_layak', 'Tidak Dilanjutkan')}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-text-muted border border-border hover:bg-surface-muted disabled:opacity-50"
                      >
                        Tdk
                      </button>
                    )}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
                        title={isSirup ? 'Buka record SIRUP' : 'Buka sumber'}
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
              );
            })}
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
          initialStatus={triaseInitialStatus}
          onClose={() => {
            setTriaseLead(null);
            setTriaseInitialStatus(undefined);
          }}
          onSuccess={(msg) => {
            setTriaseLead(null);
            setTriaseInitialStatus(undefined);
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
