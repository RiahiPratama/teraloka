import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('campaigns')
      .select('id, title, slug, category, target_amount, collected_amount, donor_count, cover_image_url, is_urgent, status')
      .in('status', ['active', 'completed'])
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false });

    return success(data ?? []);
  } catch {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat campaigns.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error(ERROR_CODES.AUTH_REQUIRED, 'Login dulu.', 401);

    const body = await request.json();

    // Generate slug
    const slug = body.title
      .toLowerCase().replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').slice(0, 80) + '-' + Date.now().toString(36).slice(-4);

    const { data, error: dbError } = await supabase
      .from('campaigns')
      .insert({ ...body, creator_id: user.id, slug, status: 'pending_review' })
      .select()
      .single();

    if (dbError) throw dbError;
    return success(data);
  } catch (err: any) {
    return error(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}
