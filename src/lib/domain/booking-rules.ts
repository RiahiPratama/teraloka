/**
 * Booking Rules — Speed boat state machine & validation
 * 
 * Queue states: queuing → boarding → departed | cancelled
 * Seat claim states (Phase 1): active → boarded | expired
 * 
 * ATURAN KRITIS:
 * - TIDAK ADA tombol CANCEL seat claim
 * - TIDAK ADA timer/countdown
 * - Seat HANGUS saat speed LEPAS TALI (departed)
 * - BOARDED = WAJIB confirm sebelum lepas tali
 * - System BLOCK departure kalau ada claim belum resolved
 */

export type QueueStatus = 'queuing' | 'boarding' | 'departed' | 'cancelled';
export type ClaimStatus = 'active' | 'boarded' | 'expired';

export const VALID_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  queuing: ['boarding', 'departed', 'cancelled'],
  boarding: ['departed', 'cancelled'],
  departed: [], // terminal
  cancelled: [], // terminal
};

export const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  active: ['boarded', 'expired'],
  boarded: [], // terminal
  expired: [], // terminal
};

export function canTransition(current: QueueStatus, next: QueueStatus): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export function canClaimTransition(current: ClaimStatus, next: ClaimStatus): boolean {
  return CLAIM_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Check if departure is blocked (Phase 1 — FASE 5)
 * Blocked if any seat claims are still 'active' (unresolved)
 */
export function isDepartureBlocked(activeClaims: number): boolean {
  return activeClaims > 0;
}

/**
 * Check if emergency skip is valid
 */
export function isValidEmergency(reason: string): boolean {
  const validReasons = ['medis', 'duka', 'persalinan'];
  return validReasons.includes(reason.toLowerCase());
}

/**
 * Calculate commission for a route
 */
export function calculateCommission(
  basePrice: number,
  commissionType: 'flat' | 'percentage',
  commissionValue: number,
): number {
  if (commissionType === 'flat') return commissionValue;
  return Math.round(basePrice * commissionValue);
}
