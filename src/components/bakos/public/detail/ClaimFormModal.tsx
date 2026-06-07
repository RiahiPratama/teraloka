'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Detail — Claim Ownership Form Modal (B3-c)
// PATH: src/components/bakos/public/detail/ClaimFormModal.tsx
// 🛡️ POLICY A: klaim = AJUKAN kepemilikan saja. Approve admin transfer owner;
//    kontak TETAP terkunci sampai pemilik subscribe. Klaim GRATIS.
// Submit → POST /bakos/listings/:id/claim  body { evidence:{ nama, phone, note } }
//    (claimant_id diisi backend dari JWT; listing_id dari URL param)
// 🛡️ Prefix /bakos WAJIB (route ada di bakos.ts @ /bakos, beda dari /listings/:id/contact)
// ════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { MS } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ClaimFormModalProps {
  listingId: string;
  listingTitle: string;
  token: string;
  defaultName?: string;
  defaultPhone?: string;
  onClose: () => void;
}

const ov: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, zIndex: 1000,
};
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
};
const pad: React.CSSProperties = { padding: '20px 22px' };
const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6,
};
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1',
  fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box',
};

export function ClaimFormModal({
  listingId, listingTitle, token, defaultName, defaultPhone, onClose,
}: ClaimFormModalProps) {
  const [nama, setNama] = useState(defaultName ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!nama.trim()) { setError('Nama lengkap wajib diisi.'); return; }
    if (!phone.trim()) { setError('Nomor HP wajib diisi.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bakos/listings/${listingId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence: { nama: nama.trim(), phone: phone.trim(), note: note.trim() },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        // backend bisa balikin error string ATAU { code, message } — handle dua-duanya
        const msg = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(msg ?? 'Gagal mengirim klaim. Coba lagi.');
      }
    } catch {
      setError('Gagal terhubung ke server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ov} onClick={() => { if (!loading) onClose(); }} role="dialog" aria-modal="true">
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ ...pad, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              {done ? 'Klaim Terkirim' : 'Klaim Kos Ini'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>{listingTitle}</p>
          </div>
          <button
            onClick={() => { if (!loading) onClose(); }}
            aria-label="Tutup"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}
          >
            <MS n="close" />
          </button>
        </div>

        {done ? (
          // ── Success state ──
          <div style={{ ...pad, textAlign: 'center' }}>
            <div style={{ fontSize: 40, color: '#16A34A', lineHeight: 1 }}>
              <MS n="check_circle" />
            </div>
            <p style={{ margin: '12px 0 4px', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
              Klaim kamu sedang ditinjau admin.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Setelah disetujui, kepemilikan kos pindah ke kamu.
              Untuk membuka kontak &amp; alamat lengkap bagi calon penyewa,
              kamu perlu mengaktifkan langganan BAKOS.
            </p>
            <button className="bkd-btn primary" style={{ marginTop: 18, width: '100%' }} onClick={onClose}>
              Mengerti
            </button>
          </div>
        ) : (
          // ── Form state ──
          <div style={pad}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: '#15803D', lineHeight: 1.55 }}>
                <strong>Klaim ini gratis.</strong> Admin akan verifikasi data kamu.
                Setelah disetujui, kos resmi jadi milik kamu untuk dikelola.
              </p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nama lengkap pemilik</label>
              <input style={input} value={nama} onChange={(e) => setNama(e.target.value)}
                placeholder="Nama sesuai identitas" disabled={loading} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nomor HP / WhatsApp</label>
              <input style={input} value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx" inputMode="tel" disabled={loading} />
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={label}>Bukti / catatan kepemilikan</label>
              <textarea
                style={{ ...input, minHeight: 88, resize: 'vertical', fontFamily: 'inherit' }}
                value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Cth: Saya pemilik kos ini sejak 2019, sertifikat & PBB atas nama saya. Bisa kirim foto bukti via WhatsApp jika diminta."
                disabled={loading}
              />
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#94A3B8' }}>
                Belum perlu upload dokumen. Admin bisa minta foto bukti via WhatsApp saat verifikasi.
              </p>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 12px', marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="bkd-btn ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
                Batal
              </button>
              <button className="bkd-btn primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
                {loading ? 'Mengirim…' : 'Kirim Klaim'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
