'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Tab Langganan (B5 mesin uang)
// PATH: src/app/admin/bakos/langganan/page.tsx
// Alur MANUAL (pola ADS): owner WA "udah transfer" → admin catat di sini →
//   kontak REVEAL + ledger 4303. Tidak ada gateway.
// GET  /admin/listings?type=kos                         (daftar kos + fee_status)
// GET  /admin/bank-accounts/dropdown                    (dropdown rekening)
// POST /bakos/admin/listings/:id/subscription/confirm   (aktifkan)
//   body: { subscription_tier, amount, bank_account_id, duration_months?, payment_proof_url?, notes? }
// 🛡️ Sekali confirm: engine set listing_fee_status='active' + post Cr 4303
//    (idempotency per bulan). Kontak kebuka otomatis.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { Search, CreditCard, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
// 🛡️ Kalau dropdown 404, ralat URL ini (cek mount bank-accounts.ts):
const BANK_DROPDOWN_URL = `${API_URL}/admin/bank-accounts/dropdown`;

interface KosRow {
  id: string; display_id: string | null; title: string; slug: string; status: string; price: number | null;
  kos_type: string | null; listing_tier: string | null; address: string | null;
  is_verified: boolean; listing_fee_status: string | null;
}
interface BankOpt { id: string; label: string; }

function rp(n: number | null | undefined) { return n ? 'Rp ' + n.toLocaleString('id-ID') : '—'; }
function bankLabel(b: any): string {
  const head = [b.bank_name, b.account_number].filter(Boolean).join(' · ');
  const who = b.account_holder_alias || b.account_holder || b.alias || b.label;
  return [head, who].filter(Boolean).join(' — ') || b.id;
}

