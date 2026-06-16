'use client';

/**
 * TeraLoka — AiDraftModal ("AI-kan Draft" di Editorial Hub)
 * ------------------------------------------------------------
 * Fitur AI #1: AI BACA body draft yang sudah ada → saran teaser + kategori.
 * Editor review → "Terapkan" → tulis-balik ke artikel. AI = alat, editor = pemutus.
 *
 * 🔴 PRINSIP LOCKED:
 *  - TIDAK auto-publish, TIDAK auto-transisi status. Draft tetap draft.
 *  - Hasil AI = bahan kerja; editor bisa buang sebelum Terapkan.
 *  - Disclaimer wajib visible. Gate privasi 422 ikut (pesan ramah).
 *
 * Alur (fork A + c1):
 *  1. GET /admin/articles/{id} → ambil FULL object (termasuk body).
 *  2. POST /admin/ai/desk { text: body } → { ringkasan, kategori }.
 *  3. "Terapkan" → PATCH /admin/articles/{id} dengan FULL object hasil GET,
 *     override HANYA category (key BAKABAR, kalau ada padanan) + excerpt (ringkasan).
 *     Payload meniru PERSIS handleSave editor (proven-safe); `status` sengaja TIDAK
 *     dikirim → backend preserve (terbukti dari editor live yang juga tak kirim status).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeStatus } from '@/components/ui/badge';
import { Sparkles, AlertTriangle, ShieldAlert, Check, WandSparkles } from 'lucide-react';
import { ApiError, useApi } from '@/lib/api/client';
import {
  aiDeskErrorMessage,
  aiKategoriToBakabarKey,
  type AiDeskResult,
} from '@/lib/ai-desk';
import { getCategory } from '@/lib/categories';
import { resolveAdSettings } from '@/lib/ad-settings';

/* ─── Warna badge per kategori AI (status token aman — no purge risk) ─── */
const KATEGORI_TONE: Record<string, BadgeStatus> = {
  Pemerintahan: 'info',
  Politik: 'info',
  Pendidikan: 'info',
  Ekonomi: 'info',
  Pariwisata: 'info',
  Kesehatan: 'warning',
  Infrastruktur: 'warning',
  Transportasi: 'warning',
  Kriminal: 'critical',
  Bencana: 'critical',
  Lainnya: 'neutral',
};

interface AiDraftModalProps {
  /** Draft target: { id, title }. null = modal closed. */
  target: { id: string; title: string } | null;
  onClose: () => void;
  /** Dipanggil setelah Terapkan sukses — parent refresh list. */
  onApplied?: (id: string) => void;
}

