'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface AamiinButtonProps {
  donationId: string;
  initialCount: number;
}

/**
 * AamiinButton — tombol kecil untuk kasih "Aamiin" ke doa donatur.
 *
 * - Optimistic UI: langsung show new count, rollback kalau API gagal
 * - No auth needed (public endpoint)
 * - Debounce: disable saat loading biar ga spam
 * - MVP: accept risk one user bisa klik berkali-kali (no per-user tracking)
 */
export default function AamiinButton({ donationId, initialCount }: AamiinButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [clicked, setClicked] = useState(false);

  async function handleClick() {
    if (loading) return;

    setLoading(true);
    const prevCount = count;
    setCount(prev => prev + 1);
    setClicked(true);

    try {
      const res = await fetch(`${API}/funding/donations/${donationId}/aamiin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        // Rollback
        setCount(prevCount);
        setClicked(false);
      } else {
        // Sync with server's actual count
        if (json.data?.aamiin_count !== undefined) {
          setCount(json.data.aamiin_count);
        }
      }
    } catch {
      setCount(prevCount);
      setClicked(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
        clicked
          ? 'bg-pink-50 text-[#EC4899] border border-pink-200'
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-pink-50 hover:text-[#EC4899] hover:border-pink-200'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <span className="text-sm">🤲</span>
      )}
      <span>Aamiin</span>
      {count > 0 && (
        <span className="font-bold tabular-nums">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </button>
  );
}
