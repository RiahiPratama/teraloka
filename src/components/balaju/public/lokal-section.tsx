import { Waves, MapPin } from "lucide-react";

export function LokalSection() {
  return (
    <section id="lokal" className="py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-2">
        <div className="bl-reveal">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bl-amber-15)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bl-amber)]">
            <Waves className="h-4 w-4" /> Pembeda kami
          </span>
          <p className="mt-5 text-4xl font-black leading-tight text-[var(--bl-forest-d)] lg:text-5xl">Dibangun untuk <span className="bl-grad">Maluku Utara.</span></p>
          <p className="mt-5 leading-relaxed text-[var(--bl-muted)]">
            BALAJU bukan aplikasi nasional yang singgah sebentar. Dibangun putra daerah, mengerti jalanan,
            kebiasaan, dan kebutuhan warga sini. Kami melayani satu kota dengan benar dulu — lalu melebar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bl-forest-10)] px-4 py-2 text-sm font-bold text-[var(--bl-forest-d)]"><MapPin className="h-[18px] w-[18px] text-[var(--bl-forest)]" /> Ternate · Aktif</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bl-line)] bg-[var(--bl-cream)] px-4 py-2 text-sm font-semibold text-[var(--bl-muted)]">Tidore · Segera</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bl-line)] bg-[var(--bl-cream)] px-4 py-2 text-sm font-semibold text-[var(--bl-muted)]">Sofifi · Segera</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bl-line)] bg-[var(--bl-cream)] px-4 py-2 text-sm font-semibold text-[var(--bl-muted)]">Kota lain · Menyusul</span>
          </div>
        </div>

        {/* peta kota beranimasi: driver mengantar penumpang (Takoma -> Walikota) */}
        <div className="bl-reveal" style={{ transitionDelay: "100ms" }}>
          <div className="bl-shadow-lift relative overflow-hidden rounded-[30px] border border-[var(--bl-line)] bg-white p-4">
            <div className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[var(--bl-forest-d)] shadow-[0_8px_20px_-10px_rgba(20,36,29,.3)] backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-[var(--bl-forest-70)]" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--bl-forest)]" />
              </span>
              Mengantar penumpang
            </div>

            <svg viewBox="0 0 360 230" className="w-full" role="img" aria-label="Ilustrasi driver mengantar penumpang dari Takoma ke Kantor Walikota">
              {/* base + laut */}
              <rect width="360" height="230" rx="16" fill="#EAF4EF" />
              <path d="M0 178 Q90 152 180 170 T360 164 V230 H0 Z" fill="#0891B2" opacity="0.14" />
              {/* blok kota (samar) */}
              <rect x="40" y="40" width="46" height="34" rx="5" fill="#1B6B4A" opacity="0.06" />
              <rect x="150" y="34" width="40" height="30" rx="5" fill="#1B6B4A" opacity="0.06" />
              <rect x="250" y="46" width="52" height="30" rx="5" fill="#1B6B4A" opacity="0.06" />
              <rect x="92" y="96" width="38" height="26" rx="5" fill="#1B6B4A" opacity="0.05" />
              {/* jalan (putih lebar, samar) */}
              <path d="M20 150 H340" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" opacity="0.75" />
              <path d="M120 18 V196" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" opacity="0.6" />
              <path d="M250 18 V150" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" opacity="0.6" />
              {/* rute (dashed) + jadi jalur animasi motor */}
              <path id="bl-route" d="M55 150 C 110 150 112 110 165 108 C 215 106 240 92 300 82"
                    fill="none" stroke="#1B6B4A" strokeOpacity="0.45" strokeWidth="2.6" strokeDasharray="2 6" strokeLinecap="round" />
              {/* start: Takoma */}
              <circle cx="55" cy="150" r="12" fill="#1B6B4A" opacity="0.16" />
              <circle cx="55" cy="150" r="6" fill="#1B6B4A" />
              <text x="55" y="134" fontFamily="Urbanist" fontSize="11" fontWeight="800" fill="#0F4732" textAnchor="middle">Takoma</text>
              {/* end: Kantor Walikota */}
              <circle cx="300" cy="82" r="6.5" fill="#E8963A" />
              <circle cx="300" cy="82" r="2.4" fill="#fff" />
              <text x="300" y="66" fontFamily="Urbanist" fontSize="11" fontWeight="800" fill="#0F4732" textAnchor="middle">Walikota</text>

              {/* motor + 2 penumpang, gerak nyusurin rute */}
              <g>
                <circle r="9" fill="#1B6B4A" opacity="0.18">
                  <animate attributeName="r" values="6;11;6" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.22;0.05;0.22" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <ellipse cx="0" cy="9" rx="11" ry="2.4" fill="#0F4732" opacity="0.12" />
                <circle cx="-8" cy="5" r="3.6" fill="#14241D" /><circle cx="-8" cy="5" r="1.5" fill="#EAF4EF" />
                <circle cx="8" cy="5" r="3.6" fill="#14241D" /><circle cx="8" cy="5" r="1.5" fill="#EAF4EF" />
                <path d="M-8 5 L-3 -1 L6 -1 L8 5" fill="none" stroke="#1B6B4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="-6" y="-3" width="9" height="3.4" rx="1.6" fill="#1B6B4A" />
                <path d="M6 -1 L9 -4" stroke="#1B6B4A" strokeWidth="2" strokeLinecap="round" />
                {/* penumpang (belakang, amber) */}
                <circle cx="-3" cy="-8" r="2.8" fill="#E8963A" />
                <rect x="-5.2" y="-6" width="4.4" height="5" rx="1.8" fill="#E8963A" />
                {/* driver (depan, forest) */}
                <circle cx="3.2" cy="-8" r="2.8" fill="#0F4732" />
                <rect x="1.2" y="-6" width="4.4" height="5" rx="1.8" fill="#0F4732" />
                <animateMotion dur="7s" repeatCount="indefinite" rotate="0">
                  <mpath href="#bl-route" />
                </animateMotion>
              </g>
            </svg>
            <p className="mt-3 text-center text-[12px] font-semibold text-[var(--bl-muted)]">Ilustrasi rute · Takoma → Kantor Walikota</p>
          </div>
        </div>
      </div>
    </section>
  );
}
