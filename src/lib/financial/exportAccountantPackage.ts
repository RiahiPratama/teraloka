/**
 * TeraLoka — Export Paket Akuntan/Grant (Excel multi-sheet)
 * Sesi Financial Polish (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Fetch 8 laporan (sumber SAMA dgn komponen on-screen → angka konsisten),
 * rakit jadi 1 workbook: Ringkasan + 4 PT + 3 Yayasan. Tiap sheet ada
 * header entitas/periode/tgl generate + catatan pra-formasi.
 * Download via Blob (konsisten dgn pola export funding existing).
 */

import * as XLSX from 'xlsx';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

type AOA = (string | number | null)[][];

interface ExportParams {
  token: string;
  period: string;          // '7d' | '30d' | 'all' | 'custom' | dst
  appliedFrom: string;
  appliedTo: string;
  periodLabel: string;
}

const fmt = (n: number) => Math.round(Number(n) || 0);
const GENERATED = () => new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
const PRA_FORMASI = 'Catatan pra-formasi: PT & Yayasan belum berbadan hukum. Dana dikelola sementara di rekening owner, di-earmark per entitas. Migrasi ke rekening & NPWP terpisah saat formasi (Q4 2026/Q1 2027).';

function periodQuery(p: ExportParams): string {
  if (p.period === 'custom' && p.appliedFrom && p.appliedTo) {
    const from = new Date(p.appliedFrom).toISOString();
    const to = new Date(p.appliedTo + 'T23:59:59').toISOString();
    return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }
  return `period=${p.period}`;
}

async function fetchJson(url: string, token: string): Promise<any> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success || !json.data) throw new Error(json.error?.message ?? `Gagal: ${url}`);
  return json.data;
}

// Header rows umum tiap sheet
function sheetHeader(entity: string, report: string, periodLabel: string): AOA {
  return [
    ['TeraLoka — Paket Akuntan'],
    [entity, report],
    [`Periode: ${periodLabel}`, `Digenerate: ${GENERATED()}`],
    [],
  ];
}

// ── Builder per laporan ──
function buildIncomeStatement(d: any, entity: string, revLabel: string, netLabel: string, periodLabel: string): AOA {
  const rows: AOA = sheetHeader(entity, revLabel === 'Penerimaan' ? 'Laporan Aktivitas' : 'Laporan Laba/Rugi', periodLabel);
  rows.push(['Kode', 'Akun', 'Jumlah (Rp)']);
  rows.push([revLabel.toUpperCase(), '', '']);
  for (const r of d.revenue) rows.push([r.account_code, r.account_name, fmt(r.amount)]);
  rows.push(['', `Total ${revLabel}`, fmt(d.total_revenue)]);
  rows.push(['BEBAN', '', '']);
  if (d.expense.length === 0) rows.push(['', 'Belum ada beban tercatat', 0]);
  for (const r of d.expense) rows.push([r.account_code, r.account_name, fmt(r.amount)]);
  rows.push(['', 'Total Beban', fmt(d.total_expense)]);
  rows.push(['', netLabel, fmt(d.net_income)]);
  return rows;
}

function buildBalanceSheet(d: any, entity: string, netoLabel: string, periodLabel: string): AOA {
  const rows: AOA = sheetHeader(entity, 'Neraca / Posisi Keuangan', periodLabel);
  rows.push(['Kode', 'Akun', 'Jumlah (Rp)']);
  rows.push(['ASET', '', '']);
  for (const r of d.assets) rows.push([r.account_code, r.account_name, fmt(r.amount)]);
  rows.push(['', 'Total Aset', fmt(d.total_assets)]);
  rows.push(['LIABILITAS', '', '']);
  if (d.liabilities.length === 0) rows.push(['', 'Tidak ada liabilitas', 0]);
  for (const r of d.liabilities) rows.push([r.account_code, r.account_name, fmt(r.amount)]);
  rows.push(['', 'Total Liabilitas', fmt(d.total_liabilities)]);
  rows.push([netoLabel.toUpperCase(), '', '']);
  for (const r of d.equity) rows.push([r.account_code, r.account_name, fmt(r.amount)]);
  rows.push(['', `Total ${netoLabel}`, fmt(d.total_equity)]);
  rows.push(['', 'Status', d.balanced ? 'SEIMBANG' : 'TIDAK SEIMBANG']);
  return rows;
}