export default function BakosLanggananTab() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [rows, setRows] = useState<KosRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [view, setView] = useState<'belum' | 'aktif'>('belum');
  const [selected, setSelected] = useState<KosRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };
  const tk = () => token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') || '' : '');

  const fetchRows = useCallback(async () => {
    if (!tk()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'kos', limit: '100' });
      if (search) params.set('q', search);
      const res = await fetch(`${API_URL}/admin/listings?${params}`, { headers: { Authorization: `Bearer ${tk()}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setRows(data.data.data ?? []);
    } catch (err: any) { showToast(err.message || 'Gagal memuat kos', false); }
    finally { setLoading(false); }
  }, [token, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = rows.filter(r => view === 'aktif' ? r.listing_fee_status === 'active' : r.listing_fee_status !== 'active');
  const countAktif = rows.filter(r => r.listing_fee_status === 'active').length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1500, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>Langganan</h1>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 3 }}>
          Catat pembayaran langganan owner → kontak kebuka + tercatat di pembukuan (4303). {countAktif} kos aktif.
        </p>
      </div>

      {/* Toggle view */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {([['belum', 'Belum Berlangganan'], ['aktif', 'Langganan Aktif']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: view === v ? '#F59E0B' : t.navHover, color: view === v ? '#fff' : t.textDim }}>{l}</button>
        ))}
        <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 180 }}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)} placeholder="Cari nama kos..."
            style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 12, color: t.textPrimary, background: t.mainBg, outline: 'none' }} />
          <button onClick={() => setSearch(searchInput)} style={{ padding: '6px 12px', borderRadius: 8, background: '#F59E0B', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Search size={13} /> Cari</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted, fontSize: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #F59E0B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{view === 'aktif' ? '💳' : '📭'}</div>
          <p style={{ fontWeight: 600, color: t.textPrimary }}>{view === 'aktif' ? 'Belum ada langganan aktif' : 'Semua kos terfilter sudah berlangganan'}</p>
        </div>
      ) : (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 130px 150px', padding: '12px 16px', background: t.navHover, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Kode</div><div>Kos</div><div>Harga</div><div>Status</div><div style={{ textAlign: 'right' }}>Aksi</div>
          </div>
          {filtered.map((row) => {
            const active = row.listing_fee_status === 'active';
            return (
              <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 130px 150px', padding: '12px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center' }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: row.display_id ? '#F59E0B' : t.textMuted }}>{row.display_id || '—'}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</p>
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{row.kos_type || '—'} · {row.listing_tier || '—'}</p>
                </div>
                <div style={{ fontSize: 12, color: t.textDim }}>{rp(row.price)}</div>
                <div>
                  {active
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#10B981' }}><CheckCircle2 size={13} /> Aktif</span>
                    : <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted }}>Belum aktif</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {active ? (
                    <span style={{ fontSize: 11, color: t.textMuted }}>kontak terbuka</span>
                  ) : (
                    <button onClick={() => setSelected(row)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                      <CreditCard size={13} /> Aktifkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <ConfirmModal t={t} kos={selected} tk={tk()}
          onClose={() => setSelected(null)}
          onDone={(msg) => { showToast(msg); setSelected(null); fetchRows(); }}
          onErr={(msg) => showToast(msg, false)} />
      )}
    </div>
  );
}

// ── Modal Aktifkan Langganan (portal + inline) ──
function ConfirmModal({ t, kos, tk, onClose, onDone, onErr }: {
  t: any; kos: KosRow; tk: string; onClose: () => void; onDone: (m: string) => void; onErr: (m: string) => void;
}) {
  const [tier, setTier] = useState<'basic' | 'pro'>('basic');
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [banks, setBanks] = useState<BankOpt[]>([]);
  const [duration, setDuration] = useState('1');
  const [proof, setProof] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { const p = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = p; }; }, []);

  // fetch dropdown rekening
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(BANK_DROPDOWN_URL, { headers: { Authorization: `Bearer ${tk}` } });
        const data = await res.json();
        // shape: { success, data: { accounts: [...] } } — fallback defensif
        const list = data?.data?.accounts ?? data?.accounts ?? (Array.isArray(data) ? data : data?.data) ?? [];
        const opts: BankOpt[] = (list ?? []).map((b: any) => ({ id: b.id, label: bankLabel(b) }));
        setBanks(opts);
        if (opts.length === 1) setBankId(opts[0].id);
      } catch { /* dropdown gagal — biar user tau via field kosong */ }
    })();
  }, [tk]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) { onErr('Nominal harus > 0'); return; }
    if (!bankId) { onErr('Pilih rekening tujuan'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bakos/admin/listings/${kos.id}/subscription/confirm`, {
        method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: tier, amount: Number(amount), bank_account_id: bankId,
          duration_months: Number(duration) || 1,
          payment_proof_url: proof.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) onDone(`"${kos.title}" aktif (${tier}). Kontak kebuka + tercatat 4303.`);
      else { const m = typeof data.error === 'string' ? data.error : data.error?.message; onErr(m ?? 'Gagal aktifkan langganan'); }
    } catch { onErr('Gagal terhubung ke server.'); }
    finally { setLoading(false); }
  };

  if (!mounted) return null;
  const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 };
  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box', background: '#fff' };

  return createPortal(
    <div onClick={() => { if (!loading) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Outfit', system-ui" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>Aktifkan Langganan</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>{kos.title}</p>
        </div>
        <div style={{ padding: '16px 22px' }}>
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '9px 12px', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#065F46', lineHeight: 1.5 }}>Konfirmasi = <strong>kontak kebuka</strong> untuk calon penyewa + tercatat di pembukuan (akun 4303).</p>
          </div>

          {/* Tier */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Paket</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['basic', 'pro'] as const).map(tr => (
                <button key={tr} onClick={() => setTier(tr)} disabled={loading} style={{
                  flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
                  border: `1.5px solid ${tier === tr ? '#1B6B4A' : '#CBD5E1'}`,
                  background: tier === tr ? 'rgba(27,107,74,0.08)' : '#fff', color: tier === tr ? '#1B6B4A' : '#64748B',
                }}>{tr}</button>
              ))}
            </div>
          </div>

          {/* Amount + duration */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 2 }}>
              <label style={lbl}>Nominal (Rp)</label>
              <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="cth: 49000" inputMode="numeric" disabled={loading} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Durasi (bln)</label>
              <input style={inp} value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} inputMode="numeric" disabled={loading} />
            </div>
          </div>

          {/* Bank dropdown */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Rekening tujuan</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={bankId} onChange={(e) => setBankId(e.target.value)} disabled={loading}>
              <option value="">{banks.length ? '— pilih rekening —' : '(rekening tidak termuat)'}</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>

          {/* Proof + notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Link bukti transfer (opsional)</label>
            <input style={inp} value={proof} onChange={(e) => setProof(e.target.value)} placeholder="https://..." disabled={loading} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <label style={lbl}>Catatan (opsional)</label>
            <textarea style={{ ...inp, minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="cth: transfer via BCA an. ..." disabled={loading} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => { if (!loading) onClose(); }} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #CBD5E1', background: '#fff', color: '#64748B', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>Batal</button>
            <button onClick={submit} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1B6B4A, #0891B2)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Memproses…' : 'Konfirmasi & Aktifkan'}</button>
          </div>
        </div>
      </div>
    </div>, document.body);
}
