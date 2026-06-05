import { UserPlus, UserCheck, Check } from "lucide-react";
import { DRIVER_URL } from "./balaju-links";

export function DriverSection() {
  return (
    <section id="driver" className="px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="bl-grain relative overflow-hidden rounded-[34px] bg-[var(--bl-forest)] text-white">
          <svg className="absolute -right-12 -top-12 h-80 w-80 opacity-20" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#E8963A" /></svg>
          <div className="relative z-10 grid grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:px-14">
            <div className="bl-reveal">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--bl-amber)]">Kemitraan</h2>
              <p className="mt-3 text-4xl font-black leading-tight lg:text-5xl">Jadi mitra driver <span className="text-[var(--bl-amber)]">BALAJU.</span></p>
              <p className="mt-4 leading-relaxed text-white/75">Penghasilan utuh tanpa potongan, jadwal fleksibel, dan komunitas driver lokal yang saling dukung di tanah kelahiranmu.</p>
              <div className="mt-8 space-y-3">
                {["Pendaftaran gratis", "Pendapatan utuh, fee transparan", "Jadwal fleksibel, tanpa target harian", "Bebas terima atau tolak orderan"].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15"><Check className="h-[15px] w-[15px] text-[var(--bl-amber)]" /></span>
                    <span className="text-sm font-semibold">{t}</span>
                  </div>
                ))}
              </div>
              <a href={DRIVER_URL} className="bl-shadow-lift mt-9 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-[var(--bl-forest-d)] transition hover:scale-105 active:scale-95">
                <UserPlus className="h-5 w-5" /> Daftar Jadi Driver
              </a>
            </div>
            <div className="bl-reveal hidden lg:block" style={{ transitionDelay: "100ms" }}>
              <div className="rounded-[24px] border border-white/12 bg-white/[0.07] p-8 backdrop-blur">
                <UserCheck className="h-12 w-12 text-[var(--bl-amber)]" />
                <p className="mt-4 text-2xl font-extrabold leading-snug">&ldquo;Penghasilan saya utuh — yang saya antar, itu yang saya terima.&rdquo;</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-white/45">Prinsip kemitraan BALAJU</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
