/**
 * Commission Rules — Tiered commission calculation per service type
 * 
 * PRINSIP:
 * Transaksi BESAR + JARANG → KOMISI
 * Transaksi KECIL + SERING → IKLAN BULANAN
 */

export interface CommissionRate {
  type: 'flat' | 'percentage' | 'first_month';
  value: number;
}

export const SERVICE_COMMISSIONS: Record<string, CommissionRate> = {
  // Speed: flat Rp 2.000 (Tidore) or 10% (long routes)
  speed_short: { type: 'flat', value: 2_000 },
  speed_long: { type: 'percentage', value: 0.10 },
  
  // Ship: 10%
  ship: { type: 'percentage', value: 0.10 },
  
  // BAKOS: 1 bulan sewa
  kos: { type: 'first_month', value: 1 },
  
  // Properti: 1% jual, 1 bulan sewa
  properti_jual: { type: 'percentage', value: 0.01 },
  properti_sewa: { type: 'first_month', value: 1 },
  
  // Kendaraan jual: 2%
  kendaraan_jual: { type: 'percentage', value: 0.02 },
};

/**
 * Calculate commission amount
 */
export function calculateCommission(
  baseAmount: number,
  rate: CommissionRate,
): number {
  switch (rate.type) {
    case 'flat':
      return rate.value;
    case 'percentage':
      return Math.round(baseAmount * rate.value);
    case 'first_month':
      return baseAmount; // 1 bulan sewa
    default:
      return 0;
  }
}

/**
 * Determine commission rate for a speed route
 */
export function getSpeedCommissionRate(basePrice: number): CommissionRate {
  return basePrice <= 20_000
    ? SERVICE_COMMISSIONS.speed_short
    : SERVICE_COMMISSIONS.speed_long;
}
