const STATS = [
  { num: '450', suffix: '+', label: 'Mitra Terdaftar', color: '#E8963A' },
  { num: '12', suffix: 'k', label: 'Pengguna Aktif', color: '#0891B2' },
  { num: '85', suffix: '', label: 'Rute Penyeberangan', color: '#fff' },
  { num: '2.5', suffix: 'k', label: 'Laporan Diselesaikan', color: '#E8963A' },
]

export default function StatsDark() {
  return (
    <section className="stats-dark-bg relative overflow-hidden py-16 px-6">
      {/* Glow orbs */}
      <div
        className="absolute -top-20 -right-20 w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{ background: 'rgba(8,145,178,0.15)', filter: 'blur(80px)' }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{ background: 'rgba(53,37,205,0.15)', filter: 'blur(80px)' }}
      />

      <div className="max-w-[1200px] mx-auto relative z-10">
        {/* Head */}
        <div className="text-center mb-11">
          <h2
            className="font-sora font-extrabold text-white mb-2"
            style={{ fontSize: 'clamp(22px, 3.5vw, 36px)' }}
          >
            Kepercayaan Warga Maluku Utara
          </h2>
          <p className="text-[14px]" style={{ color: 'rgba(195,192,255,0.7)' }}>
            Platform digital lokal yang tumbuh bersama komunitas
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="text-center rounded-[18px]"
              style={{
                padding: '26px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="font-sora font-extrabold text-white mb-1.5"
                style={{ fontSize: 36, letterSpacing: '-0.03em' }}
              >
                {stat.num}
                <span style={{ color: stat.color }}>{stat.suffix}</span>
              </div>
              <div
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(195,192,255,0.6)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
