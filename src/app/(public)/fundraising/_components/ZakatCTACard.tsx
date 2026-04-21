import Link from 'next/link';
import { Calculator, ArrowRight, Sparkles } from 'lucide-react';

export default function ZakatCTACard() {
  return (
    <Link
      href="/fundraising/zakat"
      className="block group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003526] via-[#1B6B4A] to-[#003526] p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#EC4899]/20 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[#F472B6]/10 blur-2xl -translate-x-1/4 translate-y-1/4 pointer-events-none"></div>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-md">
          <Calculator size={22} className="text-white" strokeWidth={2.2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={11} className="text-[#F472B6]" />
            <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest">
              BADONASI · ZAKAT
            </p>
          </div>
          <p className="text-base font-extrabold text-white leading-tight mb-1">
            Sudah bayar zakat bulan ini?
          </p>
          <p className="text-xs text-[#95d3ba] leading-relaxed">
            Hitung zakat fitrah, maal, atau penghasilan — cepat, akurat, sesuai syariah.
          </p>
        </div>

        {/* Arrow */}
        <div className="shrink-0 self-center">
          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <ArrowRight size={14} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="relative mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <p className="text-[10px] text-[#95d3ba]/80">
          🤲 Fitrah · Maal · Penghasilan — sesuai syariah
        </p>
        <span className="text-[10px] font-bold text-[#F472B6] uppercase tracking-wider">
          Hitung →
        </span>
      </div>
    </Link>
  );
}
