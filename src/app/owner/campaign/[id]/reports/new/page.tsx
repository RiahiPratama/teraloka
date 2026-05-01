'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/campaign/[id]/reports/new/page.tsx
// Form submit laporan penggunaan dana (owner)
//
// Backend endpoint: POST /funding/my/campaigns/:id/reports
// Items format: STRUCTURED — { name, amount, category?, date?, proof_photo? }
// Validation: total items HARUS match amount_used
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Loader2, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp,
  FileText, Tag, Calendar, Camera, Send, Info, AlertTriangle, CheckCircle2,
  Receipt, Calculator,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

const CATEGORIES = [
  'Kesehatan', 'Transport', 'Makanan', 'Tempat Tinggal',
  'Pendidikan', 'Listrik/Air', 'Peralatan', 'Pakaian', 'Lain-lain',
] as const;

interface UsageItem {
  id: string;            // local UUID for React keys
  name: string;
  amount: number;
  amountDisplay: string;
  category: string;
  date: string;
  proof_photo: string;
}

interface CampaignSummary {
  id: string;
  title: string;
  status: string;
  collected_amount: number;
}

const newItem = (): UsageItem => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  amount: 0,
  amountDisplay: '',
  category: '',
  date: '',
  proof_photo: '',
});

export default function OwnerCampaignReportNewPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<UsageItem[]>([newItem()]);
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/masuk'); return; }
    if (!campaignId) return;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const res = await fetch(`${API}/funding/my/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        if (!res.success) throw new Error(res?.error?.message || 'Gagal load kampanye');
        setCampaign(res.data);
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [campaignId, authLoading, user, router]);

  // Auto-expand first item on mount
  useEffect(() => {
    if (items.length > 0 && !expandedItem) {
      setExpandedItem(items[0].id);
    }
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + it.amount, 0),
    [items]
  );

  const validation = useMemo(() => {
    if (!title.trim() || title.trim().length < 5) return 'Judul minimal 5 karakter';
    if (!description.trim() || description.trim().length < 20) return 'Deskripsi minimal 20 karakter';
    if (items.length === 0) return 'Minimal 1 item pengeluaran';
    if (items.length > 50) return 'Maksimal 50 item per laporan';
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim() || it.name.trim().length < 3) return `Item #${i + 1}: nama minimal 3 karakter`;
      if (it.name.trim().length > 200) return `Item #${i + 1}: nama maksimal 200 karakter`;
      if (it.amount <= 0) return `Item #${i + 1}: nominal harus > 0`;
      if (it.amount > 100_000_000) return `Item #${i + 1}: nominal maksimal Rp 100jt`;
    }
    if (totalItems <= 0) return 'Total pengeluaran harus > 0';
    return '';
  }, [title, description, items, totalItems]);

  function updateItem(id: string, patch: Partial<UsageItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      toast.warning('Minimal 1 item pengeluaran');
      return;
    }
    setItems(prev => prev.filter(it => it.id !== id));
  }

  function addItem() {
    if (items.length >= 50) {
      toast.warning('Maksimal 50 item per laporan');
      return;
    }
    const it = newItem();
    setItems(prev => [...prev, it]);
    setExpandedItem(it.id);
  }

  async function handleSubmit() {
    if (validation) return;
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      // Strip local id sebelum submit, format items sesuai schema
      const cleanItems = items.map(it => ({
        name: it.name.trim(),
        amount: it.amount,
        category: it.category || undefined,
        date: it.date || undefined,
        proof_photo: it.proof_photo || undefined,
      }));

      const res = await fetch(`${API}/funding/my/campaigns/${campaignId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          amount_used: totalItems,
          items: cleanItems,
          proof_photos: proofPhotos,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal submit laporan');
      }

      toast.success('Laporan berhasil dikirim, menunggu review admin');
      router.push(`/owner/campaign/${campaignId}/reports?created=1`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  if (loadingData || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{loadError || 'Kampanye tidak ditemukan'}</p>
          <Link href={`/owner/campaign/${campaignId}/reports`} className="text-sm text-[#003526] underline">Kembali</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/owner/campaign/${campaignId}/reports`} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">Buat Laporan</h1>
            <p className="text-xs text-gray-500 truncate">{campaign.title}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Info card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <Info size={18} className="text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <p className="font-bold mb-1">Format laporan terstruktur</p>
            Tambahkan setiap pengeluaran sebagai item terpisah. Total item akan otomatis menjadi nominal laporan.
          </div>
        </div>

        {/* Title */}
        <Section icon={<FileText size={18} />} title="Judul Laporan" required>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Misal: Pembelian obat & transport berobat — Tahap 1"
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{title.length}/200</p>
        </Section>

        {/* Description */}
        <Section icon={<FileText size={18} />} title="Deskripsi" required hint="Min 20 karakter. Konteks penggunaan dana">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ceritakan bagaimana dana ini dipakai. Apa hasilnya untuk penerima manfaat?"
            rows={4}
            maxLength={2000}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{description.length}/2000</p>
        </Section>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-[#003526]" />
              <h2 className="text-sm font-bold text-gray-800">
                Rincian Pengeluaran <span className="text-red-500">*</span>
              </h2>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {items.length}/50
            </span>
          </div>

          <div className="space-y-2">
            {items.map((it, idx) => (
              <ItemCard
                key={it.id}
                item={it}
                index={idx}
                expanded={expandedItem === it.id}
                onToggle={() => setExpandedItem(prev => prev === it.id ? null : it.id)}
                onUpdate={patch => updateItem(it.id, patch)}
                onRemove={() => removeItem(it.id)}
                canRemove={items.length > 1}
              />
            ))}
          </div>

          {items.length < 50 && (
            <button
              onClick={addItem}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-[#003526] border-2 border-dashed border-gray-200 hover:border-[#003526] hover:bg-gray-50 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={14} />
              Tambah Item
            </button>
          )}

          {/* Total Calculator */}
          <div className="mt-4 pt-4 border-t border-gray-100 bg-gradient-to-br from-[#003526] to-[#0d4d3a] -mx-5 -mb-5 px-5 py-4 rounded-b-2xl text-white">
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={14} className="opacity-80" />
              <p className="text-[10px] font-semibold opacity-90 uppercase tracking-wider">Total Pengeluaran</p>
            </div>
            <p className="text-2xl font-black">{formatRupiah(totalItems)}</p>
            <p className="text-[10px] opacity-70 mt-1">
              {items.length} item · Otomatis dijadikan nominal laporan
            </p>
          </div>
        </div>

        {/* General proof photos */}
        <Section icon={<Camera size={18} />} title="Foto Bukti Umum" hint="Opsional. Foto kegiatan, struk gabungan, dll.">
          <ImageUpload
            bucket="reports"
            label=""
            maxFiles={10}
            maxSizeMB={3}
            onUpload={(urls: string[]) => setProofPhotos(urls)}
            existingUrls={proofPhotos}
          />
        </Section>

        {/* Submit area */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky bottom-4 shadow-lg">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}
          {validation && !error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{validation}</p>
            </div>
          )}
          {!validation && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-800 font-medium">Siap submit · Total {formatRupiah(totalItems)}</p>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!!validation || submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Submitting...</>
            ) : (
              <><Send size={16} /> Kirim Laporan</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon, title, required, hint, children,
}: {
  icon: React.ReactNode; title: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#003526]">{icon}</div>
        <h2 className="text-sm font-bold text-gray-800">
          {title} {required && <span className="text-red-500">*</span>}
        </h2>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2.5">{hint}</p>}
      {children}
    </div>
  );
}

function ItemCard({
  item, index, expanded, onToggle, onUpdate, onRemove, canRemove,
}: {
  item: UsageItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<UsageItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const isValid = item.name.trim().length >= 3 && item.amount > 0;

  return (
    <div className={`border rounded-xl overflow-hidden ${expanded ? 'border-[#003526]' : 'border-gray-200'}`}>
      {/* Header (always visible) */}
      <button
        onClick={onToggle}
        type="button"
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50 text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isValid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${item.name ? 'text-gray-900' : 'text-gray-400'}`}>
              {item.name || 'Item belum diisi'}
            </p>
            {item.amount > 0 && (
              <p className="text-xs text-[#003526] font-bold">{formatRupiah(item.amount)}</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {/* Body (collapsible) */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 bg-gray-50 border-t border-gray-100">
          <div className="pt-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Nama Pengeluaran <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={item.name}
              onChange={e => onUpdate({ name: e.target.value })}
              placeholder="Misal: Pembelian obat di Apotek K24"
              maxLength={200}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#003526] bg-white"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Nominal <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={item.amountDisplay}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const num = Number(raw) || 0;
                  onUpdate({
                    amount: num,
                    amountDisplay: raw ? num.toLocaleString('id-ID') : '',
                  });
                }}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm font-bold outline-none focus:border-[#003526] bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag size={9} /> Kategori
              </label>
              <select
                value={item.category}
                onChange={e => onUpdate({ category: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#003526] bg-white"
              >
                <option value="">— Pilih —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={9} /> Tanggal
              </label>
              <input
                type="date"
                value={item.date}
                onChange={e => onUpdate({ date: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#003526] bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Camera size={9} /> Foto Bukti (struk/nota)
            </label>
            <ImageUpload
              bucket="reports"
              label=""
              maxFiles={1}
              maxSizeMB={3}
              onUpload={(urls: string[]) => onUpdate({ proof_photo: urls[0] ?? '' })}
              existingUrls={item.proof_photo ? [item.proof_photo] : []}
            />
          </div>

          {canRemove && (
            <button
              onClick={onRemove}
              type="button"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 py-2 rounded-lg"
            >
              <Trash2 size={12} />
              Hapus Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}
