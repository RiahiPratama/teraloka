import Link from 'next/link';
import { ShieldCheck, FileText, Users, ArrowRight } from 'lucide-react';

export default function WhyTeralokaCard() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'Transparan 100%',
      desc: 'Semua campaign diverifikasi sebelum tayang',
    },
    {
      icon: FileText,
      title: 'Laporan Rinci',
      desc: 'Aliran dana real-time, publik bisa cek',
    },
    {
      icon: Users,
      title: 'Partner Komunitas',
      desc: 'Dana ke rekening komunitas terpercaya',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-5 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Kenapa Donasi di TeraLoka?
          </p>
        </div>
        <p className="text-sm text-slate-700 mb-5 leading-relaxed">
          Komitmen kami untuk kebaikan yang bisa dipercaya.
        </p>

        {/* Pillars Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {pillars.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-2 w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-200">
                <Icon size={20} className="text-slate-700" strokeWidth={2.2} />
              </div>
              <p className="text-[11px] font-bold text-slate-800 leading-tight mb-1">
                {title}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Learn More Link */}
        <Link
          href="/fundraising/standar-verifikasi"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Pelajari Standar Verifikasi TeraLoka
          <ArrowRight size={12} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
