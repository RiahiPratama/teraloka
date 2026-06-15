/**
 * TeraLoka — System Health PROXY (server-side, secret-safe)
 * ------------------------------------------------------------
 * 🛡️ LOCK ARSITEKTUR: HEALTH_SECRET TIDAK PERNAH nyampe browser.
 *   - Pegang HEALTH_SECRET dari process.env (server-only, tanpa NEXT_PUBLIC_).
 *   - Gate by admin session: validasi Bearer client lewat backend /auth/me +
 *     wajib role super_admin (selaras visibilitas page di sidebar).
 *   - Baru fetch backend /health/deep dgn Bearer HEALTH_SECRET.
 *   - Return status bersih ke client. Client poll PROXY ini, BUKAN backend langsung.
 */

import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import type { DeepHealth } from '@/types/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_V1 = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

/** Backend ROOT origin — /health/deep ada di root, bukan di bawah /api/v1. */
function backendOrigin(): string {
  try {
    return new URL(API_V1).origin;
  } catch {
    return 'https://api.teraloka.com';
  }
}

export async function GET(req: NextRequest) {
  // 1) Wajib Bearer dari client (tl_token).
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return error(ERROR_CODES.AUTH_REQUIRED, 'Butuh login admin.', 401);
  }

  // 2) Gate: validasi sesi + role super_admin via backend /auth/me.
  let role: string | undefined;
  try {
    const meRes = await fetch(`${API_V1}/auth/me`, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });
    const meJson = await meRes.json().catch(() => null);
    if (!meRes.ok || !meJson?.success) {
      return error(ERROR_CODES.AUTH_INVALID_TOKEN, 'Sesi tidak valid.', 401);
    }
    role = meJson.data?.role as string | undefined;
  } catch {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal memverifikasi sesi.', 502);
  }
  if (role !== 'super_admin') {
    return error(ERROR_CODES.AUTH_FORBIDDEN, 'Khusus super admin.', 403);
  }

  // 3) Secret server-only.
  const secret = process.env.HEALTH_SECRET;
  if (!secret) {
    return error(
      'HEALTH_SECRET_MISSING',
      'HEALTH_SECRET belum di-set di environment. Hubungi admin infra.',
      503
    );
  }

  // 4) Fetch backend /health/deep dgn secret (server-side, tak pernah ke browser).
  try {
    const res = await fetch(`${backendOrigin()}/health/deep`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as DeepHealth | null;
    if (!res.ok || !json) {
      return error(
        'HEALTH_UPSTREAM_ERROR',
        `Backend health check gagal (HTTP ${res.status}).`,
        502
      );
    }
    return success(json);
  } catch {
    return error(
      'HEALTH_UNREACHABLE',
      'Tidak bisa menghubungi backend health endpoint.',
      502
    );
  }
}
