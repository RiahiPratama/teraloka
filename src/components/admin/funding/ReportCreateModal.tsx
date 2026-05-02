'use client';

import { useContext, useState, useEffect, useMemo } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Alert:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Plus32:  () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
};

// ── Types ─────────────────────────────────────────
interface CampaignOption {
  id: string;
  title: string;
  partner_name: string | null;
  collected_amount: number;
  status: string;
}

interface ItemRow {
  name: string;
  qty: number | '';
  price: number | '';
  total: number;
}

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ═══════════════════════════════════════════════════════════════
// REPORT CREATE MODAL (Admin On-Behalf Partner)
// ═══════════════════════════════════════════════════════════════

export default function ReportCreateModal({
  open,
  onClose,
  onSuccess,
  onToast,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  // Form state
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountUsed, setAmountUsed] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [photoUrls, setPhotoUrls] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);

  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch campaigns when opened
  useEffect(() => {
    if (!open) return;

    // Reset form
    setCampaignId('');
    setTitle('');
    setDescription('');
    setAmountUsed('');
    setItems([]);
    setPhotoUrls('');
    setAutoApprove(false);
    setSafetyChecked(false);
    setSubmitting(false);

    // Fetch active campaigns (for dropdown)
    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); return; }

    setLoadingCampaigns(true);
    fetch(`${API_URL}/funding/admin/campaigns?status=active&limit=100`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setCampaigns((json.data ?? []).map((c: any) => ({
            id: c.id,
            title: c.title,
            partner_name: c.partner_name,
            collected_amount: Number(c.collected_amount) || 0,
            status: c.status,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false));
  }, [open, onToast]);

  // ⭐ CRITICAL: Hooks must be called BEFORE early return (React rules of hooks)
  // Bug fix: useMemo di sini tadinya setelah `if (!open) return null` —
  // trigger React error #310 'Rendered more hooks than during the previous render'
  const selectedCampaign = useMemo(
    () => campaigns.find(c => c.id === campaignId),
    [campaigns, campaignId]
  );

  const urlList = useMemo(
    () => photoUrls
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0),
    [photoUrls]
  );

  if (!open) return null;

  // ── Items handlers ──
  function addItem() {
    setItems([...items, { name: '', qty: '', price: '', total: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ItemRow, value: string | number) {
    const newItems = [...items];
    const row = { ...newItems[index] };

    if (field === 'name') {
      row.name = String(value);
    } else if (field === 'qty') {
      row.qty = value === '' ? '' : Number(value);
    } else if (field === 'price') {
      row.price = value === '' ? '' : Number(value);
    }

    // Recalculate total
    const qty = typeof row.qty === 'number' ? row.qty : 0;
    const price = typeof row.price === 'number' ? row.price : 0;
    row.total = qty * price;

    newItems[index] = row;
    setItems(newItems);
  }

  // ── Derived ──
  const parsedAmount = Number(amountUsed) || 0;
  const itemsTotal = items.reduce((sum, r) => sum + r.total, 0);
  const itemsMismatch = items.length > 0 && itemsTotal !== parsedAmount;

  const canSubmit =
    campaignId &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    parsedAmount > 0 &&
    (!autoApprove || safetyChecked) &&
    !submitting;

  // ── Submit ──
  async function handleSubmit() {
    if (!canSubmit) return;

    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); return; }

    // Build clean items (only those with name filled)
    const cleanItems = items
      .filter(r => r.name.trim().length > 0)
      .map(r => ({
        name: r.name.trim(),
        qty: typeof r.qty === 'number' ? r.qty : 0,
        price: typeof r.price === 'number' ? r.price : 0,
        total: r.total,
      }));

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/usage-reports`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          title: title.trim(),
          description: description.trim(),
          amount_used: parsedAmount,
          items: cleanItems,
          proof_photos: urlList,
          auto_approve: autoApprove,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? 'Gagal simpan laporan');
      }
      onToast(true, autoApprove
        ? `✓ Laporan "${title}" dibuat & langsung di-approve`
        : `✓ Laporan "${title}" dibuat (pending)`
      );
      onClose();
      onSuccess();
    } catch (err: any) {
      onToast(false, err.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(4px)', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.mainBg, borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 720, margin: '32px 0', maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #EC4899, #BE185D)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Plus32 />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                + Buat Laporan On-Behalf
              </h3>
              <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                Input laporan berdasarkan info dari partner (via WA, telepon, dll)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent', border: 'none', color: t.textDim,
              cursor: submitting ? 'not-allowed' : 'pointer', padding: 4,
            }}
          >
            <Icons.X />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Campaign dropdown */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              Kampanye <span style={{ color: '#EF4444' }}>*</span>
            </label>
            {loadingCampaigns ? (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${t.sidebarBorder}`, color: t.textDim,
                fontSize: 13,
              }}>
                Memuat daftar kampanye...
              </div>
            ) : (
              <select
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                disabled={submitting}
                style={inputStyle(t)}
              >
                <option value="">-- Pilih kampanye --</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}{c.partner_name ? ` — ${c.partner_name}` : ''} ({shortRupiah(c.collected_amount)})
                  </option>
                ))}
              </select>
            )}
            {selectedCampaign && (
              <p style={{ fontSize: 11, color: '#EC4899', marginTop: 6, fontWeight: 600 }}>
                Partner: {selectedCampaign.partner_name ?? '(tanpa partner)'} · Terkumpul: {formatRupiah(selectedCampaign.collected_amount)}
              </p>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              Judul Laporan <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Laporan Minggu 1 — Distribusi Logistik"
              disabled={submitting}
              maxLength={200}
              style={inputStyle(t)}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              Deskripsi <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Penjelasan dana digunakan untuk apa, kepada siapa, di mana, kapan..."
              rows={4}
              maxLength={2000}
              disabled={submitting}
              style={{
                ...inputStyle(t),
                resize: 'vertical', fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textAlign: 'right' }}>
              {description.length}/2000
            </p>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              Jumlah Digunakan <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, fontWeight: 700, color: t.textDim,
              }}>
                Rp
              </span>
              <input
                type="number"
                value={amountUsed}
                onChange={e => setAmountUsed(e.target.value)}
                placeholder="0"
                min="0"
                disabled={submitting}
                style={{
                  ...inputStyle(t),
                  paddingLeft: 44,
                  fontSize: 16, fontWeight: 700,
                }}
              />
            </div>
            {itemsMismatch && (
              <p style={{
                fontSize: 11, marginTop: 6, color: '#F59E0B',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Icons.Alert />
                Total items ({shortRupiah(itemsTotal)}) tidak sesuai dengan jumlah digunakan.
              </p>
            )}
          </div>

          {/* Items (optional) */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle(t), marginBottom: 0 }}>
                Items <span style={{ opacity: 0.6 }}>(optional)</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                disabled={submitting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 7,
                  border: `1px solid ${t.sidebarBorder}`, background: t.navHover,
                  color: t.textPrimary, fontSize: 11, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                <Icons.Plus /> Tambah Item
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{
                padding: 16, borderRadius: 10,
                border: `1px dashed ${t.sidebarBorder}`,
                background: t.navHover + '33',
                textAlign: 'center',
                fontSize: 11, color: t.textMuted,
              }}>
                Belum ada item. Klik "Tambah Item" untuk breakdown pembelian.
              </div>
            ) : (
              <div style={{
                border: `1px solid ${t.sidebarBorder}`, borderRadius: 10, overflow: 'hidden',
              }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 100px 100px 32px',
                    gap: 6, padding: 8, alignItems: 'center',
                    borderTop: i > 0 ? `1px solid ${t.sidebarBorder}` : 'none',
                  }}>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      placeholder="Nama item"
                      disabled={submitting}
                      style={smallInputStyle(t)}
                    />
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(i, 'qty', e.target.value)}
                      placeholder="Qty"
                      min="0"
                      disabled={submitting}
                      style={smallInputStyle(t)}
                    />
                    <input
                      type="number"
                      value={item.price}
                      onChange={e => updateItem(i, 'price', e.target.value)}
                      placeholder="Harga"
                      min="0"
                      disabled={submitting}
                      style={smallInputStyle(t)}
                    />
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: t.textPrimary,
                      textAlign: 'right', paddingRight: 4,
                    }}>
                      {item.total > 0 ? shortRupiah(item.total) : '-'}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={submitting}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 6,
                        border: `1px solid rgba(239,68,68,0.3)`,
                        background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
                {items.length > 0 && (
                  <div style={{
                    padding: '8px 12px',
                    background: t.navHover,
                    borderTop: `1px solid ${t.sidebarBorder}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>
                      Total Items ({items.length})
                    </span>
                    <span style={{
                      fontSize: 14, fontWeight: 800,
                      color: itemsMismatch ? '#F59E0B' : '#10B981',
                    }}>
                      {shortRupiah(itemsTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Proof Photos — Paste URL */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              Bukti Foto <span style={{ opacity: 0.6 }}>(optional, 1 URL per baris)</span>
            </label>
            <textarea
              value={photoUrls}
              onChange={e => setPhotoUrls(e.target.value)}
              rows={4}
              placeholder={'https://contoh.com/bukti-nota.jpg\nhttps://drive.google.com/....\nhttps://...'}
              disabled={submitting}
              style={{
                ...inputStyle(t),
                resize: 'none', fontFamily: 'monospace', fontSize: 12,
              }}
            />
            {urlList.length > 0 && (
              <p style={{ fontSize: 10, color: t.textDim, marginTop: 4 }}>
                {urlList.length} URL terdeteksi
              </p>
            )}
          </div>

          {/* Auto-approve toggle */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px',
            background: autoApprove ? 'rgba(16,185,129,0.08)' : t.navHover,
            border: `2px solid ${autoApprove ? '#10B981' : t.sidebarBorder}`,
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'all 120ms',
            marginBottom: autoApprove ? 10 : 16,
          }}>
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={e => { setAutoApprove(e.target.checked); if (!e.target.checked) setSafetyChecked(false); }}
              disabled={submitting}
              style={{
                cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 2,
                accentColor: '#10B981', width: 16, height: 16,
              }}
            />
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: 12, color: autoApprove ? '#10B981' : t.textPrimary,
                fontWeight: 700, lineHeight: 1.4, marginBottom: 2,
              }}>
                Auto-approve setelah create
              </p>
              <p style={{ fontSize: 11, color: t.textDim, lineHeight: 1.4 }}>
                Skip review step — laporan langsung tampil ke publik. Centang kalau lo udah 100% yakin data valid (misal: confirmed via call/kunjungan langsung).
              </p>
            </div>
          </label>

          {/* Safety checkbox (only if auto-approve) */}
          {autoApprove && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px',
              background: safetyChecked ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `2px solid ${safetyChecked ? '#10B981' : '#F59E0B'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 120ms',
              marginBottom: 16,
            }}>
              <input
                type="checkbox"
                checked={safetyChecked}
                onChange={e => setSafetyChecked(e.target.checked)}
                disabled={submitting}
                style={{
                  cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 2,
                  accentColor: '#10B981', width: 16, height: 16,
                }}
              />
              <span style={{
                fontSize: 12, color: safetyChecked ? '#10B981' : '#B45309',
                fontWeight: 600, lineHeight: 1.4,
              }}>
                Saya konfirmasi data & bukti valid. Laporan ini akan langsung tampil ke publik & naikin disbursement rate kampanye.
              </span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${t.sidebarBorder}`,
          display: 'flex', gap: 12,
          background: t.navHover + '33',
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
              color: t.textPrimary, fontWeight: 600, fontSize: 14,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1.5, padding: '12px 16px', borderRadius: 12, border: 'none',
              background: autoApprove
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : 'linear-gradient(135deg, #EC4899, #BE185D)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
              boxShadow: canSubmit
                ? `0 4px 12px ${autoApprove ? 'rgba(16,185,129,0.3)' : 'rgba(236,72,153,0.3)'}`
                : 'none',
            }}
          >
            {submitting
              ? 'Menyimpan...'
              : autoApprove
              ? '✓ Simpan & Auto-Approve'
              : '💾 Simpan sebagai Pending'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────

function labelStyle(t: any): React.CSSProperties {
  return {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6,
  };
}

function inputStyle(t: any): React.CSSProperties {
  return {
    width: '100%', padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg, color: t.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
}

function smallInputStyle(t: any): React.CSSProperties {
  return {
    width: '100%', padding: '6px 10px',
    borderRadius: 7,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg, color: t.textPrimary,
    fontSize: 12, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
}
