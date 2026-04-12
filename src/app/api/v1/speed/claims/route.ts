import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import { createSeatClaim, confirmBoarding } from '@/lib/engine/booking-engine';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error(ERROR_CODES.AUTH_REQUIRED, 'Login dulu.', 401);

    const body = await request.json();
    const { queue_entry_id, passenger_name, passenger_phone } = body;

    const claim = await createSeatClaim(
      queue_entry_id,
      user.id,
      passenger_name || '',
      passenger_phone || '',
    );

    return success(claim);
  } catch (err: any) {
    return error(ERROR_CODES.SPEED_ALREADY_CLAIMED, err.message, 400);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error(ERROR_CODES.AUTH_REQUIRED, 'Login dulu.', 401);

    const body = await request.json();
    const { claim_id, action } = body;

    const result = await confirmBoarding(claim_id, action, user.id);
    return success(result);
  } catch (err: any) {
    return error(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}
