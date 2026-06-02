'use client';

/**
 * TeraLoka — OpeningBalanceBuilder (Saldo Awal full, per entitas)
 * Sesi Financial Polish (2 Jun 2026) · WAJAH
 * ────────────────────────────────────────────────────────────────
 * Template terstruktur: Aset (Db) + Liabilitas (Cr), Ekuitas/Aset Neto
 * AUTO-balancing (Σaset − Σliab). Per entitas terpisah (PT / Yayasan).
 * Submit → POST /money/opening-balance/full (otak validasi balance+perspektif).
 *
 * PT      : aset 1110/1111/1120/1112/1113 · liab 2510/2511/2601/2602/2701 · ekuitas 3101 Modal
 * Yayasan : aset 1102/1201 · liab 2310 · aset-neto 3601 (ISAK 35)
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Lock, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

type Entity = 'pt' | 'yayasan';

interface AcctOpt { code: string; label: string }

// ── Akun per entitas ──────────────────────────────────────────────
const ACCOUNTS: Record<Entity, { asset: AcctOpt[]; liability: AcctOpt[]; equity: AcctOpt }> = {
  pt: {
    asset: [
      { code: '1110', label: 'Kas Rekening Owner (Amar Radjab)' },
      { code: '1111', label: 'Kas Rekening Istri (Risnawati Yunus)' },
      { code: '1120', label: 'Kas Kecil (Petty Cash)' },
      { code: '1112', label: 'Kas PT — Bank Utama (saat formasi)' },
      { code: '1113', label: 'Kas PT — Bank Sekunder (saat formasi)' },
    ],
    liability: [
      { code: '2510', label: 'Utang ke Owner — Amar Radjab' },
      { code: '2511', label: 'Utang ke Owner — Risnawati Yunus' },
      { code: '2601', label: 'Utang Bank' },
      { code: '2602', label: 'Utang Bank Jangka Panjang' },
      { code: '2701', label: 'Utang Usaha' },
    ],
    equity: { code: '3101', label: 'Modal Pemilik / Modal Saham' },
  },
  yayasan: {
    asset: [
      { code: '1102', label: 'Kas Rekening Yayasan' },
      { code: '1201', label: 'Piutang Fee Partner' },
    ],
    liability: [
      { code: '2310', label: 'Utang Yayasan' },
    ],
    equity: { code: '3601', label: 'Aset Neto Tanpa Pembatasan' },
  },
};

interface Row { id: string; account_code: string; amount: string }
const newRow = (code: string): Row => ({ id: Math.random().toString(36).slice(2), account_code: code, amount: '' });
const formatRp = (n: number) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

export default function OpeningBalanceBuilder() {
  const { token } = useAuth();
  const [entity, setEntity] = useState<Entity>('pt');
  const [assetRows, setAssetRows] = useState<Row[]>([newRow(ACCOUNTS.pt.asset[0].code)]);
  const [liabRows,  setLiabRows]  = useState<Row[]>([]);
  const [description, setDescription] = useState('');
  const [txDate, setTxDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const cfg = ACCOUNTS[entity];

  // Ganti entitas → reset baris ke akun default entitas tsb
  const switchEntity = (e: Entity) => {
    setEntity(e);
    setAssetRows([newRow(ACCOUNTS[e].asset[0].code)]);
    setLiabRows([]);
    setResult(null);
  };

  const totalAsset = useMemo(() => assetRows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [assetRows]);
  const totalLiab  = useMemo(() => liabRows.reduce((s, r) => s + (Number(r.amount) || 0), 0), [liabRows]);
  const equityBalancing = totalAsset - totalLiab;  // Aset Neto / Modal (auto)

  const equityLabel = entity === 'yayasan' ? 'Aset Neto (auto)' : 'Modal (auto)';
  const valid = totalAsset > 0 && equityBalancing >= 0 &&
                assetRows.every(r => r.account_code && Number(r.amount) > 0) &&
                liabRows.every(r => r.account_code && Number(r.amount) > 0);

  const setRow = (rows: Row[], setRows: (r: Row[]) => void, id: string, patch: Partial<Row>) =>
    setRows(rows.map(r => r.id === id ? { ...r, ...patch } : r));

  const handleSubmit = async () => {
    if (submitting || !valid) return;
    if (equityBalancing < 0) { setResult({ ok: false, msg: 'Liabilitas > Aset — ekuitas negatif, cek lagi.' }); return; }
    setSubmitting(true);
    setResult(null);
    try {
      const lines = [
        ...assetRows.map(r => ({ account_code: r.account_code, side: 'debit' as const, amount: Number(r.amount) })),
        ...liabRows.map(r  => ({ account_code: r.account_code, side: 'credit' as const, amount: Number(r.amount) })),
        { account_code: cfg.equity.code, side: 'credit' as const, amount: equityBalancing },
      ];
      const res = await fetch(`${API}/money/opening-balance/full`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perspective: entity,
          description: description || `Saldo awal ${entity.toUpperCase()}`,
          transaction_date: txDate || undefined,
          lines,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Gagal simpan');
      setResult({ ok: true, msg: `Saldo awal tercatat: ${json.data.entry_number}. Refresh laporan untuk lihat di Neraca.` });
      setAssetRows([newRow(cfg.asset[0].code)]);
      setLiabRows([]);
      setDescription('');
      setTxDate('');
    } catch (err: any) {
      setResult({ ok: false, msg: err.message || 'Gagal simpan' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none focus:border-ads/50';

  return (
    <div className="max-w-[820px]">
      {/* Header + warning */}
      <div className="rounded-xl border border-border bg-surface p-[18px] mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-ads" />
          <p className="text-[15px] font-bold text-text">Catat Saldo Awal (Posisi Awal Entitas)</p>
        </div>
        <p className="text-[12px] text-text-muted leading-relaxed">
          Catat posisi keuangan awal saat entitas mulai operasi: aset yang sudah ada, utang (kalau ada),
          dan ekuitas/aset neto sebagai penyeimbang. Per entitas terpisah — PT &amp; Yayasan beda buku.
        </p>
        <div className="mt-3 bg-ads/8 border border-ads/25 rounded-lg px-3 py-2.5 flex gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-ads shrink-0 mt-0.5" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            <span className="font-bold text-text">Sekali catat, permanen.</span> Isi angka REAL saat buka rekening
            entitas resmi (pra-formasi: hati-hati, jangan asal). Modal/Aset Neto dihitung otomatis = Σaset − Σliabilitas.
          </p>
        </div>
      </div>

      {/* Toggle entitas */}
      <div className="flex gap-2 mb-4">
        {(['pt', 'yayasan'] as Entity[]).map(e => (
          <button key={e} onClick={() => switchEntity(e)}
            className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-colors ${
              entity === e ? 'bg-ads text-white' : 'bg-surface-muted text-text-muted hover:text-text'
            }`}>
            {e === 'pt' ? 'PT TeraLoka' : 'Yayasan TeraLoka'}
          </button>
        ))}
      </div>

      {/* ASET (Debit) */}
      <Section title="Aset" hint="Kas, piutang — yang dimiliki entitas" total={totalAsset} formatRp={formatRp}>
        {assetRows.map(r => (
          <div key={r.id} className="flex gap-2 items-center">
            <select value={r.account_code} onChange={e => setRow(assetRows, setAssetRows, r.id, { account_code: e.target.value })}
              className={`${inputCls} flex-1`}>
              {cfg.asset.map(a => <option key={a.code} value={a.code}>{a.label} ({a.code})</option>)}
            </select>
            <input type="number" value={r.amount} placeholder="0"
              onChange={e => setRow(assetRows, setAssetRows, r.id, { amount: e.target.value })}
              className={`${inputCls} w-[150px] text-right`} />
            <button onClick={() => setAssetRows(assetRows.length > 1 ? assetRows.filter(x => x.id !== r.id) : assetRows)}
              className="p-2 text-text-subtle hover:text-status-critical transition-colors" title="Hapus baris">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setAssetRows([...assetRows, newRow(cfg.asset[0].code)])}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-ads hover:text-ads/80 transition-colors mt-1">
          <Plus className="w-3.5 h-3.5" /> Tambah aset
        </button>
      </Section>

      {/* LIABILITAS (Credit) */}
      <Section title="Liabilitas" hint="Utang — opsional, kosongkan kalau murni modal sendiri" total={totalLiab} formatRp={formatRp}>
        {liabRows.length === 0 && (
          <p className="text-[12px] text-text-subtle italic">Belum ada utang. Saldo awal murni dari modal/aset neto sendiri.</p>
        )}
        {liabRows.map(r => (
          <div key={r.id} className="flex gap-2 items-center">
            <select value={r.account_code} onChange={e => setRow(liabRows, setLiabRows, r.id, { account_code: e.target.value })}
              className={`${inputCls} flex-1`}>
              {cfg.liability.map(a => <option key={a.code} value={a.code}>{a.label} ({a.code})</option>)}
            </select>
            <input type="number" value={r.amount} placeholder="0"
              onChange={e => setRow(liabRows, setLiabRows, r.id, { amount: e.target.value })}
              className={`${inputCls} w-[150px] text-right`} />
            <button onClick={() => setLiabRows(liabRows.filter(x => x.id !== r.id))}
              className="p-2 text-text-subtle hover:text-status-critical transition-colors" title="Hapus baris">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setLiabRows([...liabRows, newRow(cfg.liability[0].code)])}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-ads hover:text-ads/80 transition-colors mt-1">
          <Plus className="w-3.5 h-3.5" /> Tambah utang
        </button>
      </Section>

      {/* EKUITAS auto (balancing) */}
      <div className="rounded-xl border border-border bg-surface-muted/40 p-[18px] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-text">{cfg.equity.label}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{equityLabel} = Σaset − Σliabilitas (penyeimbang, akun {cfg.equity.code})</p>
          </div>
          <p className={`text-[18px] font-extrabold tabular-nums ${equityBalancing < 0 ? 'text-status-critical' : 'text-text'}`}>
            {formatRp(equityBalancing)}
          </p>
        </div>
        {equityBalancing < 0 && (
          <p className="text-[11px] text-status-critical mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Liabilitas melebihi aset — ekuitas negatif, cek input.
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] font-semibold text-text-muted mb-1">Deskripsi</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Modal awal disetor saat buka rekening" className={`${inputCls} w-full`} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text-muted mb-1">Tanggal (opsional)</label>
          <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className={`${inputCls} w-full`} />
        </div>
      </div>

      {/* Preview balance + submit */}
      <div className="rounded-xl border border-border bg-surface p-[18px]">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <div className="text-[12px] text-text-muted">
            Total Debit (Aset): <span className="font-bold text-text tabular-nums">{formatRp(totalAsset)}</span>
            <span className="mx-2">·</span>
            Total Kredit (Liab + Ekuitas): <span className="font-bold text-text tabular-nums">{formatRp(totalLiab + equityBalancing)}</span>
          </div>
          <span className="flex items-center gap-1 text-[12px] font-bold text-status-healthy">
            <CheckCircle2 className="w-4 h-4" /> Seimbang
          </span>
        </div>

        {result && (
          <div className={`mb-3 rounded-lg px-3 py-2.5 text-[12px] flex items-start gap-2 ${
            result.ok ? 'bg-status-healthy/10 text-status-healthy border border-status-healthy/25'
                      : 'bg-status-critical/10 text-status-critical border border-status-critical/25'}`}>
            {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{result.msg}</span>
          </div>
        )}

        <button onClick={handleSubmit} disabled={!valid || submitting}
          className="w-full py-2.5 bg-[#1B6B4A] hover:bg-[#155539] rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Menyimpan…' : `Catat Saldo Awal ${entity === 'pt' ? 'PT' : 'Yayasan'}`}
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, total, formatRp, children }: any) {
  return (
    <div className="rounded-xl border border-border bg-surface p-[18px] mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[13px] font-bold text-text">{title}</p>
          <p className="text-[11px] text-text-muted mt-0.5">{hint}</p>
        </div>
        <p className="text-[14px] font-bold text-text tabular-nums">{formatRp(total)}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
