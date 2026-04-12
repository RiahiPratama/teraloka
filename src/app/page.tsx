import Link from 'next/link';
import { BRAND, APP_TAGLINE } from '@/utils/brand';

const SERVICES = [
  // Transport - row 1
  { key: 'speed', href: '/speed', emoji: '🚤', highlight: true },
  { key: 'ship', href: '/ship', emoji: '🚢' },
  { key: 'ferry', href: '/ferry', emoji: '⛴️' },
  { key: 'pelni', href: '/pelni', emoji: '🛳️' },
  // Listing - row 2
  { key: 'kos', href: '/kos', emoji: '🏘️', highlight: true },
  { key: 'property', href: '/property', emoji: '🏠' },
  { key: 'vehicle', href: '/vehicle', emoji: '🏍️' },
  { key: 'services', href: '/services', emoji: '🔧' },
  // Content & Others - row 3
  { key: 'news', href: '/news', emoji: '📰' },
  { key: 'reports', href: '/reports', emoji: '📢' },
  { key: 'fundraising', href: '/fundraising', emoji: '💚' },
  { key: 'events', href: '/events', emoji: '🎫' },
  // Utility
  { key: 'bills', href: '/bills', emoji: '💡' },
] as const;

const SECTION_LABELS = [
  { start: 0, end: 4, label: '🚢 Transportasi' },
  { start: 4, end: 8, label: '🏘️ Listing' },
  { start: 8, end: 12, label: '📰 Lainnya' },
];

export default function HomePage() {
  return (
    <div className="px-4 py-6">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-[#1B6B4A]">TeraLoka</h1>
        <p className="mt-1.5 text-sm text-gray-600">{APP_TAGLINE}</p>
      </div>

      {/* Quick access: Speed + Kos */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/speed" className="flex items-center gap-3 rounded-xl bg-[#1B6B4A] p-4 text-white active:bg-[#155a3e]">
          <span className="text-3xl">🚤</span>
          <div>
            <p className="text-sm font-bold">Speed Boat</p>
            <p className="text-xs opacity-80">Cek antrian live</p>
          </div>
        </Link>
        <Link href="/kos" className="flex items-center gap-3 rounded-xl bg-[#E8963A] p-4 text-white active:bg-[#d4832e]">
          <span className="text-3xl">🏘️</span>
          <div>
            <p className="text-sm font-bold">Cari Kos</p>
            <p className="text-xs opacity-80">BAKOS Ternate</p>
          </div>
        </Link>
      </div>

      {/* Service sections */}
      {SECTION_LABELS.map((section) => (
        <div key={section.label} className="mt-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{section.label}</h2>
          <div className="mt-2 grid grid-cols-4 gap-2.5">
            {SERVICES.slice(section.start, section.end).map((item) => {
              const brand = BRAND[item.key as keyof typeof BRAND];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3 text-center active:bg-gray-100"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[11px] font-medium leading-tight text-gray-700">
                    {brand.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* PPOB standalone */}
      <div className="mt-5">
        <Link href="/bills" className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 active:bg-gray-50">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-medium">PPOB — Bayar Tagihan</p>
            <p className="text-xs text-gray-500">Pulsa, listrik, PDAM, BPJS</p>
          </div>
          <span className="ml-auto rounded bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">Segera</span>
        </Link>
      </div>

      {/* CTA */}
      <div className="mt-6 rounded-xl bg-gradient-to-r from-[#1B6B4A] to-[#2a8f65] p-5 text-white text-center">
        <p className="text-sm font-bold">Punya usaha di Maluku Utara?</p>
        <p className="mt-1 text-xs opacity-90">Daftarkan kos, jasa, atau kendaraan rental kamu di TeraLoka. GRATIS!</p>
        <Link href="/owner" className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1B6B4A]">
          Daftar Sekarang →
        </Link>
      </div>
    </div>
  );
}
