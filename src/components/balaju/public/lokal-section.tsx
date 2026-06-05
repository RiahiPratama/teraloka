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
        <div className="bl-reveal" style={{ transitionDelay: "100ms" }}>
          <div className="bl-grain bl-shadow-lift relative overflow-hidden rounded-[30px] border border-[var(--bl-line)] bg-white p-8">
            <svg viewBox="0 0 320 220" className="w-full">
              <rect width="320" height="220" rx="18" fill="#EAF4EF" />
              <path d="M0 165 Q90 120 165 152 T320 148 V220 H0 Z" fill="#0891B2" opacity="0.16" />
              <path d="M150 70 L185 120 L115 120 Z" fill="#1B6B4A" opacity="0.16" />
              <circle cx="120" cy="100" r="10" fill="#1B6B4A" />
              <circle cx="120" cy="100" r="18" fill="#1B6B4A" opacity="0.16" />
              <text x="120" y="84" fontFamily="Urbanist" fontSize="13" fontWeight="800" fill="#0F4732" textAnchor="middle">Ternate</text>
              <circle cx="200" cy="128" r="5" fill="#E8963A" />
              <text x="200" y="148" fontFamily="Urbanist" fontSize="9" fontWeight="700" fill="#5A6B62" textAnchor="middle">Tidore</text>
              <circle cx="246" cy="92" r="5" fill="#E8963A" />
              <text x="246" y="80" fontFamily="Urbanist" fontSize="9" fontWeight="700" fill="#5A6B62" textAnchor="middle">Sofifi</text>
            </svg>
            <p className="mt-4 text-center text-[12px] font-semibold text-[var(--bl-muted)]">Peta ilustratif Maluku Utara</p>
          </div>
        </div>
      </div>
    </section>
  );
}
