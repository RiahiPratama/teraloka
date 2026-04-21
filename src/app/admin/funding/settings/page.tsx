'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Settings, ArrowLeft, Save, Loader2, Check,
  AlertCircle, Scale, Calendar, User as UserIcon,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type Config = {
  key: string;
  value: number;
  unit: string;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

function formatRp(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function parseRp(s: string): number {
  return Number(String(s).replace(/\D/g, '')) || 0;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminFundingSettings() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/config?category=zakat`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConfigs(json.data);
        const initialEdits: Record<string, string> = {};
        json.data.forEach((c: Config) => {
          initialEdits[c.key] = String(Math.round(Number(c.value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        });
        setEdits(initialEdits);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memuat data. Coba refresh.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(key: string) {
    if (!token) {
      setMessage({ type: 'error', text: 'Session tidak valid. Login ulang.' });
      return;
    }

    const newValue = parseRp(edits[key] || '0');
    if (newValue <= 0) {
      setMessage({ type: 'error', text: 'Nilai harus lebih dari 0.' });
      return;
    }

    try {
      setSaving(key);
      setMessage(null);

      const res = await fetch(`${API}/config/${key}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: newValue }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage({ type: 'success', text: `✓ ${getDisplayName(key)} berhasil diperbarui.` });
        await loadConfigs();
      } else {
        setMessage({ type: 'error', text: json.error?.message ?? 'Gagal menyimpan.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Coba lagi.' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  function getDisplayName(key: string): string {
    const map: Record<string, string> = {
      zakat_harga_beras_per_kg: 'Harga Beras',
      zakat_harga_emas_per_gram: 'Harga Emas',
    };
    return map[key] ?? key;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin_funding')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900 mb-1">Akses Ditolak</p>
          <p className="text-xs text-gray-500 mb-4">Hanya super admin atau admin funding yang bisa akses halaman ini.</p>
          <Link href="/admin/funding" className="text-xs font-bold text-[#EC4899]">← Kembali</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/admin/funding" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2 hover:text-gray-700">
            <ArrowLeft size={14} /> Admin BADONASI
          </Link>
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-[#003526]" strokeWidth={2.2} />
            <h1 className="text-lg font-extrabold text-gray-900">Pengaturan BADONASI</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Harga acuan untuk kalkulator zakat. Update saat ada perubahan pasar.</p>
        </div>
      </div>

      {message && (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className={`rounded-xl p-3 flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <p className="text-sm font-semibold">{message.text}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-6">

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Memuat konfigurasi...</p>
          </div>
        ) : configs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-500">Belum ada konfigurasi.</p>
          </div>
        ) : (
          <div className="space-y-4">

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Scale size={16} className="text-[#003526]" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Harga Acuan Zakat</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                Nilai ini dipakai di kalkulator zakat publik. Update saat harga pasar berubah signifikan.
              </p>

              <div className="space-y-4">
                {configs.map(c => (
                  <div key={c.key} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900">{getDisplayName(c.key)}</p>
                        {c.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{c.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider">
                        {c.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={edits[c.key] ?? ''}
                          onChange={e => setEdits({
                            ...edits,
                            [c.key]: String(parseRp(e.target.value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
                          })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-[#EC4899]"
                        />
                      </div>
                      <button
                        onClick={() => handleSave(c.key)}
                        disabled={saving === c.key || parseRp(edits[c.key] || '0') === Number(c.value)}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#003526] hover:bg-[#1B6B4A] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2.5 transition-colors"
                      >
                        {saving === c.key ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Simpan
                      </button>
                    </div>

                    {parseRp(edits[c.key] || '0') !== Number(c.value) && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
                        <AlertCircle size={10} />
                        Nilai akan berubah dari <strong>{formatRp(Number(c.value))}</strong> → <strong>{formatRp(parseRp(edits[c.key] || '0'))}</strong>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span>{formatDate(c.updated_at)}</span>
                      </div>
                      {c.updated_by && (
                        <div className="flex items-center gap-1">
                          <UserIcon size={10} />
                          <span className="font-mono truncate max-w-[100px]">{c.updated_by.slice(0, 8)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                <strong className="text-gray-700">Catatan:</strong> Kalkulator zakat publik akan menggunakan nilai terbaru dalam ~1 jam setelah perubahan (cache Next.js). Untuk force refresh segera, hubungi developer.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
