import { success, error, ERROR_CODES } from '@/lib/api/response';
import { getAllPorts, getSpeedRoutes } from '@/lib/engine/booking-engine';

export async function GET() {
  try {
    const [ports, routes] = await Promise.all([getAllPorts(), getSpeedRoutes()]);
    return success({ ports, routes });
  } catch {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat data speed.', 500);
  }
}
