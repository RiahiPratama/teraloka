import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import { getPortQueue, updatePassengerCount, departQueue } from '@/lib/engine/booking-engine';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const port = request.nextUrl.searchParams.get('port');
  if (!port) return error(ERROR_CODES.VALIDATION_ERROR, 'Port slug required.', 400);

  try {
    const data = await getPortQueue(port);
    if (!data) return error(ERROR_CODES.NOT_FOUND, 'Port not found.', 404);
    return success(data);
  } catch {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat antrian.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error(ERROR_CODES.AUTH_REQUIRED, 'Login dulu.', 401);

    const body = await request.json();
    const { queue_entry_id, action, delta } = body;

    if (action === 'update_count') {
      const data = await updatePassengerCount(queue_entry_id, delta, user.id);
      return success(data);
    }

    if (action === 'depart') {
      const data = await departQueue(queue_entry_id, user.id);
      return success(data);
    }

    return error(ERROR_CODES.VALIDATION_ERROR, 'Invalid action.', 400);
  } catch (err: any) {
    return error(ERROR_CODES.INTERNAL_ERROR, err.message || 'Gagal update.', 500);
  }
}
