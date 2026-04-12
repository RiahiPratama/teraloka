import { NextRequest } from 'next/server';
import { success, error, paginated, ERROR_CODES } from '@/lib/api/response';
import { searchListings, createListing } from '@/lib/engine/listing-engine';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const type = sp.get('type') as any;
    if (!type) return error(ERROR_CODES.VALIDATION_ERROR, 'Type required', 400);

    const result = await searchListings({
      type,
      page: Number(sp.get('page')) || 1,
      limit: Number(sp.get('limit')) || 20,
      search: sp.get('q') || undefined,
      city_id: sp.get('city_id') || undefined,
      category: sp.get('category') || undefined,
      transaction_type: sp.get('transaction_type') || undefined,
    });

    return paginated(result.data, result.page, result.limit, result.total);
  } catch {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat listing.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error(ERROR_CODES.AUTH_REQUIRED, 'Login dulu.', 401);

    const body = await request.json();
    const listing = await createListing({ ...body, owner_id: user.id });
    return success(listing);
  } catch (err: any) {
    return error(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}
