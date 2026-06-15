/** Shared types across TeraLoka */

export interface City {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  city_id: string | null;
  avatar_url: string | null;
  emergency_contact: EmergencyContact | null;
  created_at: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

/**
 * Ticker taxonomy 2-field (sinkron backend teraloka-api Phase 1C).
 * urgensi → warna/urutan/sticky · kategori → ikon/filter · review_status → antrian verifikasi.
 * Match enum PERSIS dengan backend — typo = badge gak kerender.
 */
export type TickerUrgensi = 'darurat' | 'breaking' | 'normal' | 'promo';
export type TickerKategori =
  | 'bahaya'
  | 'transport'
  | 'civic'
  | 'kemanusiaan'
  | 'berita'
  | 'komersial';
export type TickerReviewStatus = 'approved' | 'pending' | 'rejected';

/** Item dari GET /ticker (publik) — backend sudah sort + firewall + cap. */
export interface TickerItem {
  id: string;
  urgensi: TickerUrgensi;
  kategori: TickerKategori;
  text: string;
  link: string | null;
  source_name: string | null;
  source_url: string | null;
  source_timestamp: string | null;
  created_at: string;
}

/** Item dari GET /admin/ticker — superset (incl pending/expired/nonaktif). */
export interface AdminTickerItem extends TickerItem {
  review_status: TickerReviewStatus;
  is_active: boolean;
  expires_at: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}
