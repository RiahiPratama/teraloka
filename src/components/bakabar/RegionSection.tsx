// ════════════════════════════════════════════════════════════════
// BAKABAR — Region Section v9 (Sub-Sprint 5G FINAL)
// ────────────────────────────────────────────────────────────────
// PATTERN BARU: Wrapper aspectRatio + content absolute inset-0
//
// Kenapa: CSS Grid auto-rows = max-content of all cells. Pattern
// "h-full + minHeight:0 + overflow-hidden" ternyata gak reliable
// untuk constrain Col 2 + Col 3 ke Col 1's aspect height.
//
// SOLUSI: Setiap kolom wrapper punya aspectRatio: 4/5 (dimensi
// IDENTIK 100%). Content di taruh "absolute inset-0" di dalamnya.
// Karena absolute-positioned, content gak bisa push wrapper.
// Result: ketiga wrapper SAMA TINGGI, scroll/flex handled di inner.
//
// Trending behavior:
//   - Render SEMUA items (gak slice)
//   - Inner div height-constrained (= wrapper - header)
//   - overflow-y-auto scroll naturally for items 5+
//   - Visible items ~4 (atau berapa pun yang fit)
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { ArrowRight, ArrowUpDown, BadgeCheck } from 'lucide-react';
import type { RegionConfig } from './region-data';
import { LAYANAN_LIST } from './region-data';

const REGION_BG: Record<string, string> = {
  't-nasional': 'linear-gradient(180deg, #003526 30%, #001a13 100%)',
  't-ternate':  'linear-gradient(180deg, #1e40af 30%, #1e3a8a 100%)',
  't-sofifi':   'linear-gradient(180deg, #14532d 30%, #052e16 100%)',
  't-tidore':   'linear-gradient(180deg, #be123c 30%, #881337 100%)',
  't-halbar':   'linear-gradient(180deg, #c2410c 30%, #7c2d12 100%)',
  't-halsel':   'linear-gradient(180deg, #831843 30%, #500724 100%)',
  't-halut':    'linear-gradient(180deg, #115e59 30%, #042f2e 100%)',
  't-halteng':  'linear-gradient(180deg, #5b21b6 30%, #2e1065 100%)',
  't-haltim':   'linear-gradient(180deg, #92400e 30%, #451a03 100%)',
  't-morotai':  'linear-gradient(180deg, #1e3a8a 30%, #172554 100%)',
  't-sula':     'linear-gradient(180deg, #7c2d12 30%, #431407 100%)',
  't-taliabu':  'linear-gradient(180deg, #6d28d9 30%, #2e1065 100%)',
};

const THUMB_BG: Record<string, string> = {
  'thumb-1': 'linear-gradient(135deg, #be123c, #881337)',
  'thumb-2': 'linear-gradient(135deg, #c2410c, #7c2d12)',
  'thumb-3': 'linear-gradient(135deg, #14532d, #052e16)',
  'thumb-4': 'linear-gradient(135deg, #4c1d95, #5b21b6)',
  'thumb-5': 'linear-gradient(135deg, #1e40af, #1e3a8a)',
  'thumb-6': 'linear-gradient(135deg, #065f46, #064e3b)',
  'thumb-7': 'linear-gradient(135deg, #7c2d12, #431407)',
  'thumb-8': 'linear-gradient(135deg, #9f1239, #831843)',
  'thumb-9': 'linear-gradient(135deg, #075985, #0c4a6e)',
};

const LAYANAN_GRADIENT: Record<string, string> = {
  bakos:    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  bapasiar: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
  badonasi: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  balapor:  'linear-gradient(135deg, #A21CAF 0%, #701A75 100%)',
};

const LAYANAN_BRAND: Record<string, string> = {
  bakos:    '#6D28D9',
  bapasiar: '#0369A1',
  badonasi: '#BE185D',
  balapor:  '#701A75',
};

