// ════════════════════════════════════════════════════════════════
// BAKABAR — Campaign Col-3 Card (Phase 4 — Tahap 2 + 3-B, Data Real BADONASI)
// PATH: src/components/bakabar/CampaignCol3Card.tsx
// ────────────────────────────────────────────────────────────────
// v4 (31 Mei 2026): strip "Donasi terbaru" — nama + nominal SELALU tampil,
//   doa OPSIONAL (cuma kalau donatur nulis message). Fix: donatur yg transfer
//   tanpa mendoakan tetap muncul (sebelumnya ke-skip karena filter message).
//   Konsumsi field `latest_donation` (bukan `latest_doa`).
//
// v3 (31 Mei): cover flex-1 (foto real fit, ruang kosong ke-isi foto).
// v2 (31 Mei): + strip doa terbaru.
//
// Kartu KAMPANYE BADONASI (data real) untuk slot kolom-3 zona atas.
//   - Brand BADONASI = pink. CTA → /fundraising/[slug].
//   - Editorial-safe: house content (layanan sendiri), bukan iklan → no IKLAN badge.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight, Users, Heart } from 'lucide-react';

export type LatestDonation = {
  donor_name: string;
  amount:     number;
  message:    string | null;
  created_at: string;
};

export type BadonasiCampaign = {
  id:               string;
  title:            string;
  slug:             string;
  category?:        string;
  beneficiary_name?: string;
  target_amount:    number;
  collected_amount: number;
  donor_count:      number;
  cover_image_url?: string | null;
  is_urgent?:       boolean;
  latest_donation?: LatestDonation | null;
};

function rupiah(n: number) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

function initial(name: string) {
  return (name?.trim()?.[0] || 'H').toUpperCase();
}

type Props = { campaign: BadonasiCampaign; className?: string };

export default function CampaignCol3Card({ campaign, className = '' }: Props) {
  const pct = campaign.target_amount > 0
    ? Math.min(100, Math.round((campaign.collected_amount / campaign.target_amount) * 100))
    : 0;

  const don = campaign.latest_donation ?? null;

  return (
    <Link
      href={`/fundraising/${campaign.slug}`}
      className={`rounded-lg overflow-hidden relative flex flex-col cursor-pointer group bg-white ${className}`}
      style={{ border: '1px solid #E5E7EB', minHeight: 0 }}
    >
      {/* Cover — TUMBUH isi tinggi (flex-1). Foto real object-cover muat apa aja. */}
      <div className="relative w-full flex-1 min-h-[140px] shrink-0">
        {campaign.cover_image_url ? (
          <img
            src={campaign.cover_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #EC4899, #BE185D)' }}>
            <Heart size={40} strokeWidth={1.6} className="text-white/30" />
          </div>
        )}
        <span className="absolute top-2 left-2 text-[8px] font-extrabold tracking-[1px] uppercase text-white px-2 py-0.5 rounded z-[2]"
          style={{ background: campaign.is_urgent ? 'rgba(190,24,93,0.95)' : 'rgba(0,0,0,0.55)' }}>
          {campaign.is_urgent ? '🔴 Mendesak' : 'BADONASI'}
        </span>
      </div>

      {/* Panel konten (putih, tinggi natural di bawah) */}
      <div className="shrink-0 p-3">
        <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1" style={{ color: '#BE185D' }}>
          Kampanye Donasi
        </p>
        <h3 className="text-[13px] font-bold leading-[1.25] text-gray-900 line-clamp-2 mb-2"
          style={{ fontFamily: "'Lora', Georgia, serif" }}>
          {campaign.title}
        </h3>

        {/* Progress */}
        <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#F5E1EA' }}>
          <div className="h-full rounded-full"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #EC4899, #BE185D)' }} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold text-gray-900">{rupiah(campaign.collected_amount)}</span>
          <span className="text-[10px] font-bold" style={{ color: '#BE185D' }}>{pct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Users size={11} strokeWidth={2.2} />
            {campaign.donor_count} donatur
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-extrabold" style={{ color: '#BE185D' }}>
            Donasi
            <ArrowRight size={10} strokeWidth={2.8} />
          </span>
        </div>

        {/* Donasi terbaru (Tahap 3-B) — nama + nominal selalu; doa opsional */}
        {don && (
          <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid #F3F4F6' }}>
            <p className="text-[8px] font-bold tracking-[1px] uppercase text-gray-400 mb-1.5">
              Donasi terbaru
            </p>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                style={{ background: 'linear-gradient(135deg, #EC4899, #BE185D)' }}>
                {initial(don.donor_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-gray-700 truncate">{don.donor_name}</span>
                  <span className="text-[10px] font-extrabold shrink-0" style={{ color: '#BE185D' }}>
                    {rupiah(don.amount)}
                  </span>
                </div>
                {don.message && (
                  <p className="text-[10px] text-gray-500 italic leading-[1.3] line-clamp-1 mt-0.5">
                    <Heart size={8} strokeWidth={2.6} className="inline mr-0.5 -mt-0.5" style={{ color: '#BE185D' }} />
                    &ldquo;{don.message}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
