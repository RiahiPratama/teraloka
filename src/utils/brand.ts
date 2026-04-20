/**
 * BRAND MAPPING — Dapur (code) vs Etalase (UI)
 * Dapur = English (internal). Etalase = Lokal (user-facing).
 */

export const BRAND = {
  // Content Engine
  news: { name: 'BAKABAR', tagline: 'Berita Maluku Utara' },
  reports: { name: 'BALAPOR', tagline: 'Laporan Warga' },

  // Booking Engine
  speed: { name: 'BAPASIAR Speed', tagline: 'Speed Boat Maluku Utara' },
  ferry: { name: 'BAPASIAR Ferry', tagline: 'Feri Lokal' },
  ship: { name: 'BAPASIAR Kapal Lokal', tagline: 'Kapal Penumpang' },
  pelni: { name: 'BAPASIAR Pelni', tagline: 'Jadwal Pelni' },
  events: { name: 'Tiket Event', tagline: 'Festival & Acara' },

  // Listing Engine
  kos: { name: 'BAKOS', tagline: 'Cari Kos Ternate' },
  property: { name: 'Properti', tagline: 'Rumah & Tanah' },
  vehicle: { name: 'Kendaraan', tagline: 'Rental & Jual Kendaraan' },
  services: { name: 'Jasa', tagline: 'Layanan & Jasa' },

  // Funding Engine
  fundraising: { name: 'BADONASI', tagline: 'Galang Dana Kemanusiaan' },

  // Integration
  bills: { name: 'PPOB', tagline: 'Pulsa, Listrik, PDAM, BPJS' },
} as const;

export type BrandKey = keyof typeof BRAND;

export const APP_NAME = 'TeraLoka';
export const APP_TAGLINE = 'Semua yang kamu butuhkan di Maluku Utara, ADA di sini.';
export const APP_DESCRIPTION = 'Super App untuk Maluku Utara';