function buildCashFlow(d: any, entity: string, periodLabel: string): AOA {
  const rows: AOA = sheetHeader(entity, 'Laporan Arus Kas', periodLabel);
  rows.push(['Aktivitas', 'Keterangan', 'Jumlah (Rp)']);
  const grp = (title: string, lines: any[], total: number) => {
    rows.push([`Aktivitas ${title}`, '', '']);
    if (!lines || lines.length === 0) rows.push(['', 'Tidak ada arus kas', 0]);
    else for (const l of lines) rows.push(['', l.label, fmt(l.amount)]);
    rows.push(['', `Kas Bersih dari ${title}`, fmt(total)]);
  };
  grp('Operasi', d.operasi, d.total_operasi);
  grp('Investasi', d.investasi, d.total_investasi);
  grp('Pendanaan', d.pendanaan, d.total_pendanaan);
  rows.push(['', 'Kenaikan/Penurunan Kas Bersih', fmt(d.net_cash_flow)]);
  return rows;
}

function buildTrialBalance(d: any, entity: string, periodLabel: string): AOA {
  const rows: AOA = sheetHeader(entity, 'Neraca Saldo (Trial Balance)', periodLabel);
  rows.push(['Kode', 'Akun', 'Debit (Rp)', 'Kredit (Rp)']);
  for (const r of (d.rows ?? d.accounts ?? [])) {
    rows.push([r.account_code, r.account_name, fmt(r.debit), fmt(r.credit)]);
  }
  rows.push(['', 'TOTAL', fmt(d.total_debit), fmt(d.total_credit)]);
  rows.push(['', 'Status', d.balanced ? 'SEIMBANG' : 'TIDAK SEIMBANG']);
  return rows;
}

const RP_FMT = '#,##0;[Red]-#,##0';   // ribuan + merah kalau negatif

function aoaToSheet(rows: AOA): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 42 }, { wch: 20 }, { wch: 20 }];
  // Apply format Rupiah ke semua cell numerik di kolom C (2) & D (3)
  const range = XLSX.utils.decode_range(ws['!ref'] as string);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (const C of [2, 3]) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref];
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = RP_FMT;
      }
    }
  }
  return ws;
}

