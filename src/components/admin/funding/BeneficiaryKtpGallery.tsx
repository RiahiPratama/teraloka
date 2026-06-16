'use client';

// [KTP-LEAK-FIX-LANGKAH-B-FE1] Galeri KTP penerima manfaat (admin-only) via endpoint signed.
// Ganti jalur baca dari URL publik mentah (campaign.beneficiary_id_documents) → signed-URL:
//   GET /funding/admin/campaigns/:id/beneficiary-kyc (auth admin_funding).
// Response: { success, data: { documents: [{in_kyc_bucket, signed, url}], pending_migration, ... } }.
// Selama dokumen masih di bucket publik (transisi) → url passthrough (pending_migration=true);
// setelah pindah bucket kyc privat → signed (TTL 1 jam). FE tinggal render d.url.
// Lazy fetch saat dirender. NOL ubah upload (itu FE2).

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface KycDoc {
  in_kyc_bucket: boolean;
  signed: boolean;
  url: string | null;
}

export default function BeneficiaryKtpGallery({
  campaignId,
  columns = 2,
  t,
}: {
  campaignId: string;
  columns?: number;
  t: any;
}) {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [pendingMigration, setPendingMigration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      const tk = localStorage.getItem('tl_token');
      if (!tk) {
        setError('Sesi admin tidak ditemukan.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/funding/admin/campaigns/${campaignId}/beneficiary-kyc`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.success && json.data) {
          setDocs(json.data.documents ?? []);
          setPendingMigration(!!json.data.pending_migration);
        } else {
          setError(json?.error?.message || 'Gagal memuat dokumen identitas.');
        }
      } catch {
        if (!cancelled) setError('Koneksi bermasalah.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) {
    return <p style={{ fontSize: 10, color: t.textMuted }}>Memuat dokumen…</p>;
  }
  if (error) {
    return <p style={{ fontSize: 10, color: '#F87171' }}>⚠ {error}</p>;
  }

  // url bisa null kalau signing gagal — skip yang null
  const usable = docs.filter(d => !!d.url);
  if (usable.length === 0) {
    return <p style={{ fontSize: 10, color: t.textMuted, fontStyle: 'italic' }}>Dokumen identitas tidak tersedia.</p>;
  }

  const gap = columns >= 3 ? 8 : 6;
  const radius = columns >= 3 ? 10 : 8;

  return (
    <>
      {pendingMigration && (
        <p style={{
          fontSize: 9, fontWeight: 700, color: '#D97706',
          background: 'rgba(245,158,11,0.1)', padding: '3px 7px', borderRadius: 6,
          marginBottom: 6, display: 'inline-block',
        }}>
          ⚠️ Dokumen belum di bucket aman (pending migrasi)
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
        {usable.map((d, i) => (
          <a key={i} href={d.url!} target="_blank" rel="noopener noreferrer"
            style={{
              aspectRatio: '1', borderRadius: radius, overflow: 'hidden',
              border: `1px solid ${t.sidebarBorder}`, background: t.navHover, display: 'block',
            }}>
            <img src={d.url!} alt={`KTP ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </a>
        ))}
      </div>
    </>
  );
}
