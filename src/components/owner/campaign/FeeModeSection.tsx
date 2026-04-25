'use client';

import { Heart, HeartHandshake, AlertCircle, Info } from 'lucide-react';
import { MAX_PENGGALANG_FEE_PERCENT } from '@/utils/fee-calculator';

interface Props {
  mode: 'volunteer' | 'professional';
  percent: number; // 0-5
  onModeChange: (mode: 'volunteer' | 'professional') => void;
  onPercentChange: (percent: number) => void;
  /**
   * Disabled mode toggle. Set true kalau campaign status active/completed (immutable).
   */
  locked?: boolean;
  lockedReason?: string;
}

/**
 * FeeModeSection — Shared component untuk pilih operasional mode kampanye.
 * 
 * Used di:
 *   - /owner/campaign/new (create)
 *   - /owner/campaign/[id]/edit (edit, dengan locked=true kalau active)
 * 
 * Mode:
 *   - volunteer (default): Penggalang TIDAK ambil fee. Donor cuma bayar Fee TeraLoka.
 *   - professional: Penggalang ambil fee % dari donasi (cap 5%). Donor opt-in default ON.
 */
export default function FeeModeSection({
  mode,
  percent,
  onModeChange,
  onPercentChange,
  locked = false,
  lockedReason,
}: Props) {
  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onPercentChange(0);
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return;
    // Clamp to 0-5
    const clamped = Math.min(Math.max(num, 0), MAX_PENGGALANG_FEE_PERCENT);
    onPercentChange(clamped);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Mode Operasional Kampanye
        </p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Pilih bagaimana operasional kampanye ini dibiayai. Donor selalu lihat breakdown transparan.
        </p>
      </div>

      {/* Locked banner */}
      {locked && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-700 mb-0.5">Mode Dikunci</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              {lockedReason || 'Mode operasional tidak dapat diubah setelah kampanye aktif.'}
            </p>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Volunteer */}
        <button
          type="button"
          onClick={() => !locked && onModeChange('volunteer')}
          disabled={locked}
          className={`flex items-start gap-3 p-4 rounded-xl text-left border-2 transition-all ${
            mode === 'volunteer'
              ? 'border-[#003526] bg-[#f0f9f4]'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <Heart
            size={20}
            className={mode === 'volunteer' ? 'text-[#003526]' : 'text-gray-400'}
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold ${
                mode === 'volunteer' ? 'text-[#003526]' : 'text-gray-700'
              }`}
            >
              Volunteer
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Saya tidak ambil fee operasional. Cocok untuk kampanye keluarga, musibah, atau komunitas kecil.
            </p>
          </div>
        </button>

        {/* Professional */}
        <button
          type="button"
          onClick={() => !locked && onModeChange('professional')}
          disabled={locked}
          className={`flex items-start gap-3 p-4 rounded-xl text-left border-2 transition-all ${
            mode === 'professional'
              ? 'border-[#EC4899] bg-pink-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <HeartHandshake
            size={20}
            className={mode === 'professional' ? 'text-[#EC4899]' : 'text-gray-400'}
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-bold ${
                mode === 'professional' ? 'text-[#BE185D]' : 'text-gray-700'
              }`}
            >
              Profesional
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Saya ambil fee operasional untuk transport, dokumentasi, dll. Cap maksimal 5% per donasi.
            </p>
          </div>
        </button>
      </div>

      {/* Percent Input — only show if professional */}
      {mode === 'professional' && (
        <div className="rounded-xl bg-pink-50 border border-pink-100 p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Persentase Fee Operasional Penggalang
            </label>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Berapa persen dari setiap donasi untuk operasional Anda? (0-{MAX_PENGGALANG_FEE_PERCENT}%)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={percent || ''}
              onChange={handlePercentChange}
              disabled={locked}
              min={0}
              max={MAX_PENGGALANG_FEE_PERCENT}
              step={0.5}
              placeholder="3"
              className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-center outline-none focus:border-[#EC4899] disabled:opacity-60"
            />
            <span className="text-sm font-bold text-gray-700">%</span>
            <p className="text-xs text-gray-500 flex-1">
              {percent > 0 && (
                <>
                  Contoh: donasi Rp 100.000 → fee Anda Rp{' '}
                  {Math.round((100000 * percent) / 100).toLocaleString('id-ID')}
                </>
              )}
            </p>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
            <Info size={12} className="text-pink-600 shrink-0 mt-0.5" />
            <p>
              Donor punya opsi <strong>tidak setuju</strong> dengan fee ini saat berdonasi. Kalau donor uncheck, fee operasional Anda jadi Rp 0 untuk donasi tersebut.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
