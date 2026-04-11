import { success, error, ERROR_CODES } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error: dbError } = await supabase
      .from('ticker_items')
      .select('id, priority, text, link')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('priority', { ascending: true })
      .limit(20);

    if (dbError) throw dbError;
    return success(data ?? []);
  } catch {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal memuat ticker.', 500);
  }
}
