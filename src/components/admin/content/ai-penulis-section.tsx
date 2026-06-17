'use client';

/**
 * TeraLoka — AI Penulis Section (Tab "AI" dashboard /admin/content)
 * ------------------------------------------------------------
 * Sejajar AI Desk. Bahan mentah + task (A–E) → DRAFT editorial (voice TeraLoka).
 * Skin = @/components/ui (Card/Button/Textarea/Badge) + token semantik, konsisten
 * dengan AI Desk Section & tab dashboard lain.
 *
 * 🔴 PRINSIP LOCKED: AI = ALAT, editor = gatekeeper. Output = DRAFT, BUKAN publish.
 * Disclaimer wajib visible.
 *
 * 🔴 SAFETY NET (gerbang terakhir UI): quote_fabrication_detected === true →
 * warning MERAH menonjol + tombol "Copy draft" (aksi lanjut) DI-BLOKIR.
 *
 * Logic/tipe reuse src/lib/ai-penulis.ts. Endpoint POST /admin/ai/penulis/generate.
 * TERPISAH dari AI Desk — TIDAK menyentuh ai-desk-section.tsx.
 */

import { useCallback, useState } from 'react';
import {
  PenLine,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  Ban,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { ApiError, useApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  PENULIS_TASKS,
  PENULIS_MAX_CHARS,
  aiPenulisErrorMessage,
  type PenulisResult,
  type PenulisTask,
} from '@/lib/ai-penulis';

/* ─── Markdown → elemen ber-style (pola LegalPage, skin token semantik) ─── */
const md: Components = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-text mt-3 mb-1.5 leading-snug">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-text mt-3 mb-1.5 leading-snug">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold text-text mt-2.5 mb-1">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-text leading-relaxed mb-2.5">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 space-y-1 text-sm text-text">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-sm text-text">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-text leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-teal underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 italic text-text-muted my-2.5">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
};

