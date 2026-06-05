import { MapPin, Receipt, Bike } from "lucide-react";

export function CaraPesanSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-5">
        <div className="bl-reveal mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--bl-forest)]">Cara Pesan</h2>
          <p className="mt-3 text-4xl font-black text-[var(--bl-forest-d)] lg:text-5xl">Tiga langkah, harga jelas dari awal.</p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {([
            [MapPin, "1", "Tentukan rute", "Masukkan titik jemput & tujuan. Cek tarif tanpa perlu login dulu."],
            [Receipt, "2", "Lihat rincian jujur", "Kamu bayar, driver terima utuh, fee BALAJU — transparan sebelum pesan."],
            [Bike, "3", "Pesan & dijemput", "Driver terdekat menjemput. Pantau perjalanan sampai tujuan."],
          ] as const).map(([Icon, no, title, desc], i) => (
            <div key={no} className="bl-reveal bl-shadow-soft relative rounded-[22px] border border-[var(--bl-line)] bg-white p-7" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="bl-display bl-shadow-lift absolute -top-5 left-7 grid h-11 w-11 place-items-center rounded-full bg-[var(--bl-forest)] text-lg font-extrabold text-white">{no}</span>
              <Icon className="mt-5 h-8 w-8 text-[var(--bl-forest)]" />
              <h3 className="mt-4 text-xl font-extrabold text-[var(--bl-forest-d)]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--bl-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