export function AiDraftModal({ target, onClose, onApplied }: AiDraftModalProps) {
  const api = useApi();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [article, setArticle] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiDeskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // ── Fetch body + analisis saat modal dibuka / retry ──
  useEffect(() => {
    if (!target) return;
    let cancelled = false;

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setArticle(null);
    setApplied(false);

    (async () => {
      // 1. GET full object (untuk body + round-trip nanti)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let art: any;
      try {
        art = await api.get(`/admin/articles/${target.id}`);
      } catch {
        if (!cancelled) {
          setError('Gagal memuat isi draft. Coba lagi.');
          setAnalyzing(false);
        }
        return;
      }
      if (cancelled) return;
      setArticle(art);

      const body = typeof art?.body === 'string' ? art.body : '';
      if (!body.trim()) {
        setError('Draft ini belum ada isinya (body kosong). Tulis dulu sebelum di-AI-kan.');
        setAnalyzing(false);
        return;
      }

      // 2. POST ke AI Desk
      try {
        const data = await api.post<AiDeskResult>('/admin/ai/desk', { text: body });
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof ApiError
              ? aiDeskErrorMessage(e.status, e.message)
              : 'Gagal menganalisis. Coba lagi sebentar.'
          );
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [target, retryNonce, api]);

  const matchedKey = result ? aiKategoriToBakabarKey(result.kategori) : null;
  const matchedCat = matchedKey ? getCategory(matchedKey) : undefined;
  const tone: BadgeStatus = result
    ? KATEGORI_TONE[result.kategori] ?? 'neutral'
    : 'neutral';

  // ── Terapkan: PATCH full object, override category + excerpt saja ──
  const terapkan = useCallback(async () => {
    if (!article || !result) return;
    const a = article;
    setApplying(true);
    setError(null);
    try {
      // Replikasi PERSIS payload handleSave editor (proven-safe). `status` TIDAK
      // dikirim → backend preserve. Override HANYA category + excerpt.
      await api.patch(`/admin/articles/${a.id}`, {
        title: a.title,
        body: a.body,
        category: matchedKey ?? a.category ?? null, // mismatch → biarkan (editor pilih manual)
        excerpt: (result.ringkasan || '').trim() || null,
        cover_image_url: a.cover_image_url || null,
        cover_image_caption: (a.cover_image_caption || '').trim() || null,
        source_url: a.source_url || null,
        source_platform: a.source_platform || null,
        is_breaking: !!a.is_breaking,
        is_viral: !!a.is_viral,
        source: a.source || 'original',
        location_id: a.location_id || null,
        ad_position: a.ad_position ?? null,
        ad_settings: resolveAdSettings(a.ad_settings),
        change_note: 'AI Desk: isi kategori + teaser (status tidak diubah)',
      });
      setApplied(true);
      onApplied?.(a.id);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message || 'Gagal menyimpan. Coba lagi.'
          : 'Koneksi bermasalah. Coba lagi.'
      );
    } finally {
      setApplying(false);
    }
  }, [article, result, matchedKey, api, onApplied]);

  // Auto-close setelah sukses
  useEffect(() => {
    if (!applied) return;
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [applied, onClose]);

  if (!target) return null;

  const busy = analyzing || applying;

  return (
    <Dialog open onClose={onClose} size="md" disableBackdropClose={busy}>
      <DialogHeader
        icon={<Sparkles size={22} aria-hidden />}
        title="AI-kan Draft"
        description="AI baca isi draft → saran teaser + kategori. Editor yang putuskan."
        tone="primary"
      />

      <DialogBody>
        {/* Target draft */}
        <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <p className="text-sm font-semibold text-text truncate">{target.title}</p>
        </div>

        {/* 🔴 Disclaimer WAJIB */}
        <div
          role="note"
          className="flex items-start gap-2.5 p-3 rounded-lg border border-status-warning/40 bg-status-warning/10"
        >
          <ShieldAlert size={18} className="text-status-warning shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs leading-relaxed text-text-secondary">
            <strong className="text-text">Hasil AI — verifikasi dulu.</strong> Saran di
            bawah = bahan kerja, bukan final. Status draft TIDAK berubah; cuma teaser &amp;
            kategori yang diisi saat kamu klik Terapkan.
          </p>
        </div>

        {/* Loading */}
        {analyzing && (
          <div className="py-6 text-center text-sm text-text-muted">
            Membaca draft &amp; menganalisis…
          </div>
        )}

        {/* Error */}
        {error && !analyzing && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg bg-status-critical/10 border border-status-critical/30 px-3 py-2.5"
          >
            <span className="flex items-start gap-2 text-sm text-status-critical">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
              {error}
            </span>
            {!applied && (
              <button
                onClick={() => setRetryNonce((n) => n + 1)}
                className="text-xs font-semibold text-status-critical underline hover:no-underline shrink-0"
              >
                Coba lagi
              </button>
            )}
          </div>
        )}

        {/* Hasil */}
        {result && !analyzing && (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5">
                Kategori
              </p>
              <Badge variant="status" status={tone} style_="soft" size="md">
                {result.kategori}
              </Badge>
              <p className="text-[11px] text-text-muted mt-1.5 italic">
                {matchedCat
                  ? `Cocok dengan kategori BAKABAR "${matchedCat.label}" — akan di-set saat Terapkan.`
                  : 'Belum ada padanan di kategori BAKABAR — saran saja, pilih kategori manual di editor.'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5">
                Teaser (ringkasan)
              </p>
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                {result.ringkasan}
              </p>
            </div>

            {applied && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-status-healthy">
                <Check size={16} aria-hidden /> Diterapkan — draft tetap draft.
              </p>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {applied ? 'Tutup' : 'Batal'}
        </Button>
        <Button
          variant="primary"
          onClick={terapkan}
          disabled={!result || busy || applied}
          loading={applying}
          leftIcon={<WandSparkles size={15} />}
        >
          Terapkan ke draft
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
