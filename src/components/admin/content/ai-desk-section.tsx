'use client';

/**
 * TeraLoka — AI Desk Section (di dalam Tab "AI" dashboard /admin/content)
 * ------------------------------------------------------------
 * MVP fungsi AI editorial BAKABAR: tempel teks mentah → ringkasan + kategori.
 * Skin = @/components/ui (Card/Button/Textarea/Badge) + token semantik, konsisten
 * dengan tab dashboard lain (Editorial/Newsroom/Distribution).
 *
 * 🔴 PRINSIP LOCKED: AI = ALAT, bukan editor. Hasil = bahan kerja, BUKAN final.
 * Disclaimer wajib visible. Copy-only (bukan konteks editor artikel — tidak ada
 * "Pakai sebagai draft" di sini).
 *
 * Logic 100% reuse src/lib/ai-desk.ts.
 */

import { useCallback, useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { ApiError, useApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeStatus } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  AI_DESK_MAX_CHARS,
  aiDeskErrorMessage,
  type AiDeskResult,
} from '@/lib/ai-desk';

/* ─── Warna badge per kategori (pakai status token aman — no purge risk) ─── */
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

export function AiDeskSection() {
  const api = useApi();

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiDeskResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCopied, setAiCopied] = useState(false);

  const analisis = useCallback(async () => {
    const trimmed = aiText.trim();
    if (!trimmed) {
      setAiError('Teks masih kosong. Tempel teks mentah dulu.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setAiCopied(false);
    try {
      const data = await api.post<AiDeskResult>('/admin/ai/desk', {
        text: trimmed,
      });
      setAiResult(data);
    } catch (e) {
      setAiError(
        e instanceof ApiError
          ? aiDeskErrorMessage(e.status, e.message)
          : 'Gagal menganalisis. Coba lagi sebentar.'
      );
    } finally {
      setAiLoading(false);
    }
  }, [aiText, api]);

  const copyRingkasan = useCallback(async () => {
    if (!aiResult?.ringkasan) return;
    try {
      await navigator.clipboard.writeText(aiResult.ringkasan);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    } catch {
      /* abaikan — bisa salin manual */
    }
  }, [aiResult]);

  const tone: BadgeStatus = aiResult
    ? KATEGORI_TONE[aiResult.kategori] ?? 'neutral'
    : 'neutral';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-teal" aria-hidden />
          AI Desk
        </CardTitle>
        <CardDescription>
          Tempel teks mentah → dapat ringkasan &amp; kategori sebagai bahan kerja.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 🔴 Disclaimer WAJIB — AI = alat, bukan editor */}
        <div
          role="note"
          className="flex items-start gap-2.5 p-3 rounded-lg border border-status-warning/40 bg-status-warning/10"
        >
          <ShieldAlert
            size={18}
            className="text-status-warning shrink-0 mt-0.5"
            aria-hidden
          />
          <p className="text-xs leading-relaxed text-text-secondary">
            <strong className="text-text">
              Hasil AI — verifikasi &amp; edit dulu sebelum dipakai.
            </strong>{' '}
            AI adalah alat bantu, bukan editor. Output di bawah adalah bahan
            kerja, bukan artikel final. Cek fakta &amp; sunting sebelum dipakai.
          </p>
        </div>

        {/* Input */}
        <Textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          placeholder="Tempel teks mentah di sini (maks 5000 karakter)…"
          autoResize
          minRows={5}
          maxRows={14}
          maxLength={AI_DESK_MAX_CHARS}
          showCount
          disabled={aiLoading}
        />

        <Button
          variant="primary"
          loading={aiLoading}
          disabled={!aiText.trim()}
          leftIcon={<Sparkles size={15} />}
          onClick={analisis}
        >
          {aiLoading ? 'Menganalisis…' : 'Analisis'}
        </Button>

        {/* Error */}
        {aiError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg border border-status-critical/30 bg-status-critical/10 text-sm text-status-critical"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden />
            <span className="font-medium">{aiError}</span>
          </div>
        )}

        {/* Hasil */}
        {aiResult && (
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Hasil
              </p>
              <Badge variant="status" status={tone} style_="soft" size="md">
                {aiResult.kategori}
              </Badge>
            </div>
            <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
              {aiResult.ringkasan}
            </p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={aiCopied ? <Check size={14} /> : <Copy size={14} />}
              onClick={copyRingkasan}
            >
              {aiCopied ? 'Tersalin' : 'Copy ringkasan'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
