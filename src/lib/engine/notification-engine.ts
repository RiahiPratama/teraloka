import { createClient } from '@/lib/supabase/server';
import { shouldSendNotification } from '@/lib/domain/notification-rules';

/**
 * Notification Engine — Channel routing, quiet hours, anti-spam, retry
 * Provider: Fonnte (WhatsApp API)
 */

const FONNTE_API_URL = 'https://api.fonnte.com/send';

interface SendOptions {
  userId: string;
  phone: string;
  template: string;
  variables: Record<string, string>;
  channel?: 'wa' | 'push' | 'in_app';
}

// ============================================================
// Send notification
// ============================================================
export async function sendNotification(options: SendOptions) {
  const { userId, phone, template, variables, channel = 'wa' } = options;
  const supabase = await createClient();

  // Check quiet hours & anti-spam
  if (!shouldSendNotification(phone)) {
    return { sent: false, reason: 'quiet_hours_or_spam' };
  }

  // Save notification record
  const { data: notification } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      channel,
      title: template,
      body: renderTemplate(template, variables),
    })
    .select()
    .single();

  if (channel === 'wa') {
    return await sendWhatsApp(phone, template, variables, notification?.id);
  }

  // In-app: already saved above
  return { sent: true, notification_id: notification?.id };
}

// ============================================================
// WhatsApp via Fonnte
// ============================================================
async function sendWhatsApp(
  phone: string,
  template: string,
  variables: Record<string, string>,
  notificationId?: string,
) {
  const supabase = await createClient();
  const message = renderTemplate(template, variables);
  const token = process.env.FONNTE_API_TOKEN;

  // Log attempt
  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      notification_id: notificationId,
      channel: 'wa',
      provider: 'fonnte',
      phone,
      template,
      status: 'queued',
    })
    .select()
    .single();

  if (!token) {
    // Dev mode: skip actual send
    await supabase
      .from('notification_logs')
      .update({ status: 'sent', provider_response: { dev: true } })
      .eq('id', log?.id);
    return { sent: true, dev: true };
  }

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: phone, message }),
    });

    const result = await res.json();

    await supabase
      .from('notification_logs')
      .update({
        status: result.status ? 'sent' : 'failed',
        provider_response: result,
      })
      .eq('id', log?.id);

    return { sent: result.status, provider_response: result };
  } catch (err) {
    await supabase
      .from('notification_logs')
      .update({ status: 'failed', provider_response: { error: String(err) } })
      .eq('id', log?.id);
    return { sent: false, error: err };
  }
}

// ============================================================
// WA Templates
// ============================================================
export const WA_TEMPLATES = {
  seat_claim_created: 'Halo {name}! Seat kamu di speed {boat} rute {route} sudah di-claim. Datang ke pelabuhan {port} sebelum speed berangkat. Kode: {code}',
  seat_claim_boarded: '✅ Kamu sudah tercatat naik speed {boat}. Selamat jalan!',
  seat_claim_expired: '❌ Seat kamu di speed {boat} hangus karena speed sudah berangkat.',
  settlement_invoice: '💰 Invoice TeraLoka minggu ini:\nTotal transaksi: {count}\nKomisi: Rp {amount}\nPeriode: {period}\nMohon transfer dalam 3 hari.',
  operator_nudge_gentle: 'Halo {name}! 2 hari gak online nih. Yuk buka TeraLoka operator 🚤',
  operator_nudge_warning: '⚠️ {name}, 5 hari tidak aktif. Akun akan dinonaktifkan dalam 9 hari.',
  operator_streak_milestone: '🔥 Streak {days} hari! {name} konsisten banget. Badge {badge} unlocked!',
  operator_weekly_recap: '📊 Recap minggu ini:\n🚤 {trips} trip\n👥 {passengers} penumpang\n💰 Estimasi komisi: Rp {commission}\nRanking: #{rank}',
  kos_contact_followup: 'Halo {name}! Seminggu lalu kamu hubungi kos via TeraLoka. Sudah deal? [✅ Sudah] [❌ Belum] [🔍 Masih cari]',
} as const;

function renderTemplate(template: string, variables: Record<string, string>): string {
  let message: string = WA_TEMPLATES[template as keyof typeof WA_TEMPLATES] || template;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  return message;
}
