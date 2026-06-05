import { Info, User, ArrowRight, Bike } from "lucide-react";

export function TransparansiSection() {
  return (
    <section id="transparansi" className="px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="bl-grain relative overflow-hidden rounded-[34px] bg-[var(--bl-forest-d)] text-white">
          <div className="relative z-10 px-6 py-16 lg:px-14">
            <div className="bl-reveal mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--bl-amber)]">Transparansi</h2>
              <p className="mt-3 text-4xl font-black lg:text-5xl">Setiap rupiah, jelas.</p>
              <p className="mt-4 text-white/65">Kamu tahu persis ke mana uangmu pergi sebelum menekan tombol pesan.</p>
            </div>

            <div className="mt-14 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
              <div className="bl-reveal rounded-[24px] border border-white/10 bg-white/[0.06] p-6 lg:p-8">
                <h3 className="text-2xl font-extrabold">Tarif Ojek Motor · Ternate</h3>
                <div className="mt-6 grid gap-3">
                  {([
                    ["di bawah 1 km", "Rp11.000"],
                    ["± 3 km", "Rp14.500"],
                    ["± 5 km", "Rp18.100"],
                    ["± 8 km", "Rp26.200"],
                  ] as const).map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.05] px-5 py-4">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">{label}</span>
                      <span className="bl-display text-xl font-extrabold">{val}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 flex items-start gap-2 text-[12px] leading-relaxed text-white/65">
                  <Info className="h-[18px] w-[18px] shrink-0 text-[var(--bl-amber)]" />
                  Contoh estimasi. Tarif final dihitung di app berdasarkan titik jemput &amp; tujuan kamu.
                </p>
              </div>

              <div className="bl-reveal bl-shadow-lift rounded-[24px] bg-white p-6 text-[var(--bl-ink)] lg:p-8" style={{ transitionDelay: "100ms" }}>
                <h3 className="text-2xl font-extrabold text-[var(--bl-forest-d)]">Ke mana uangmu pergi</h3>
                <div className="mt-8 flex items-center justify-between">
                  <div className="text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--bl-cream)]"><User className="h-6 w-6 text-[var(--bl-muted)]" /></span>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Kamu bayar</div>
                    <div className="bl-display text-lg font-extrabold">Rp18.100</div>
                  </div>
                  <ArrowRight className="h-6 w-6 text-[var(--bl-forest)]" />
                  <div className="text-center">
                    <span className="bl-shadow-lift mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--bl-forest)] text-white"><Bike className="h-6 w-6" /></span>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--bl-forest)]">Driver utuh</div>
                    <div className="bl-display text-lg font-extrabold text-[var(--bl-forest)]">Rp16.800</div>
                  </div>
                </div>
                <div className="mt-8 rounded-2xl border border-[var(--bl-line)] bg-[var(--bl-cream)] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--bl-muted)]">Fee aplikasi BALAJU</span>
                    <span className="bl-display text-lg font-extrabold text-[var(--bl-forest-d)]">Rp1.300</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[var(--bl-amber)]" style={{ width: "8%" }} /></div>
                  <p className="mt-4 text-[12px] font-medium leading-relaxed text-[var(--bl-muted)]">
                    Fee ± 8% dari tarif, <strong className="text-[var(--bl-forest-d)]">dibayar terpisah oleh penumpang</strong> — bukan dipotong dari penghasilan driver.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
