import { createClient } from '@/lib/supabase/server';

/**
 * Weather Engine — BMKG fetch, risk assessment, alert triggers
 * Cache di weather_cache table (TTL 30 menit)
 */

interface WeatherData {
  temperature: number;
  wind_speed_knots: number;
  wave_height_m: number;
  visibility_km: number;
  description: string;
  icon: string;
}

type RiskLevel = 'safe' | 'warning' | 'danger';

// ============================================================
// Get weather for a location (cached)
// ============================================================
export async function getWeather(locationKey: string): Promise<{
  data: WeatherData | null;
  risk_level: RiskLevel;
  cached: boolean;
}> {
  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('location_key', locationKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    return {
      data: cached.data as unknown as WeatherData,
      risk_level: cached.risk_level as RiskLevel,
      cached: true,
    };
  }

  // Fetch fresh data (placeholder — actual BMKG integration later)
  const weather = await fetchBMKGWeather(locationKey);
  const risk_level = assessRisk(weather);

  // Cache it (30 min TTL)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabase.from('weather_cache').upsert({
    location_key: locationKey,
    data: weather as any,
    risk_level,
    source: 'bmkg',
    fetched_at: new Date().toISOString(),
    expires_at: expiresAt,
  });

  return { data: weather, risk_level, cached: false };
}

// ============================================================
// Get weather for a specific route
// ============================================================
export async function getRouteWeather(originSlug: string, destinationSlug: string) {
  const locationKey = `route:${originSlug}-${destinationSlug}`;
  return getWeather(locationKey);
}

// ============================================================
// Risk Assessment
// ============================================================
export function assessRisk(weather: WeatherData | null): RiskLevel {
  if (!weather) return 'safe'; // No data = assume safe

  // Danger: wind > 25 knots OR waves > 2.5m OR visibility < 1km
  if (weather.wind_speed_knots > 25 || weather.wave_height_m > 2.5 || weather.visibility_km < 1) {
    return 'danger';
  }

  // Warning: wind > 15 knots OR waves > 1.5m OR visibility < 3km
  if (weather.wind_speed_knots > 15 || weather.wave_height_m > 1.5 || weather.visibility_km < 3) {
    return 'warning';
  }

  return 'safe';
}

// ============================================================
// BMKG Fetch (placeholder — real implementation nanti)
// ============================================================
async function fetchBMKGWeather(locationKey: string): Promise<WeatherData> {
  // TODO: Implement actual BMKG API fetch
  // For now, return reasonable defaults for Maluku Utara
  return {
    temperature: 28,
    wind_speed_knots: 8,
    wave_height_m: 0.5,
    visibility_km: 10,
    description: 'Cerah berawan',
    icon: '⛅',
  };
}

// ============================================================
// Get risk emoji & label
// ============================================================
export function getRiskDisplay(risk: RiskLevel) {
  const map = {
    safe: { emoji: '🟢', label: 'Aman', color: 'text-green-600' },
    warning: { emoji: '🟡', label: 'Waspada', color: 'text-yellow-600' },
    danger: { emoji: '🔴', label: 'Bahaya', color: 'text-red-600' },
  };
  return map[risk];
}
