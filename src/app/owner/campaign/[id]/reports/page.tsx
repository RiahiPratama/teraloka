'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Plus, Trash2, Loader2, AlertCircle,
  FileText, Camera, Receipt, CheckCircle2, HeartHandshake,
  Info,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface LineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface Campaign {
  id: string;
  title: string;
  collected_amount: number;
  status: string;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
}

function parseRupiah(formatted: string): number {
  return Number(formatted.replace(/\D/g, '')) || 0;
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function NewReportPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  // Campaign info
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // Form state
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [amountUsed, setAmountUsed]   = useState('');
  const [lineItems, setLineItems]     = useState<LineItem[]>([]);
  const [photos, setPhotos]           = useState<string[]>([]);
  const [useBreakdown, setUseBreakdown] = useState(false);

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Fetch campaign info ──────────────────────────────────────
  useEffect(() => {
    if (!token || !campaignId) return;
    setLoadingCampaign(true);
    fetch(`${API}/funding/my/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => { if (json.success) setCampaign(json.data); })
      .catch(() => {})
      .finally(() => setLoadingCampaign(false));
  }, [token, campaignId]);

  // ── Line items helpers ───────────────────────────────────────
  function addItem() {
    setLineItems(prev => [
      ...prev,
      { id: Math.random().toString(36).slice(2), name: '', qty: 1, price: 0 },
    ]);
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(prev =>
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  }

  function removeItem(id: string) {
    setLineItems(prev => prev.filter(item => item.id !== id));
  }

  // ── Computed values ──────────────────────────────────────────
  const amountNum      = parseRupiah(amountUsed);
  const breakdownTotal = lineItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const validItems     = lineItems.filter(i => i.name.trim() && i.price > 0);
  const isValid        = title.trim().length >= 5 && amountNum > 0;

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    if (!token || !campaign || !isValid) return;
    setSubmitting(true);
    setError('');

    const payload: Record<string, any> = {
      title:       title.trim(),
      description: description.trim() || undefined,
      amount_used: amountNum,
    };

    if (photos.length > 0) payload.photos = photos;

    if (useBreakdown && validItems.length > 0) {
      payload.items = validItems.map(i => ({
        name:     i.name.trim(),
        qty:      i.qty,
        price:    i.price,
        subtotal: i.qty * i.price,
      }));
    }

    try {
      const res = await fetch(`${API}/funding/my/campaigns/${campaignId}/reports`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        router.replace(`/owner/campaign/${campaignId}`);
      } else {
        setError(json.error?.message ?? 'Gagal mengirim laporan. Coba lagi.');
        setShowConfirm(false);
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Auth / loading guards ────────────────────────────────────
  if (authLoading || loadingCampaign) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#003526]/10 flex items-center justify-center">
            <HeartHandshake size={28} className="text-[#003526]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Login Dulu</h2>
          <button
            onClick={() => router.push(`/login?redirect=/owner/campaign/${campaignId}/reports/new`)}
            className="mt-4 w-full rounded-xl bg-[#003526] px-6 py-3 text-sm font-bold text-white"
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-24">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-6 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#EC4899]/15 blur-3xl -translate-y-1/3 translate-x-1/3" />

        <div className="relative mx-auto max-w-lg">
          <Link
            href={`/owner/campaign/${campaignId}`}
            className="inline-flex items-center gap-1.5 text-[#95d3ba] text-xs mb-3 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            {campaign?.title ?? 'Detail Kampanye'}
          </Link>

          <div className="flex items-start gap-2">
            <FileText size={18} className="text-[#F472B6] mt-0.5 shrink-0" strokeWidth={2.2} />
            <div>
              <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest mb-0.5">
                BADONASI · Laporan Dana
              </p>
              <h1 className="text-base font-extrabold text-white leading-tight">
                Buat Laporan Penggunaan Dana
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-lg px-4 -mt-8 relative z-10 space-y-4">

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-900 mb-1">Transparansi wajib</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Setiap Rp 1.000.000 dana yang digunakan wajib dilaporkan dengan bukti.
              Laporan akan direview admin sebelum tampil ke publik donor.
            </p>
          </div>
        </div>

        {/* ── SECTION 1: Detail Laporan ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt size={13} />
            Detail Laporan
          </h2>

          {/* Judul */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              Judul Laporan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Biaya Pengobatan Tahap 1"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526]"
            />
            {title.length > 0 && title.trim().length < 5 && (
              <p className="text-[11px] text-red-500 mt-1">Minimal 5 karakter</p>
            )}
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Jelaskan ringkasan penggunaan dana..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526] resize-none"
            />
          </div>

          {/* Total Dana */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">
              Total Dana Digunakan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amountUsed}
                onChange={e => setAmountUsed(formatRupiahInput(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003526]/25 focus:border-[#003526]"
              />
            </div>
            {campaign && amountNum > 0 && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                Dana terkumpul:{' '}
                <span className="font-semibold text-gray-600">
                  {formatRupiah(campaign.collected_amount)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* ── SECTION 2: Rincian Pengeluaran ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Rincian Pengeluaran
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Opsional — tapi sangat membantu transparansi
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !useBreakdown;
                setUseBreakdown(next);
                if (next && lineItems.length === 0) addItem();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                useBreakdown
                  ? 'bg-[#003526] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {useBreakdown ? '✓ Aktif' : '+ Tambah'}
            </button>
          </div>

          {useBreakdown && (
            <div className="p-4 space-y-3">
              {lineItems.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  Belum ada item. Klik "+ Tambah Item" di bawah.
                </div>
              ) : (
                lineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 space-y-2.5"
                  >
                    {/* Item header */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Item #{idx + 1}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Nama */}
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Nama barang / kebutuhan"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003526]"
                    />

                    {/* Qty + Harga */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={e => updateItem(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003526]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">
                          Harga Satuan (Rp)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.price || ''}
                          onChange={e => updateItem(item.id, 'price', Number(e.target.value))}
                          placeholder="0"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003526]"
                        />
                      </div>
                    </div>

                    {/* Subtotal */}
                    {item.name.trim() && item.price > 0 && (
                      <div className="flex justify-between items-center text-xs rounded-lg bg-white border border-gray-200 px-3 py-1.5">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-extrabold text-[#003526]">
                          {formatRupiah(item.qty * item.price)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Add item button */}
              <button
                onClick={addItem}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-500 hover:border-[#003526] hover:text-[#003526] transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={13} /> Tambah Item
              </button>

              {/* Breakdown total */}
              {breakdownTotal > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-emerald-700">Total Rincian</p>
                  <p className="text-sm font-extrabold text-emerald-800">
                    {formatRupiah(breakdownTotal)}
                  </p>
                </div>
              )}

              {/* Mismatch warning */}
              {breakdownTotal > 0 && amountNum > 0 && breakdownTotal !== amountNum && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 flex gap-2 items-start">
                  <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Total rincian ({formatRupiah(breakdownTotal)}) berbeda dengan
                    total laporan ({formatRupiah(amountNum)}). Pastikan sudah benar
                    sebelum mengirim.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 3: Foto Bukti ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div>
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              <Camera size={13} />
              Foto Bukti
            </h2>
            <p className="text-[10px] text-gray-400">
              Upload struk, kwitansi, foto penyerahan, atau dokumen bukti lainnya (maks. 5 foto)
            </p>
          </div>

          <ImageUpload
            bucket="campaigns"
            label=""
            maxFiles={5}
            maxSizeMB={5}
            onUpload={(urls: string[]) => setPhotos(urls)}
            existingUrls={photos}
          />

          {photos.length > 0 && (
            <p className="text-xs text-emerald-700 font-semibold">
              ✓ {photos.length} foto bukti tersimpan
            </p>
          )}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 flex gap-2 items-start">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">{error}</p>
          </div>
        )}

        {/* ── Submit button ── */}
        <button
          disabled={!isValid || submitting}
          onClick={() => { setError(''); setShowConfirm(true); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {submitting ? (
            <><Loader2 size={15} className="animate-spin" /> Mengirim...</>
          ) : (
            <><FileText size={15} /> Kirim Laporan untuk Review</>
          )}
        </button>

        {!isValid && (
          <p className="text-center text-[11px] text-gray-400">
            {!title.trim() || title.trim().length < 5
              ? 'Isi judul laporan (min. 5 karakter)'
              : 'Isi total dana yang digunakan'}
          </p>
        )}

        <p className="text-center text-[10px] text-gray-400 leading-relaxed pb-4">
          Laporan direview tim TeraLoka sebelum dipublikasikan.
          Biasanya 1×24 jam kerja.
        </p>

      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl">

            <div className="mx-auto w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-3">
              <CheckCircle2 size={22} className="text-[#BE185D]" />
            </div>

            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              Kirim Laporan?
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
              Laporan ini akan masuk ke antrian review admin TeraLoka.
            </p>

            {/* Summary */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5 mb-4 space-y-2">
              <SummaryRow label="Judul" value={title} />
              <SummaryRow label="Total Dana" value={formatRupiah(amountNum)} bold />
              {useBreakdown && validItems.length > 0 && (
                <SummaryRow label="Rincian" value={`${validItems.length} item`} />
              )}
              <SummaryRow label="Foto Bukti" value={`${photos.length} foto`} />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-3">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-[#003526] text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <><Loader2 size={13} className="animate-spin" /> Mengirim...</>
                ) : (
                  'Ya, Kirim'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span
        className={`text-xs text-right text-gray-800 truncate max-w-[60%] ${
          bold ? 'font-extrabold text-[#BE185D]' : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
