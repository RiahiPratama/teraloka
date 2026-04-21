'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  HandHeart, Coins, Briefcase, Calculator,
  ArrowRight, Info, Sparkles, ScrollText, Scale,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// SYARIAH CONSTANTS — Fixed by Islamic law, tidak dapat diedit
// ══════════════════════════════════════════════════════════════
const FITRAH_KG_PER_JIWA = 2.5;   // 2.5 kg beras per jiwa (ijma)
const NISAB_EMAS_GRAM = 85;       // Nisab = 85 gram emas
const ZAKAT_RATE = 0.025;         // 2.5%

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════
type ZakatConfig = {
  harga_beras_per_kg: number;
  harga_emas_per_gram: number;
};

type Props = {
  config: ZakatConfig;
  updatedAt?: string | null;
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function formatRp(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function parseRp(s: string): number {
  return Number(s.replace(/\D/g, '')) || 0;
}

function formatUpdateDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ══════════════════════════════════════════════════════════════
export default function ZakatCalculator({ config, updatedAt }: Props) {
  const [activeTab, setActiveTab] = useState<'fitrah' | 'maal' | 'penghasilan'>('fitrah');

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-10 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#EC4899]/10 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-[#F472B6]/10 blur-2xl"></div>

        <div className="relative mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={24} className="text-[#F472B6]" strokeWidth={2.2} />
            <p className="text-xs font-bold text-[#F472B6] uppercase tracking-widest">BADONASI · ZAKAT</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            Kalkulator Zakat
          </h1>
          <p className="text-sm md:text-base text-[#95d3ba] leading-relaxed max-w-md">
            Hitung kewajiban zakat fitrah, maal, atau penghasilan sesuai syariah. Cepat, akurat, dan privat.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-lg px-4 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-2 grid grid-cols-3 gap-1">
          <TabButton active={activeTab === 'fitrah'} onClick={() => setActiveTab('fitrah')} icon={HandHeart} label="Fitrah" />
          <TabButton active={activeTab === 'maal'} onClick={() => setActiveTab('maal')} icon={Coins} label="Maal" />
          <TabButton active={activeTab === 'penghasilan'} onClick={() => setActiveTab('penghasilan')} icon={Briefcase} label="Penghasilan" />
        </div>

        {/* Calculator */}
        <div className="mt-4">
          {activeTab === 'fitrah' && <ZakatFitrah config={config} />}
          {activeTab === 'maal' && <ZakatMaal config={config} />}
          {activeTab === 'penghasilan' && <ZakatPenghasilan config={config} />}
        </div>

        {/* Edukasi */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ScrollText size={16} className="text-[#003526]" />
            Tentang Zakat
          </h2>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <div>
              <p className="font-semibold text-gray-900 mb-1">🤲 Zakat Fitrah</p>
              <p className="text-[13px] text-gray-600">
                Wajib bagi setiap Muslim menjelang Hari Raya Idul Fitri. Besarannya {FITRAH_KG_PER_JIWA} kg beras per jiwa, atau senilai uang.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">💰 Zakat Maal (Harta)</p>
              <p className="text-[13px] text-gray-600">
                Wajib jika harta (tabungan, emas, investasi, piutang) sudah mencapai nisab ({NISAB_EMAS_GRAM} gram emas) dan dimiliki selama 1 tahun hijriyah (haul). Kadar zakat: 2,5%.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">💼 Zakat Penghasilan</p>
              <p className="text-[13px] text-gray-600">
                Wajib jika total penghasilan setahun melebihi nisab ({NISAB_EMAS_GRAM} gram emas). Bisa dibayar bulanan dari penghasilan bersih × 2,5%.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
            <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Kalkulator ini adalah panduan umum. Untuk penghitungan detail atau kasus khusus, disarankan konsultasi dengan ustadz setempat atau lembaga zakat resmi.
            </p>
          </div>
        </div>

        {/* Harga Acuan */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Scale size={14} className="text-gray-500" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Harga Acuan</p>
            </div>
            {updatedAt && (
              <span className="text-[10px] text-gray-400 font-medium">
                Diperbarui {formatUpdateDate(updatedAt)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">Beras / kg</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{formatRp(config.harga_beras_per_kg)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider">Emas / gram</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{formatRp(config.harga_emas_per_gram)}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic">
            Harga acuan diperbarui oleh tim TeraLoka secara berkala. Untuk harga terkini, disarankan cek langsung di pasar atau lembaga zakat setempat.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB BUTTON
// ══════════════════════════════════════════════════════════════
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white shadow-sm'
          : 'text-gray-600 hover:bg-pink-50'
      }`}
    >
      <Icon size={14} strokeWidth={2.4} />
      {label}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// ZAKAT FITRAH
// ══════════════════════════════════════════════════════════════
function ZakatFitrah({ config }: { config: ZakatConfig }) {
  const [jiwa, setJiwa] = useState(1);

  const perJiwa = FITRAH_KG_PER_JIWA * config.harga_beras_per_kg;
  const total = perJiwa * jiwa;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <HandHeart size={18} className="text-[#EC4899]" />
        <h2 className="text-base font-bold text-gray-900">Zakat Fitrah</h2>
      </div>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        Wajib untuk setiap Muslim sebelum shalat Idul Fitri — termasuk bayi baru lahir.
      </p>

      <div className="mb-5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
          Jumlah Jiwa (Anggota Keluarga)
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setJiwa(Math.max(1, jiwa - 1))}
            className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-700 transition-colors"
          >
            −
          </button>
          <input
            type="number"
            value={jiwa}
            onChange={e => setJiwa(Math.max(1, Number(e.target.value) || 1))}
            min={1}
            className="flex-1 text-center text-2xl font-extrabold text-[#003526] py-2 rounded-xl border border-gray-200 outline-none focus:border-[#EC4899]"
          />
          <button
            onClick={() => setJiwa(jiwa + 1)}
            className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-700 transition-colors"
          >
            +
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          Hitung semua: diri sendiri + pasangan + anak + anggota keluarga yang ditanggung
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Beras per jiwa</span>
          <span className="font-bold text-gray-900">{FITRAH_KG_PER_JIWA} kg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Harga beras / kg</span>
          <span className="font-bold text-gray-900">{formatRp(config.harga_beras_per_kg)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Setara per jiwa</span>
          <span className="font-bold text-[#003526]">{formatRp(perJiwa)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="text-sm font-bold text-gray-900">{jiwa} jiwa × {formatRp(perJiwa)}</span>
        </div>
      </div>

      <ResultCard
        label="Total Zakat Fitrah"
        amount={total}
        note={`Untuk ${jiwa} ${jiwa === 1 ? 'jiwa' : 'jiwa (anggota keluarga)'}`}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ZAKAT MAAL
// ══════════════════════════════════════════════════════════════
function ZakatMaal({ config }: { config: ZakatConfig }) {
  const [tabungan, setTabungan] = useState('');
  const [emasGram, setEmasGram] = useState('');
  const [investasi, setInvestasi] = useState('');
  const [piutang, setPiutang] = useState('');
  const [hutang, setHutang] = useState('');

  const { totalHarta, nisab, wajibZakat, zakat, diatasNisab } = useMemo(() => {
    const tab = parseRp(tabungan);
    const emas = (Number(emasGram) || 0) * config.harga_emas_per_gram;
    const inv = parseRp(investasi);
    const piu = parseRp(piutang);
    const hut = parseRp(hutang);

    const total = tab + emas + inv + piu - hut;
    const nis = NISAB_EMAS_GRAM * config.harga_emas_per_gram;
    const wajib = total >= nis;
    const z = wajib ? total * ZAKAT_RATE : 0;

    return {
      totalHarta: total,
      nisab: nis,
      wajibZakat: wajib,
      zakat: z,
      diatasNisab: wajib,
    };
  }, [tabungan, emasGram, investasi, piutang, hutang, config.harga_emas_per_gram]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Coins size={18} className="text-[#EC4899]" />
        <h2 className="text-base font-bold text-gray-900">Zakat Maal (Harta)</h2>
      </div>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        Wajib jika total harta telah mencapai nisab ({NISAB_EMAS_GRAM} gram emas = <strong>{formatRp(nisab)}</strong>) dan telah dimiliki selama 1 tahun hijriyah.
      </p>

      <div className="space-y-4 mb-5">
        <InputField
          label="Tabungan / Deposito"
          value={tabungan}
          onChange={v => setTabungan(formatRp(parseRp(v)).replace('Rp ', ''))}
          prefix="Rp"
          placeholder="0"
          hint="Total semua rekening"
        />

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Emas / Perhiasan Emas
          </label>
          <div className="relative">
            <input
              type="number"
              value={emasGram}
              onChange={e => setEmasGram(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#EC4899] pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">gram</span>
          </div>
          {Number(emasGram) > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">≈ {formatRp(Number(emasGram) * config.harga_emas_per_gram)}</p>
          )}
        </div>

        <InputField
          label="Investasi (Saham, Reksadana, Sukuk)"
          value={investasi}
          onChange={v => setInvestasi(formatRp(parseRp(v)).replace('Rp ', ''))}
          prefix="Rp"
          placeholder="0"
        />

        <InputField
          label="Piutang (yang pasti kembali)"
          value={piutang}
          onChange={v => setPiutang(formatRp(parseRp(v)).replace('Rp ', ''))}
          prefix="Rp"
          placeholder="0"
          hint="Uang yang dipinjamkan & yakin balik"
        />

        <InputField
          label="(−) Hutang"
          value={hutang}
          onChange={v => setHutang(formatRp(parseRp(v)).replace('Rp ', ''))}
          prefix="Rp"
          placeholder="0"
          hint="Hutang yang jatuh tempo tahun ini"
        />
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Harta (setelah dikurangi hutang)</span>
          <span className="font-bold text-gray-900">{formatRp(totalHarta)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Nisab (85 gr emas)</span>
          <span className="font-bold text-gray-900">{formatRp(nisab)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className={`text-sm font-bold ${diatasNisab ? 'text-emerald-700' : 'text-gray-500'}`}>
            {diatasNisab ? '✓ Mencapai nisab' : '✗ Belum mencapai nisab'}
          </span>
        </div>
      </div>

      {!wajibZakat ? (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
          <p className="text-sm font-bold text-blue-900 mb-1">Belum Wajib Zakat</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Total harta belum mencapai nisab {formatRp(nisab)}. Jika sudah mencapai nisab dan genap 1 tahun hijriyah, kewajiban zakat berlaku.
          </p>
        </div>
      ) : (
        <ResultCard
          label="Zakat Maal Wajib (2,5%)"
          amount={zakat}
          note={`dari total harta ${formatRp(totalHarta)}`}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ZAKAT PENGHASILAN
// ══════════════════════════════════════════════════════════════
function ZakatPenghasilan({ config }: { config: ZakatConfig }) {
  const [gajiBulanan, setGajiBulanan] = useState('');
  const [penghasilanLain, setPenghasilanLain] = useState('');

  const { totalBulanan, totalTahunan, nisab, wajib, zakatBulanan, zakatTahunan } = useMemo(() => {
    const g = parseRp(gajiBulanan);
    const l = parseRp(penghasilanLain);
    const bulan = g + l;
    const tahun = bulan * 12;
    const nis = NISAB_EMAS_GRAM * config.harga_emas_per_gram;
    const wa = tahun >= nis;
    const zt = wa ? tahun * ZAKAT_RATE : 0;
    const zb = zt / 12;
    return {
      totalBulanan: bulan,
      totalTahunan: tahun,
      nisab: nis,
      wajib: wa,
      zakatBulanan: zb,
      zakatTahunan: zt,
    };
  }, [gajiBulanan, penghasilanLain, config.harga_emas_per_gram]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Briefcase size={18} className="text-[#EC4899]" />
        <h2 className="text-base font-bold text-gray-900">Zakat Penghasilan</h2>
      </div>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        Dikeluarkan dari penghasilan bulanan jika total setahun melebihi nisab (<strong>{formatRp(nisab)}</strong>). Kadar: 2,5%.
      </p>

      <div className="space-y-4 mb-5">
        <InputField
          label="Gaji / Pendapatan Utama per Bulan"
          value={gajiBulanan}
          onChange={v => setGajiBulanan(formatRp(parseRp(v)).replace('Rp ', ''))}
          prefix="Rp"
          placeholder="0"
          hint="Penghasilan bersih (setelah potongan wajib)"
        />

        <InputField
          label="Penghasilan Lain per Bulan"
          value={penghasilanLain}
          onChange={v => setPenghasilanLain(formatRp(parseRp(v)).replace('Rp ', ''))}
          prefix="Rp"
          placeholder="0"
          hint="Bonus, sewa, usaha sampingan, dll"
        />
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Total per bulan</span>
          <span className="font-bold text-gray-900">{formatRp(totalBulanan)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total per tahun (×12)</span>
          <span className="font-bold text-gray-900">{formatRp(totalTahunan)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Nisab (85 gr emas)</span>
          <span className="font-bold text-gray-900">{formatRp(nisab)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className={`text-sm font-bold ${wajib ? 'text-emerald-700' : 'text-gray-500'}`}>
            {wajib ? '✓ Mencapai nisab' : '✗ Belum mencapai nisab'}
          </span>
        </div>
      </div>

      {!wajib ? (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
          <p className="text-sm font-bold text-blue-900 mb-1">Belum Wajib Zakat Penghasilan</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Total penghasilan setahun belum mencapai nisab. Zakat belum diwajibkan dari penghasilan.
          </p>
        </div>
      ) : (
        <>
          <ResultCard
            label="Zakat Penghasilan per Bulan"
            amount={zakatBulanan}
            note="Dibayar tiap bulan"
          />
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-start gap-2">
            <Sparkles size={14} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Atau bayar <strong>sekaligus tahunan</strong>: {formatRp(zakatTahunan)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════
function InputField({ label, value, onChange, prefix, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  prefix?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 py-3 text-sm outline-none focus:border-[#EC4899] ${prefix ? 'pl-12 pr-4' : 'px-4'}`}
        />
      </div>
      {hint && (
        <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

function ResultCard({ label, amount, note }: { label: string; amount: number; note?: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] p-5 text-white relative overflow-hidden">
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#EC4899]/20 blur-2xl"></div>

      <div className="relative">
        <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-white mb-1 tracking-tight">
          {formatRp(amount)}
        </p>
        {note && (
          <p className="text-xs text-[#95d3ba]">{note}</p>
        )}

        <Link
          href="/fundraising"
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] py-3 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
        >
          <HandHeart size={16} />
          Tunaikan via BADONASI
          <ArrowRight size={14} className="opacity-80" />
        </Link>

        <p className="mt-2 text-center text-[10px] text-[#95d3ba]/80">
          Pilih campaign kemanusiaan yang sesuai niat zakatmu
        </p>
      </div>
    </div>
  );
}
