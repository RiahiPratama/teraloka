import { NextRequest } from 'next/server';
import { success, error, ERROR_CODES } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { campaign_id, amount, operational_fee, donor_name, donor_phone, is_anonymous } = body;

    if (!campaign_id || !amount) {
      return error(ERROR_CODES.VALIDATION_ERROR, 'Campaign dan jumlah wajib diisi.', 400);
    }

    // Generate donation code: BS-260412-xxxx
    const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(-4).toUpperCase();
    const donationCode = `BS-${dateCode}-${random}`;

    const totalTransfer = Number(amount) + Number(operational_fee || 0);

    const { data, error: dbError } = await supabase
      .from('donations')
      .insert({
        campaign_id,
        donor_id: user?.id,
        donor_name: donor_name || 'Anonim',
        donor_phone,
        is_anonymous: is_anonymous || false,
        amount,
        operational_fee: operational_fee || 0,
        total_transfer: totalTransfer,
        donation_code: donationCode,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return success(data);
  } catch (err: any) {
    return error(ERROR_CODES.INTERNAL_ERROR, err.message, 500);
  }
}
