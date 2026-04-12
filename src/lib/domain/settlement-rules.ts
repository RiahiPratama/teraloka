/**
 * Settlement Rules — Payment cycle, minimum payout
 */

export const SETTLEMENT_CYCLE_DAY = 1; // Monday (1 = Monday in JS getDay when using ISO)
export const MIN_PAYOUT_AMOUNT = 10_000; // Minimum Rp 10.000 untuk payout
export const PAYMENT_DUE_DAYS = 3; // 3 hari setelah invoice dikirim
export const OVERDUE_GRACE_DAYS = 7; // 7 hari grace period sebelum penalty

/**
 * Get settlement period (previous Monday to Sunday)
 */
export function getSettlementPeriod(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon
  
  // Go back to last Monday
  const lastMonday = new Date(d);
  lastMonday.setDate(d.getDate() - ((day + 6) % 7) - 7);
  lastMonday.setHours(0, 0, 0, 0);
  
  // Last Sunday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  
  return { start: lastMonday, end: lastSunday };
}

/**
 * Check if payout meets minimum threshold
 */
export function meetsPayout(amount: number): boolean {
  return amount >= MIN_PAYOUT_AMOUNT;
}