export function AiPenulisSection() {
  const api = useApi();

  const [bahan, setBahan] = useState('');
  const [task, setTask] = useState<PenulisTask>('A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PenulisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    const trimmed = bahan.trim();
    if (!trimmed) {
      setError('Bahan masih kosong. Tempel bahan mentah dulu.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const data = await api.post<PenulisResult>('/admin/ai/penulis/generate', {
        bahan: trimmed,
        task,
      });
      setResult(data);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? aiPenulisErrorMessage(e.status, e.message)
          : 'Gagal membuat draft. Coba lagi sebentar.'
      );
    } finally {
      setLoading(false);
    }
  }, [bahan, task, api]);

  // 🔴 Gerbang keamanan: fabrikasi kutipan → blokir aksi lanjut.
  const fabricated = result?.quote_fabrication_detected === true;

  const copyDraft = useCallback(async () => {
    if (!result?.draft || fabricated) return; // blokir copy kalau fabrikasi
    try {
      await navigator.clipboard.writeText(result.draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* abaikan — bisa salin manual */
    }
  }, [result, fabricated]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine size={18} className="text-brand-teal" aria-hidden />
          AI Penulis
        </CardTitle>
        <CardDescription>
          Bahan mentah → draft editorial (voice TeraLoka). Draft buat editor, BUKAN
          publish.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 🔴 Disclaimer WAJIB */}
        <div
          role="note"
          className="flex items-start gap-2.5 p-3 rounded-lg border border-status-warning/40 bg-status-warning/10"
        >
          <ShieldAlert size={18} className="text-status-warning shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs leading-relaxed text-text-secondary">
            <strong className="text-text">Hasil AI — verifikasi &amp; edit dulu sebelum dipakai.</strong>{' '}
            AI alat bantu, bukan editor. Output di bawah adalah <strong>draft</strong>,
            bukan artikel final. Editor yang jadi gatekeeper sebelum tayang.
          </p>
        </div>

        {/* Pilih task */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Jenis tugas
          </label>
          <select
            value={task}
            onChange={(e) => setTask(e.target.value as PenulisTask)}
            disabled={loading}
            className="w-full px-2.5 py-2 rounded-lg border border-border text-sm text-text bg-surface cursor-pointer outline-none focus:border-brand-teal disabled:opacity-60"
          >
            {PENULIS_TASKS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Input bahan mentah */}
        <Textarea
          label="Bahan mentah"
          value={bahan}
          onChange={(e) => setBahan(e.target.value)}
          placeholder="Tempel bahan mentah: poin-poin, laporan, kutipan sumber… (maks 20.000 karakter)"
          autoResize
          minRows={6}
          maxRows={18}
          maxLength={PENULIS_MAX_CHARS}
          showCount
          disabled={loading}
        />

        <Button
          variant="primary"
          loading={loading}
          disabled={!bahan.trim()}
          leftIcon={<PenLine size={15} />}
          onClick={generate}
        >
          {loading ? 'Menulis draft… (bisa ~20 dtk)' : 'Buat Draft'}
        </Button>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg border border-status-critical/30 bg-status-critical/10 text-sm text-status-critical"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" aria-hidden />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Hasil */}
        {result && (
          <div className="pt-4 border-t border-border space-y-4">
            {/* 🔴 SAFETY NET — fabrikasi kutipan */}
            {fabricated && (
              <div
                role="alert"
                className="flex items-start gap-3 p-3.5 rounded-lg border-2 border-status-critical bg-status-critical/15"
              >
                <Ban size={22} className="text-status-critical shrink-0 mt-0.5" aria-hidden />
                <div className="text-sm">
                  <p className="font-extrabold text-status-critical">
                    🔴 Fabrikasi kutipan terdeteksi — JANGAN PUBLISH.
                  </p>
                  <p className="text-text-secondary mt-1 leading-relaxed">
                    Auditor mekanis menemukan kutipan langsung di draft yang TIDAK ada
                    di bahan mentah. Draft ini tidak aman dipakai. Tombol salin diblokir —
                    perbaiki bahan / tulis ulang, lalu generate lagi.
                  </p>
                </div>
              </div>
            )}

            {/* Badge meta */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="status" status="info" style_="soft" size="sm">
                engine: {result.engine_used}
              </Badge>
              <Badge variant="status" status="neutral" style_="soft" size="sm">
                {result.word_count} kata
              </Badge>
              {result.seo_meta?.kategori && (
                <Badge variant="status" status="info" style_="soft" size="sm">
                  {result.seo_meta.kategori}
                </Badge>
              )}
            </div>

            {/* Draft (markdown) */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Draft
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={fabricated}
                  title={fabricated ? 'Diblokir — fabrikasi kutipan terdeteksi' : 'Salin draft'}
                  leftIcon={
                    fabricated ? <Ban size={14} /> : copied ? <Check size={14} /> : <Copy size={14} />
                  }
                  onClick={copyDraft}
                >
                  {fabricated ? 'Diblokir' : copied ? 'Tersalin' : 'Copy draft'}
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted/40 p-3.5 max-h-[480px] overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                  {result.draft}
                </ReactMarkdown>
              </div>
            </div>

            {/* SEO meta */}
            {result.seo_meta && (
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                  SEO meta
                </p>
                <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5 text-sm">
                  {result.seo_meta.title && (
                    <p><span className="text-text-muted">Title:</span> <span className="text-text">{result.seo_meta.title}</span></p>
                  )}
                  {result.seo_meta.description && (
                    <p><span className="text-text-muted">Description:</span> <span className="text-text">{result.seo_meta.description}</span></p>
                  )}
                  {result.seo_meta.slug && (
                    <p><span className="text-text-muted">Slug:</span> <span className="text-text font-mono text-xs">{result.seo_meta.slug}</span></p>
                  )}
                  {result.seo_meta.tags && result.seo_meta.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-text-muted">Tags:</span>
                      {result.seo_meta.tags.map((tg) => (
                        <span key={tg} className="text-[11px] px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary">
                          {tg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Self-audit notes (transparansi anti-halusinasi) */}
            {result.self_audit_notes && result.self_audit_notes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
                  Catatan self-audit AI
                </p>
                <ul className="rounded-lg border border-border bg-surface p-3 space-y-1 list-disc pl-7 text-xs text-text-secondary leading-relaxed">
                  {result.self_audit_notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer dari backend */}
            {result.disclaimer && (
              <p className="text-[11px] italic text-text-muted leading-relaxed">
                {result.disclaimer}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
