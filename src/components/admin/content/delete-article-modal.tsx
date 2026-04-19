'use client';

/**
 * TeraLoka — DeleteArticleModal
 * Phase 2 · Batch 7e2 — Content Panel Tab 1 Complete
 * ------------------------------------------------------------
 * Destructive action modal untuk hard delete article (super_admin only).
 *
 * Safety pattern — "type-to-confirm":
 * - User harus type slug artikel TEPAT sama untuk enable delete button
 * - Optional reason textarea (audit trail)
 * - Warning banner tentang apa yang akan dihapus:
 *   - Artikel permanen
 *   - Semua foto/file di Supabase Storage
 *   - Cascade: article_versions, rss_articles SET NULL
 *
 * Error handling:
 * - 400 CONFLICT (takedown aktif) → show special red banner
 * - 404 NOT_FOUND → "Artikel mungkin sudah terhapus"
 * - 500 → generic error
 *
 * Success:
 * - Show files_removed count + article_title
 * - Auto-close 3 detik setelah success (like legacy UX)
 * - Call onSuccess(id) callback untuk parent refresh list
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApi, ApiError } from '@/lib/api/client';
import type { Article } from '@/types/articles';

interface DeleteArticleModalProps {
  /** Article yang mau dihapus. null = modal closed */
  article: Article | null;
  onClose: () => void;
  /** Callback setelah delete sukses — parent refresh list */
  onSuccess?: (deletedId: string) => void;
}

interface DeleteResult {
  files_removed?: number;
  article_title?: string;
}

export function DeleteArticleModal({
  article,
  onClose,
  onSuccess,
}: DeleteArticleModalProps) {
  const api = useApi();

  const [confirmSlug, setConfirmSlug] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeleteResult | null>(null);

  // Reset state saat article berubah (open modal baru)
  useEffect(() => {
    if (article) {
      setConfirmSlug('');
      setReason('');
      setError(null);
      setResult(null);
    }
  }, [article?.id]);

  // Auto-close 3s setelah success
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [result, onClose]);

  if (!article) return null;

  const isSlugMatch = confirmSlug.trim() === article.slug;
  const canDelete = isSlugMatch && !isDeleting && !result;

  const handleDelete = async () => {
    if (!isSlugMatch || !article) return;

    setIsDeleting(true);
    setError(null);

    try {
      const data = await api.delete<DeleteResult>(
        `/admin/articles/${article.id}/permanent`,
        { body: reason.trim() ? { reason: reason.trim() } : undefined }
      );

      setResult({
        files_removed: data?.files_removed ?? 0,
        article_title: data?.article_title ?? article.title,
      });

      // Notify parent
      onSuccess?.(article.id);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.message.toLowerCase().includes('takedown')) {
          setError(
            '⚠️ Artikel ini punya takedown request aktif. Selesaikan takedown dulu.'
          );
        } else if (err.status === 404) {
          setError('Artikel mungkin sudah terhapus sebelumnya.');
        } else {
          setError(err.message || 'Gagal hapus artikel.');
        }
      } else {
        setError('Terjadi kesalahan. Coba lagi.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // SUCCESS state
  if (result) {
    return (
      <Dialog open onClose={onClose} size="md" disableBackdropClose>
        <DialogHeader
          icon={<span className="text-2xl">✓</span>}
          title="Artikel Berhasil Dihapus"
          description={
            result.files_removed
              ? `${result.files_removed} file juga dihapus dari storage.`
              : 'Artikel sudah tidak bisa diakses lagi.'
          }
          tone="primary"
          centered
        />
        <DialogBody>
          <div className="text-center py-2">
            <p className="text-sm text-text-muted">
              <strong className="text-text">{result.article_title}</strong>
            </p>
            <p className="text-xs text-text-subtle mt-3">
              Modal tutup otomatis 3 detik...
            </p>
          </div>
        </DialogBody>
      </Dialog>
    );
  }

  // DELETE CONFIRMATION state
  return (
    <Dialog open onClose={onClose} size="md" disableBackdropClose={isDeleting}>
      <DialogHeader
        icon={<span className="text-xl">🗑️</span>}
        title="Hapus Permanen Artikel"
        description="Aksi ini TIDAK BISA dibatalkan. Artikel + semua foto terkait akan dihapus permanen."
        tone="danger"
      />

      <DialogBody>
        {/* Target article info */}
        <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
          <p className="text-sm font-semibold text-text truncate">
            {article.title}
          </p>
          <p className="text-xs text-text-subtle font-mono mt-0.5 truncate">
            {article.slug}
          </p>
        </div>

        {/* What will be deleted */}
        <div className="text-xs text-text-muted space-y-1 leading-relaxed">
          <p className="font-semibold text-text-secondary">
            Yang akan terhapus:
          </p>
          <ul className="space-y-0.5 pl-4">
            <li className="list-disc">Artikel dari database</li>
            <li className="list-disc">Semua foto di Supabase Storage</li>
            <li className="list-disc">Versi artikel (cascade)</li>
          </ul>
          <p className="text-status-healthy pt-1">
            ✓ Audit log tetap tersimpan (untuk compliance)
          </p>
        </div>

        {/* Confirm slug input */}
        <div>
          <Input
            label="Ketik slug artikel untuk konfirmasi"
            value={confirmSlug}
            onChange={(e) => setConfirmSlug(e.target.value)}
            placeholder={article.slug}
            helperText={
              isSlugMatch
                ? '✓ Slug cocok'
                : 'Copy-paste slug di atas persis'
            }
            disabled={isDeleting}
          />
        </div>

        {/* Reason (optional) */}
        <div>
          <Textarea
            label="Alasan (opsional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Misal: Duplicate content, informasi salah, dll..."
            rows={2}
            disabled={isDeleting}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-status-critical/10 border border-status-critical/30 px-3 py-2 text-sm text-status-critical">
            {error}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          Batal
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={!canDelete}
          loading={isDeleting}
        >
          Hapus Permanen
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