const BANNER_GRADIENT: Record<string, string> = {
  'b-telkom':    'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
  'b-bank':      'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
  'b-pln':       'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
  'b-tourism':   'linear-gradient(135deg, #0891B2 0%, #155E75 100%)',
  'b-antam':     'linear-gradient(135deg, #166534 0%, #14532D 100%)',
  'b-indosat':   'linear-gradient(135deg, #EAB308 0%, #A16207 100%)',
  'b-univ':      'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
  'b-eramet':    'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)',
  'b-bni':       'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)',
  'b-pertamina': 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)',
  'b-property':  'linear-gradient(135deg, #047857 0%, #064E3B 100%)',
};

const BANNER_BRAND: Record<string, string> = {
  'b-telkom':    '#991B1B',
  'b-bank':      '#1E293B',
  'b-pln':       '#B45309',
  'b-tourism':   '#155E75',
  'b-antam':     '#14532D',
  'b-indosat':   '#A16207',
  'b-univ':      '#1E3A8A',
  'b-eramet':    '#4C1D95',
  'b-bni':       '#9A3412',
  'b-pertamina': '#1E3A8A',
  'b-property':  '#064E3B',
};

function formatShortDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d} hari lalu` : new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

type Props = { region: RegionConfig };

export default function RegionSection({ region }: Props) {
  const {
    label, slug, gradient_class, featured, trending_list,
    layanan_variant, layanan_body, stack_banner,
  } = region;

  const layanan = LAYANAN_LIST.find(l => l.variant === layanan_variant) || LAYANAN_LIST[0];
  const layananGradient = LAYANAN_GRADIENT[layanan_variant] || LAYANAN_GRADIENT.bakos;
  const layananBrand = LAYANAN_BRAND[layanan_variant] || LAYANAN_BRAND.bakos;
  const bannerGradient = BANNER_GRADIENT[stack_banner.brand_class] || 'linear-gradient(135deg, #1F2937 0%, #111827 100%)';
  const bannerBrand = BANNER_BRAND[stack_banner.brand_class] || '#1F2937';

  return (
    <section className="my-12">

      {/* Region Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-[30px] rounded-sm" style={{ background: '#EF4444' }} />
          <h2 className="font-extrabold tracking-[-0.6px] text-gray-900"
            style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 28 }}>
            {label}
          </h2>
        </div>
        <Link href={`/bakabar?nav=${slug}`}
          className="text-[14px] font-bold flex items-center gap-1 hover:underline" style={{ color: '#378ADD' }}>
          Lihat semua
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>

      {/* ─── 3-column Grid: 1fr 1fr 1fr ─── */}
      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
        }}
      >

        {/* ═══ Col 1: Featured 4:5 (wrapper anchor, content absolute) ═══ */}
        <div className="relative" style={{ aspectRatio: '4 / 5', minWidth: 0 }}>
          <Link
            href={`/bakabar/${featured.slug}`}
            className="absolute inset-0 cursor-pointer block rounded-lg overflow-hidden text-white"
            style={{
              background: REGION_BG[gradient_class] || REGION_BG['t-nasional'],
            }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)' }} />

            <div className="absolute inset-0 z-[2] flex flex-col justify-end p-5">
              <h3 className="text-[20px] font-bold leading-[1.25] tracking-[-0.3px] mb-3 line-clamp-4"
                style={{ fontFamily: "'Lora', Georgia, serif" }}>
                {featured.title}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] opacity-95">
                <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: '#003526', fontFamily: "'Lora', Georgia, serif" }}>
                  B
                </div>
                <span className="truncate">BAKABAR {region.short_label}</span>
                <BadgeCheck size={11} strokeWidth={2.4} className="opacity-70 shrink-0" />
              </div>
              <div className="text-[11px] mt-1.5 opacity-70">
                {formatShortDate(featured.published_at)}
              </div>
            </div>
          </Link>
        </div>

        {/* ═══ Col 2: Trending 4:5 (wrapper anchor, content scrollable) ═══ */}
        <div className="relative" style={{ aspectRatio: '4 / 5', minWidth: 0 }}>
          <div
            className="absolute inset-0 rounded-lg bg-white overflow-hidden flex flex-col"
            style={{ border: '1px solid #E5E7EB' }}
          >
            {/* Header (shrink-0) */}
            <div className="px-3.5 py-2.5 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-[3px] h-[14px] rounded-sm shrink-0" style={{ background: '#EF4444' }} />
                <div className="text-[12px] font-extrabold text-gray-900 truncate">
                  Trending di {region.short_label}
                </div>
              </div>
              {trending_list.length > 4 && (
                <div className="text-[9px] text-gray-400 flex items-center gap-0.5 tracking-[0.5px] font-semibold shrink-0">
                  <ArrowUpDown size={10} strokeWidth={2.4} />
                  scroll
                </div>
              )}
            </div>

            {/* List flex-1, scrollable */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}
            >
              {trending_list.map((item, idx) => (
                <Link
                  key={item.id}
                  href={`/bakabar/${item.slug}`}
                  className="flex gap-2 px-3.5 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: idx < trending_list.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11.5px] font-semibold leading-[1.3] text-gray-900 mb-1 line-clamp-2"
                      style={{ fontFamily: "'Lora', Georgia, serif" }}>
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[9px] text-gray-400">
                      <div className="w-3 h-3 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ background: '#003526', fontFamily: "'Lora', Georgia, serif", fontWeight: 700, fontSize: 7 }}>
                        B
                      </div>
                      <span className="truncate">BAKABAR {region.short_label}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      {timeAgo(item.published_at)}
                    </div>
                  </div>
                  <div className="w-[52px] h-[52px] rounded-md shrink-0"
                    style={{ background: THUMB_BG[item.thumb_class || 'thumb-1'] || THUMB_BG['thumb-1'] }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Col 3: Stack 4:5 (wrapper anchor, 2 cards flex-1) ═══ */}
        <div className="relative" style={{ aspectRatio: '4 / 5', minWidth: 0 }}>
          <div className="absolute inset-0 flex flex-col gap-2.5">

            {/* Card 1: Layanan TeraLoka — flex-1 */}
            <Link
              href={layanan.href}
              className="flex-1 rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer group"
              style={{ background: layananGradient, minHeight: 0 }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 85% 100%, rgba(255,255,255,0.2) 0%, transparent 60%)',
              }} />

              <div className="absolute z-[1] pointer-events-none"
                style={{ top: 6, right: 8, fontSize: 32, opacity: 0.2 }}>
                {layanan.icon}
              </div>

              <div className="relative z-[2] flex-1 flex flex-col min-h-0">
                <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1 opacity-85">
                  Layanan TeraLoka
                </p>
                <h3 className="text-[17px] font-extrabold leading-[1] mb-1.5 tracking-[-0.4px]"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}>
                  {layanan.name}
                </h3>
                <p className="text-[10px] leading-[1.35] opacity-90 line-clamp-2 mb-auto">
                  {layanan_body}
                </p>
                <span className="self-start mt-1.5 px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1"
                  style={{ background: '#fff', color: layananBrand }}>
                  {layanan.cta_label}
                  <ArrowRight size={9} strokeWidth={2.8} />
                </span>
              </div>
            </Link>

            {/* Card 2: Banner Iklan — flex-1 */}
            <Link
              href="#ad"
              className="flex-1 rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer group"
              style={{ background: bannerGradient, minHeight: 0 }}
            >
              <span className="absolute z-10 px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-[0.8px] uppercase"
                style={{ top: 6, right: 6, background: '#F59E0B', color: '#fff' }}>
                Iklan
              </span>

              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 15% 100%, rgba(255,255,255,0.15) 0%, transparent 60%)',
              }} />

              <div className="relative z-[2] flex-1 flex flex-col min-h-0">
                <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1 opacity-85">
                  {stack_banner.overline}
                </p>
                <h4 className="text-[13px] font-bold leading-[1.15] mb-1 line-clamp-2"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}>
                  {stack_banner.title}
                </h4>
                <p className="text-[9px] leading-[1.35] opacity-85 line-clamp-2 mb-auto">
                  {stack_banner.body}
                </p>
                <span className="self-start mt-1.5 px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1"
                  style={{ background: '#fff', color: bannerBrand }}>
                  {stack_banner.cta_label}
                  <ArrowRight size={9} strokeWidth={2.8} />
                </span>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </section>
  );
}
