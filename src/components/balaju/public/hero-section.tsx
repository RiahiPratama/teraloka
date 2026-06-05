import { Navigation, UserPlus, Calculator, Check, Bike, Car, Package, MapPin, Smartphone } from "lucide-react";
import { ORDER_URL, DRIVER_URL } from "./balaju-links";

export function HeroSection() {
  return (
    <section className="bl-mesh relative overflow-hidden pb-14 pt-3 lg:pt-6">
      <svg className="absolute inset-x-0 bottom-0 -z-0 h-[34%] w-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0 230 Q360 150 720 215 T1440 200 V320 H0 Z" fill="#1B6B4A" opacity="0.05" />
        <path d="M0 270 Q400 200 760 260 T1440 255 V320 H0 Z" fill="#0891B2" opacity="0.07" />
      </svg>

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 lg:grid-cols-12">
        {/* ---- kiri: pesan ---- */}
        <div className="bl-reveal lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--bl-forest-15)] bg-white/70 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--bl-forest-d)] backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-[var(--bl-forest-70)]" />
              <span className="relative h-2 w-2 rounded-full bg-[var(--bl-forest)]" />
            </span>
            Mobilitas lokal TeraLoka · Aktif di Ternate
          </span>

          <h1 className="mt-6 text-[2.6rem] font-black leading-[1.04] text-[var(--bl-forest-d)] sm:text-6xl lg:text-7xl">
            Tarif adil, driver lokal —<br />
            <span className="bl-grad">dibangun untuk Maluku Utara.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--bl-muted)]">
            Ojek dan kurir untuk warga Maluku Utara. Harga jelas sebelum kamu pesan,
            driver terima tarif penuh, dan <strong className="text-[var(--bl-ink)]">kamu yang pilih drivernya.</strong>
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <a href={ORDER_URL} className="bl-shadow-lift inline-flex items-center justify-center gap-2 rounded-full bg-[var(--bl-forest)] px-8 py-4 text-base font-bold text-white transition hover:bg-[var(--bl-forest-d)] active:scale-95">
              <Navigation className="h-5 w-5" /> Pesan Sekarang
            </a>
            <a href={DRIVER_URL} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--bl-forest-25)] bg-white px-8 py-4 text-base font-bold text-[var(--bl-forest-d)] transition hover:border-[var(--bl-forest)]">
              <UserPlus className="h-5 w-5" /> Daftar Driver
            </a>
          </div>
          <a href="#transparansi" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--bl-forest)] transition hover:gap-2.5">
            <Calculator className="h-4 w-4" /> atau cek tarif dulu
          </a>

          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {["Tanpa biaya siluman", "Driver dibayar penuh", "Pilih driver sendiri"].map((t) => (
              <span key={t} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--bl-muted)]">
                <Check className="h-[18px] w-[18px] text-[var(--bl-forest)]" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ---- kanan: mockup app (WAJAH murni, dummy) ---- */}
        <div className="bl-reveal lg:col-span-5" style={{ transitionDelay: "120ms" }}>
          <div className="relative mx-auto max-w-[360px]">
            <div className="bl-tick bl-shadow-lift absolute -left-[27px] -bottom-5 z-20 rounded-2xl bg-[var(--bl-forest-d)] px-4 py-3 text-white">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Driver dapat</div>
              <div className="bl-display text-lg font-extrabold">100% tarif</div>
            </div>

            {/* device frame */}
            <div className="bl-shadow-xl relative overflow-hidden rounded-[36px] border border-[var(--bl-line)] bg-white p-3">
              <div className="rounded-[28px] bg-[var(--bl-cream)] p-4">
                {/* brand row */}
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--bl-forest)] text-white"><Bike className="h-4 w-4" /></span>
                  <div className="leading-none">
                    <div className="bl-display text-sm font-extrabold text-[var(--bl-forest-d)]">BALAJU</div>
                    <div className="text-[10px] text-[var(--bl-muted)]">Jalan Kita, Terhubung.</div>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--bl-line)] bg-white px-2.5 py-1 text-[10px] font-bold text-[var(--bl-forest-d)]"><MapPin className="h-3 w-3 text-[var(--bl-forest)]" /> Ternate</span>
                </div>

                {/* service chips */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {([[Bike, "Ojek", true], [Car, "Mobil", false], [Package, "Kurir", false]] as const).map(([Icon, label, active]) => (
                    <div key={label} className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 ${active ? "border-transparent bg-[var(--bl-forest)] text-white" : "border-[var(--bl-line)] bg-white text-[var(--bl-muted)]"}`}>
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-bold">{label}</span>
                    </div>
                  ))}
                </div>

                {/* rute */}
                <div className="mt-3 flex gap-3 rounded-2xl border border-[var(--bl-line)] bg-white p-3">
                  <div className="flex flex-col items-center pt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--bl-forest)]" />
                    <span className="my-1 h-7 w-px bg-[var(--bl-line)]" />
                    <MapPin className="h-3.5 w-3.5 text-[var(--bl-amber)]" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Jemput</div>
                      <div className="text-xs font-semibold text-[var(--bl-ink)]">Takoma, Ternate</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Tujuan</div>
                      <div className="text-xs font-semibold text-[var(--bl-ink)]">Kantor Wali Kota Ternate</div>
                    </div>
                  </div>
                </div>

                {/* estimasi */}
                <div className="mt-3 rounded-2xl border border-[var(--bl-line)] bg-white p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-[var(--bl-muted)]">Total bayar <span className="font-medium text-[var(--bl-muted)]">· ± 1,5 km</span></span>
                    <span className="bl-display text-2xl font-extrabold text-[var(--bl-forest)]">Rp 11.850</span>
                  </div>
                  <div className="mt-2 space-y-1 border-t border-dashed border-[var(--bl-line)] pt-2 text-[11px]">
                    <div className="flex items-center justify-between text-[var(--bl-muted)]">
                      <span className="flex items-center gap-1"><Bike className="h-3.5 w-3.5 text-[var(--bl-forest)]" /> Driver terima (utuh)</span>
                      <span className="font-semibold text-[var(--bl-ink)]">Rp 10.850</span>
                    </div>
                    <div className="flex items-center justify-between text-[var(--bl-muted)]">
                      <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5 text-[var(--bl-amber)]" /> Fee TeraLoka</span>
                      <span className="font-semibold text-[var(--bl-ink)]">Rp 1.000</span>
                    </div>
                  </div>
                </div>

                {/* CTA (mockup, non-interaktif) */}
                <div className="mt-3 rounded-2xl bg-[var(--bl-forest)] py-3 text-center text-sm font-bold text-white">
                  Pesan Sekarang · Rp 11.850
                </div>
                <p className="mt-2 text-center text-[10px] text-[var(--bl-muted)]">Harga final tampil sebelum kamu pesan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
