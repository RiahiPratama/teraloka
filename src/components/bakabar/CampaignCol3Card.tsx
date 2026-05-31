// ════════════════════════════════════════════════════════════════
// BAKABAR — Campaign Col-3 Card (Phase 4 — Tahap 2 + 3-B, Data Real BADONASI)
// PATH: src/components/bakabar/CampaignCol3Card.tsx
// ────────────────────────────────────────────────────────────────
// v2 (31 Mei 2026, Tahap 3-B): + strip "doa terbaru" di bawah meta.
//   - Konsumsi field `latest_doa` dari GET /funding/campaigns
//     (backend attachLatestDoa: verified + message + masking Hamba Allah).
//   - Muncul HANYA kalau latest_doa != null (kampanye sudah ada donasi
//     verified ber-message). Kalau null → strip disembunyikan, layout
//     lama persis (no regresi).
//
// Kartu KAMPANYE BADONASI (data real) untuk slot kolom-3 zona atas.
//   - White card + cover image + progress bar + donatur → "berisi".
//   - Brand BADONASI = pink. CTA → /fundraising/[slug].
//   - Editorial-safe: house content (layanan sendiri), bukan iklan
//     pihak ketiga → no IKLAN badge.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight, Users, Heart } from 'lucide-react';

export type LatestDoa = {
  donor_name: string;
  message:    string;
  amount:     number;
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
  latest_doa?:      LatestDoa | null;   // Tahap 3-B
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

  const doa = campaign.latest_doa ?? null;

  return (
    <Link
      href={`/fundraising/${campaign.slug}`}
      className={`rounded-lg overflow-hidden relative flex flex-col cursor-pointer group bg-white ${className}`}
      style={{ border: '1px solid #E5E7EB', minHeight: 0 }}
    >
      {/* Cover image */}
      <div className="relative w-full shrink-0" style={{ height: 110 }}>
        {campaign.cover_image_url ? (
          <img
            src={campaign.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #EC4899, #BE185D)' }} />
        )}
        <span className="absolute top-2 left-2 text-[8px] font-extrabold tracking-[1px] uppercase text-white px-2 py-0.5 rounded"
          style={{ background: campaign.is_urgent ? 'rgba(190,24,93,0.95)' : 'rgba(0,0,0,0.55)' }}>
          {campaign.is_urgent ? '🔴 Mendesak' : 'BADONASI'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 p-3">
        <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1" style={{ color: '#BE185D' }}>
          Kampanye Donasi
        </p>
        <h3 className="text-[13px] font-bold leading-[1.25] text-gray-900 line-clamp-2 mb-2"
          style={{ fontFamily: "'Lora', Georgia, serif" }}>
          {campaign.title}
        </h3>

        {/* Progress + meta (didorong ke bawah) */}
        <div className="mt-auto">
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

          {/* Strip doa terbaru (Tahap 3-B) — muncul hanya kalau ada */}
          {doa && (
            <div className="flex items-start gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px solid #F3F4F6' }}>
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                style={{ background: 'linear-gradient(135deg, #EC4899, #BE185D)' }}>
                {initial(doa.donor_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <Heart size={9} strokeWidth={2.6} style={{ color: '#BE185D' }} className="shrink-0" />
                  <span className="text-[10px] font-bold text-gray-700 truncate">{doa.donor_name}</span>
                </div>
                <p className="text-[10px] text-gray-500 italic leading-[1.3] line-clamp-1">
                  &ldquo;{doa.message}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
