// ════════════════════════════════════════════════════════════════
// BAKOS — Hero Section (public LP) — copy + search + PETA preview
// PATH: src/components/bakos/public/hero-section.tsx
// 🛡️ .bk-supply (count) → diganti <HeroMap/> (peta preview, gaya BALAPOR).
//    Count "160 kos" sekarang jadi badge di atas peta. Search TIDAK diubah.
// L+: headline nowrap "Maluku Utara" + strip CTA owner (supply cold-start).
//     PENANDA: BK-HERO-OWNER-CTA.
// ════════════════════════════════════════════════════════════════
import Link from 'next/link';
import { KOS_TYPES, PRICE_FILTERS, FILTER_FAC, facLabel } from './bakos-links';
import { HeroMap } from './map/HeroMap';

interface HeroProps {
  total: number;
  loading: boolean;
  searchInput: string;
  setSearchInput: (v: string) => void;
  kosType: string;
  setKosType: (v: string) => void;
  priceFilter: string;
  setPriceFilter: (v: string) => void;
  facilities: string[];
  onToggleFac: (key: string) => void;
  onSearch: () => void;
}

export function HeroSection({
  searchInput, setSearchInput,
  kosType, setKosType, priceFilter, setPriceFilter,
  facilities, onToggleFac, onSearch,
}: HeroProps) {
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSearch(); };

  return (
    <section className="bk-hero"><div className="bk-wrap">
      <div className="bk-crumb">TeraLoka › <b>BAKOS</b></div>

      <div className="bk-hero-top">
        <div>
          <span className="bk-pill"><span className="material-symbols-outlined">verified</span> Bagian dari TeraLoka · dipercaya warga Maluku Utara</span>
          <h1>Cari kos di <span className="bk-nowrap">Maluku Utara</span>,<br />tanpa khawatir ditipu.</h1>
          <p className="bk-sub">Kontak pemilik kos langsung, tanpa calo. Harga transparan, nomor diteruskan aman lewat WhatsApp, dan tampil di hadapan pembaca berita lokal BAKABAR.</p>
        </div>

        {/* 🛡️ peta preview — ganti .bk-supply lama */}
        <HeroMap />
      </div>

      <form className="bk-search" onSubmit={handleSubmit}>
        <div className="bk-sf grow">
          <label>Cari kos / area</label>
          <div className="v">
            <span className="material-symbols-outlined">search</span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nama kos atau area, mis. Akehuda…"
            />
          </div>
        </div>
        <div className="bk-sf">
          <label>Tipe kos</label>
          <select value={kosType} onChange={(e) => setKosType(e.target.value)}>
            {KOS_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="bk-sf">
          <label>Harga/bulan</label>
          <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
            {PRICE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
        <button type="submit" className="bk-cari">
          <span className="material-symbols-outlined">search</span> Cari kos
        </button>
      </form>

      <div className="bk-fcepat">
        <span>Filter fasilitas:</span>
        {FILTER_FAC.map((f) => {
          const on = facilities.includes(f.key);
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              className={on ? 'on' : ''}
              style={on ? { background: 'var(--bk-green, #1B6B4A)', color: '#fff', borderColor: 'var(--bk-green, #1B6B4A)' } : undefined}
              onClick={() => onToggleFac(f.key)}
            >
              <span className="material-symbols-outlined">{f.icon}</span> {facLabel(f.key)}
            </button>
          );
        })}
      </div>

      {/* ── STRIP CTA OWNER (BK-HERO-OWNER-CTA) — pintu kedua buat pemilik kos ── */}
      <Link href="/owner/bakos" className="bk-ownerstrip">
        <span className="bk-ownerstrip-ic"><span className="material-symbols-outlined">add_home_work</span></span>
        <span className="bk-ownerstrip-tx">
          <b>Punya kos di Maluku Utara?</b>
          <em>Daftarkan gratis · kelola dari HP · sewa 100% milik Anda</em>
        </span>
        <span className="bk-ownerstrip-btn">Daftarkan kos <span className="material-symbols-outlined">arrow_forward</span></span>
      </Link>
    </div></section>
  );
}
