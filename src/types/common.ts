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

export interface TickerItem {
  id: string;
  priority: 'darurat' | 'kemanusiaan' | 'breaking' | 'transport' | 'promo';
  text: string;
  link: string | null;
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
