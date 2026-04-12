import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import { createContact } from '@/lib/engine/listing-engine';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error(ERROR_CODES.AUTH_REQUIRED, 'Login dulu.', 401);

    const { listing_id } = await request.json();
    const result = await createContact(listing_id, user.id);
    return success(result);
  } catch (err: any) {
    return error(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}
