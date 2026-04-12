import { createClient } from '@/lib/supabase/server';
import { sendNotification, WA_TEMPLATES } from './notification-engine';
import { formatRupiah } from '@/utils/format';

/**
 * Settlement Engine — Weekly commission calculation, invoice, payment tracking
 * Cycle: Every Monday, calculate previous week's commissions per operator
 */

// ============================================================
// Calculate weekly settlement for an operator
// ============================================================
export async function calculateSettlement(
  operatorUserId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const supabase = await createClient();

  // Get pending commissions for this operator in the period
  const { data: commissions } = await supabase
    .from('commission_ledger')
    .select('*')
    .eq('operator_id', operatorUserId)
    .eq('status', 'pending')
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());

  if (!commissions || commissions.length === 0) return null;

  const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

  // Create settlement record
  const { data: settlement, error } = await supabase
    .from('settlements')
    .insert({
      operator_id: operatorUserId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      total_amount: totalAmount,
      total_transactions: commissions.length,
      status: 'calculated',
    })
    .select()
    .single();

  if (error) throw error;

  // Link commissions to this settlement
  await supabase
    .from('commission_ledger')
    .update({ settlement_id: settlement.id, status: 'settled' })
    .in('id', commissions.map((c) => c.id));

  return settlement;
}

// ============================================================
// Send invoice via WhatsApp
// ============================================================
export async function sendInvoice(settlementId: string) {
  const supabase = await createClient();

  const { data: settlement } = await supabase
    .from('settlements')
    .select('*, operator:profiles!operator_id(full_name, phone)')
    .eq('id', settlementId)
    .single();

  if (!settlement || !settlement.operator?.phone) return;

  await sendNotification({
    userId: settlement.operator_id,
    phone: settlement.operator.phone,
    template: 'settlement_invoice',
    variables: {
      count: String(settlement.total_transactions),
      amount: formatRupiah(settlement.total_amount).replace('Rp ', ''),
      period: `${settlement.period_start} - ${settlement.period_end}`,
    },
  });

  // Update status
  await supabase
    .from('settlements')
    .update({ status: 'invoice_sent', invoice_wa_sent_at: new Date().toISOString() })
    .eq('id', settlementId);
}

// ============================================================
// Record commission from a departure
// ============================================================
export async function recordCommission(params: {
  serviceType: string;
  referenceId: string;
  operatorId: string;
  amount: number;
  rateType: 'flat' | 'percentage' | 'first_month';
  rateValue: number;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('commission_ledger')
    .insert({
      service_type: params.serviceType,
      reference_id: params.referenceId,
      operator_id: params.operatorId,
      amount: params.amount,
      rate_type: params.rateType,
      rate_value: params.rateValue,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// Get operator settlement history
// ============================================================
export async function getOperatorSettlements(operatorUserId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('settlements')
    .select('*')
    .eq('operator_id', operatorUserId)
    .order('period_end', { ascending: false })
    .limit(12);

  return data ?? [];
}
