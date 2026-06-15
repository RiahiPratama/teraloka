'use client';

/**
 * TeraLoka — Ticker Form Modal (Admin)
 * ------------------------------------------------------------
 * Create / edit ticker item. Konsumsi kontrak backend baru:
 *   create → POST /ticker
 *   edit   → PATCH /admin/ticker/:id
 *
 * 🛡️ Validasi UX (selaras gatekeep backend): kalau kategori ∈ {bahaya, transport}
 * maka expires_at WAJIB — cegah submit + pesan inline. Backend tetap gatekeep.
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, useApi } from '@/lib/api/client';
import {
  TICKER_URGENSI,
  TICKER_KATEGORI,
  TICKER_KATEGORI_REQUIRE_TTL,
} from '@/utils/constants';
import type {
  AdminTickerItem,
  TickerUrgensi,
  TickerKategori,
} from '@/types/common';

interface Props {
  /** Item untuk mode edit; null = create */
  item: AdminTickerItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const URGENSI_OPTIONS = Object.keys(TICKER_URGENSI) as TickerUrgensi[];
const KATEGORI_OPTIONS = Object.keys(TICKER_KATEGORI) as TickerKategori[];

/** ISO → value untuk <input type="datetime-local"> (local time, tanpa detik). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-border bg-surface ' +
  'text-[13px] text-text outline-none focus:border-brand-teal transition-colors ' +
  'placeholder:text-text-muted';

const labelCls = 'text-[11px] font-bold uppercase tracking-wide text-text-secondary';

export function TickerFormModal({ item, onClose, onSaved }: Props) {
  const api = useApi();
  const isEdit = item !== null;

  const [urgensi, setUrgensi] = useState<TickerUrgensi>(item?.urgensi ?? 'normal');
  const [kategori, setKategori] = useState<TickerKategori>(item?.kategori ?? 'berita');
  const [text, setText] = useState(item?.text ?? '');
  const [link, setLink] = useState(item?.link ?? '');
  const [sourceName, setSourceName] = useState(item?.source_name ?? '');
  const [sourceUrl, setSourceUrl] = useState(item?.source_url ?? '');
  const [expiresAt, setExpiresAt] = useState(isoToLocalInput(item?.expires_at ?? null));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ttlRequired = TICKER_KATEGORI_REQUIRE_TTL.includes(kategori);

  const submit = async () => {
    setError(null);

    if (text.trim().length < 3) {
      setError('Teks ticker minimal 3 karakter.');
      return;
    }
    // 🛡️ Lock: expires_at wajib untuk kategori bahaya/transport (selaras backend).
    if (ttlRequired && !expiresAt) {
      setError(
        `Kategori "${TICKER_KATEGORI[kategori].label}" wajib punya waktu kedaluwarsa (expires_at).`
      );
      return;
    }

    const body = {
      urgensi,
      kategori,
      text: text.trim(),
      link: link.trim() || null,
      source_name: sourceName.trim() || null,
      source_url: sourceUrl.trim() || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/admin/ticker/${item.id}`, body);
        onSaved('Ticker diperbarui.');
      } else {
        await api.post('/ticker', body);
        onSaved('Ticker dibuat.');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan ticker.');
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit ticker' : 'Tambah ticker'}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-elevated border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-text">
            {isEdit ? 'Edit Ticker' : 'Tambah Ticker'}
          </h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-text-muted hover:text-text transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Urgensi</label>
              <select
                value={urgensi}
                onChange={(e) => setUrgensi(e.target.value as TickerUrgensi)}
                className={inputCls + ' cursor-pointer font-semibold'}
              >
                {URGENSI_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {TICKER_URGENSI[u].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as TickerKategori)}
                className={inputCls + ' cursor-pointer font-semibold'}
              >
                {KATEGORI_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {TICKER_KATEGORI[k].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Teks Ticker</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Isi teks yang tampil di running-text…"
              className={inputCls + ' resize-none'}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Link (opsional)</label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://… atau /path internal"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Sumber (nama)</label>
              <input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="mis. BMKG"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Sumber (URL)</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Kedaluwarsa (expires_at)
              {ttlRequired && <span className="text-status-critical"> *wajib</span>}
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls + ' cursor-pointer'}
            />
            {ttlRequired && (
              <span className="text-[11px] text-text-muted">
                Kategori bahaya & transport wajib punya waktu kedaluwarsa.
              </span>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-status-critical/10 border border-status-critical/25 text-[12px] font-semibold text-status-critical">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={submitting}>
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </div>
    </div>
  );
}
