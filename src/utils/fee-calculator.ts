/**
 * Frontend fee calculator — MIRRORS backend `calculateTeralokaFee()` di funding-engine.ts
 * 
 * IMPORTANT: Pattern ini frontend-only PREVIEW. Backend (Otak) tetap source of truth.
 * Kalau ada mismatch, backend WIN (donor akan terima total dari backend response).
 * 
 * Tujuan helper ini: kasih real-time feedback ke donor saat input amount.
 * 
 * Tier structure (CTO-locked, sync dengan backend):
 *   Rp 20.000 - 149.999  → min(donasi × 3%, Rp 1.500)
 *   Rp 150.000 - 999.999 → donasi × 1%
 *   Rp 1.000.000 - 9.999.999 → donasi × 2%
 *   Rp 10.000.000+        → donasi × 3%
 */

export const MIN_DONATION = 20000;
export const MAX_PENGGALANG_FEE_PERCENT = 5;

/**
 * Hitung fee TeraLoka berdasarkan nominal donasi.
 * Returns 0 kalau amount < MIN_DONATION (handle di UI sebagai validation, not error).
 */
export function calculateTeralokaFee(amount: number): number {
  if (!amount || amount < MIN_DONATION) return 0;
  
  if (amount < 150000) {
    return Math.min(Math.round(amount * 0.03), 1500);
  }
  if (amount < 1000000) {
    return Math.round(amount * 0.01);
  }
  if (amount < 10000000) {
    return Math.round(amount * 0.02);
  }
  return Math.round(amount * 0.03);
}

/**
 * Hitung fee Penggalang berdasarkan campaign mode + donor opt-in.
 * 
 * @param amount - donasi amount
 * @param mode - 'volunteer' | 'professional'
 * @param percent - penggalang fee percent (0-5, only apply kalau professional)
 * @param donorOptedIn - donor checkbox state (default true di UI)
 */
export function calculatePenggalangFee(
  amount: number,
  mode: 'volunteer' | 'professional',
  percent: number,
  donorOptedIn: boolean
): number {
  if (mode === 'volunteer' || !donorOptedIn) return 0;
  if (!amount || amount < MIN_DONATION) return 0;
  
  // Capped at MAX_PENGGALANG_FEE_PERCENT (defensive, backend juga cap)
  const safePct = Math.min(Math.max(percent || 0, 0), MAX_PENGGALANG_FEE_PERCENT) / 100;
  return Math.round(amount * safePct);
}

/**
 * Hitung total transfer estimate (BUKAN final — backend yang generate kode unik).
 * UI display: tunjukkan range "Rp X – Rp X+999" karena kode unik random 100-999.
 * 
 * @returns { subtotal, kodeMin, kodeMax }
 *   subtotal = amount + fee_teraloka + fee_penggalang
 *   total final = subtotal + kode (100-999)
 */
export function calculateTotalEstimate(
  amount: number,
  feeTeraloka: number,
  feePenggalang: number
): {
  subtotal: number;
  totalMin: number;
  totalMax: number;
} {
  const subtotal = amount + feeTeraloka + feePenggalang;
  return {
    subtotal,
    totalMin: subtotal + 100,
    totalMax: subtotal + 999,
  };
}
