import { Bike, Package, FileText, Car } from "lucide-react";

export function LayananSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-5">
        <div className="bl-reveal mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--bl-forest)]">Layanan</h2>
          <p className="mt-3 text-4xl font-black text-[var(--bl-forest-d)] lg:text-5xl">BALAJU bukan sekadar ojek.</p>
          <p className="mt-3 text-[var(--bl-muted)]">Kami tumbuh bertahap. Yang sudah jalan kami tandai jelas — sisanya menyusul.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bl-reveal bl-shadow-soft rounded-[22px] border-2 border-[var(--bl-forest-30)] bg-white p-6 text-center">
            <Bike className="mx-auto h-9 w-9 text-[var(--bl-forest)]" />
            <h4 className="mt-3 font-extrabold text-[var(--bl-forest-d)]">Ojek Motor</h4>
            <span className="mt-2 inline-block rounded-full bg-[var(--bl-forest)] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">Aktif</span>
          </div>
          {([
            [Package, "Antar Barang"],
            [FileText, "Antar Dokumen"],
            [Car, "Ojek Mobil"],
          ] as const).map(([Icon, name], i) => (
            <div key={name} className="bl-reveal rounded-[22px] border border-dashed border-[var(--bl-line)] bg-white/60 p-6 text-center opacity-80" style={{ transitionDelay: `${i * 70}ms` }}>
              <Icon className="mx-auto h-9 w-9 text-[var(--bl-muted)]" />
              <h4 className="mt-3 font-extrabold text-[var(--bl-muted)]">{name}</h4>
              <span className="mt-2 inline-block rounded-full bg-[var(--bl-cream)] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--bl-muted)]">Segera</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
