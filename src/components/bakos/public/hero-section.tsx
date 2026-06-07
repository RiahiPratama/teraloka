// ════════════════════════════════════════════════════════════════
// BAKOS — Hero Section (public LP) — copy + search + PETA preview
// PATH: src/components/bakos/public/hero-section.tsx
// 🛡️ .bk-supply (count) → diganti <HeroMap/> (peta preview, gaya BALAPOR).
//    Count "160 kos" sekarang jadi badge di atas peta. Search TIDAK diubah.
// ════════════════════════════════════════════════════════════════
import { KOS_TYPES, PRICE_FILTERS, QUICK } from './bakos-links';
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
  onSearch: () => void;
}

export function HeroSection({
  searchInput, setSearchInput,
  kosType, setKosType, priceFilter, setPriceFilter, onSearch,
}: HeroProps) {
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSearch(); };

  return (
    <section className="bk-hero"><div className="bk-wrap">
      <div className="bk-crumb">TeraLoka › <b>BAKOS</b></div>

      <div className="bk-hero-top">
        <div>
          <span className="bk-pill"><span className="material-symbols-outlined">verified</span> Bagian dari TeraLoka · dipercaya warga MalUt</span>
          <h1>Cari kos di <span>Maluku Utara</span>,<br />tanpa khawatir ditipu.</h1>
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
        <span>Filter cepat:</span>
        {QUICK.map((q) => (
          <button
            key={q.label}
            type="button"
            className={'special' in q && q.special ? 'special' : ''}
            onClick={() => setSearchInput(q.label)}
          >
            <span className="material-symbols-outlined">{q.icon}</span> {q.label}
          </button>
        ))}
      </div>
    </div></section>
  );
}