// ── Download helper (Blob, konsisten pola funding) ──
function downloadBlob(data: BlobPart, mime: string, filename: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ReportType = 'trial-balance' | 'income-statement' | 'balance-sheet' | 'cash-flow';

interface SingleReportParams extends ExportParams {
  reportType: ReportType;
  perspective: 'pt' | 'yayasan';
  format: 'xlsx' | 'csv';
}

const ENTITY_NAME = { pt: 'PT TeraLoka Digital Maluku', yayasan: 'Yayasan TeraLoka Berdaya' } as const;

// Fetch + build 1 laporan → AOA (reuse builder yg sama dgn paket)
async function buildSingleAOA(rp: SingleReportParams): Promise<{ aoa: AOA; label: string }> {
  const q = periodQuery(rp);
  const base = `${API}/money/revenue`;
  const entity = ENTITY_NAME[rp.perspective];
  const noPeriod = rp.reportType === 'trial-balance' || rp.reportType === 'balance-sheet';
  const url = noPeriod
    ? `${base}/${rp.reportType}?perspective=${rp.perspective}`
    : `${base}/${rp.reportType}?perspective=${rp.perspective}&${q}`;
  const d = await fetchJson(url, rp.token);

  switch (rp.reportType) {
    case 'trial-balance':
      return { aoa: buildTrialBalance(d, entity, rp.periodLabel), label: 'Neraca Saldo' };
    case 'income-statement': {
      const isYay = rp.perspective === 'yayasan';
      return {
        aoa: buildIncomeStatement(d, entity, isYay ? 'Penerimaan' : 'Pendapatan', isYay ? 'Surplus/Defisit' : 'Laba/Rugi Bersih', rp.periodLabel),
        label: isYay ? 'Laporan Aktivitas' : 'Laba Rugi',
      };
    }
    case 'balance-sheet': {
      const isYay = rp.perspective === 'yayasan';
      return {
        aoa: buildBalanceSheet(d, entity, isYay ? 'Aset Neto' : 'Ekuitas', rp.periodLabel),
        label: isYay ? 'Posisi Keuangan' : 'Neraca',
      };
    }
    case 'cash-flow':
      return { aoa: buildCashFlow(d, entity, rp.periodLabel), label: 'Arus Kas' };
  }
}

export async function exportSingleReport(rp: SingleReportParams): Promise<void> {
  const { aoa, label } = await buildSingleAOA(rp);
  const ws = aoaToSheet(aoa);
  const prefix = rp.perspective === 'pt' ? 'PT' : 'Yayasan';
  const stamp = new Date().toISOString().slice(0, 10);
  const fnameBase = `TeraLoka-${prefix}-${label.replace(/[\\/\s]+/g, '-')}-${stamp}`;

  if (rp.format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadBlob('\uFEFF' + csv, 'text/csv;charset=utf-8;', `${fnameBase}.csv`);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(out, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${fnameBase}.xlsx`);
  }
}

export async function exportAccountantPackage(p: ExportParams): Promise<void> {
  const q = periodQuery(p);
  const base = `${API}/money/revenue`;

  // Fetch paralel — sumber sama dgn komponen on-screen
  const [ptTB, ptIS, ptBS, ptCF, yIS, yCF, yBS] = await Promise.all([
    fetchJson(`${base}/trial-balance?perspective=pt`, p.token),
    fetchJson(`${base}/income-statement?perspective=pt&${q}`, p.token),
    fetchJson(`${base}/balance-sheet?perspective=pt`, p.token),
    fetchJson(`${base}/cash-flow?perspective=pt&${q}`, p.token),
    fetchJson(`${base}/income-statement?perspective=yayasan&${q}`, p.token),
    fetchJson(`${base}/cash-flow?perspective=yayasan&${q}`, p.token),
    fetchJson(`${base}/balance-sheet?perspective=yayasan`, p.token),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet Ringkasan
  const ringkasan: AOA = [
    ['TeraLoka — Paket Akuntan / Grant'],
    [`Periode: ${p.periodLabel}`],
    [`Digenerate: ${GENERATED()}`],
    [],
    ['CATATAN PRA-FORMASI:'],
    ['PT & Yayasan belum berbadan hukum.'],
    ['Dana dikelola sementara di rekening owner, di-earmark per entitas.'],
    ['NPWP, rekening & laporan pajak terpisah menyusul saat formasi (Q4 2026/Q1 2027).'],
    [],
    ['Entitas', 'Laporan', 'Angka Kunci (Rp)'],
    ['PT TeraLoka Digital Maluku', 'Laba/Rugi (Laba Bersih)', fmt(ptIS.net_income)],
    ['PT TeraLoka Digital Maluku', 'Neraca (Total Aset)', fmt(ptBS.total_assets)],
    ['PT TeraLoka Digital Maluku', 'Arus Kas (Net)', fmt(ptCF.net_cash_flow)],
    ['Yayasan TeraLoka Berdaya', 'Aktivitas (Surplus/Defisit)', fmt(yIS.net_income)],
    ['Yayasan TeraLoka Berdaya', 'Arus Kas (Net)', fmt(yCF.net_cash_flow)],
    ['Yayasan TeraLoka Berdaya', 'Posisi Keuangan (Total Aset)', fmt(yBS.total_assets)],
    [],
    ['Standar', 'PT = akrual double-entry · Yayasan = ISAK 35 nonlaba'],
  ];
  XLSX.utils.book_append_sheet(wb, aoaToSheet(ringkasan), 'Ringkasan');

  // PT sheets
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildTrialBalance(ptTB, 'PT TeraLoka Digital Maluku', p.periodLabel)), 'PT - Neraca Saldo');
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildIncomeStatement(ptIS, 'PT TeraLoka Digital Maluku', 'Pendapatan', 'Laba/Rugi Bersih', p.periodLabel)), 'PT - Laba Rugi');
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildBalanceSheet(ptBS, 'PT TeraLoka Digital Maluku', 'Ekuitas', p.periodLabel)), 'PT - Neraca');
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildCashFlow(ptCF, 'PT TeraLoka Digital Maluku', p.periodLabel)), 'PT - Arus Kas');

  // Yayasan sheets (ISAK 35)
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildIncomeStatement(yIS, 'Yayasan TeraLoka Berdaya', 'Penerimaan', 'Surplus/Defisit', p.periodLabel)), 'Yayasan - Aktivitas');
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildCashFlow(yCF, 'Yayasan TeraLoka Berdaya', p.periodLabel)), 'Yayasan - Arus Kas');
  XLSX.utils.book_append_sheet(wb, aoaToSheet(buildBalanceSheet(yBS, 'Yayasan TeraLoka Berdaya', 'Aset Neto', p.periodLabel)), 'Yayasan - Posisi Keuangan');

  // Download via Blob (pola konsisten dgn export funding)
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `TeraLoka-Paket-Akuntan-${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
