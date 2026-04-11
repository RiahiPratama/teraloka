import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import { submitReport } from '@/lib/engine/moderation-engine';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { anonymity_level, title, body: reportBody, category, location, city_id, photos } = body;

    if (!title || !reportBody || !category) {
      return error(ERROR_CODES.VALIDATION_ERROR, 'Judul, isi, dan kategori wajib diisi.', 400);
    }

    const report = await submitReport({
      reporter_id: user?.id,
      anonymity_level: anonymity_level || 'anonim',
      title,
      body: reportBody,
      category,
      location,
      city_id,
      photos,
    });

    return success(report);
  } catch (err) {
    return error(ERROR_CODES.INTERNAL_ERROR, 'Gagal mengirim laporan.', 500);
  }
}
