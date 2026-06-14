'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR ADS — useAdFetch hook  [lapis 2]
// PATH: src/hooks/useAdFetch.ts
// ────────────────────────────────────────────────────────────────
// Bungkus fetchAdJson dalam useEffect + AbortController. Ganti pola
// "useEffect + cancelled flag tanpa abort/res.ok" yang ke-duplikat di
// komponen iklan famili-A. Manfaat:
//   - res.ok + retry + backoff (dari fetchAdJson) → tahan 521 flapping
//   - abort saat unmount / url berubah → nutup race fetch (dep-change)
//   - url=null → SKIP fetch (mis. DCAStackBanner saat data dari server)
// Return SELALU array `data`; pemanggil pilih data[0] / random / slice.
// CATATAN: error tidak diekspos — fetchAdJson graceful-empty by design,
//   jadi `data` kosong = sinyal gagal (komponen tinggal tampil kosong).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { fetchAdJson } from '@/lib/ads/fetchAdJson';

export interface UseAdFetchResult<T> {
  data:    T[];
  loading: boolean;
}

export function useAdFetch<T = any>(url: string | null): UseAdFetchResult<T> {
  const [data, setData]       = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(!!url);

  useEffect(() => {
    if (!url) {
      setData([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetchAdJson<T>(url, { signal: ctrl.signal }).then((arr) => {
      if (ctrl.signal.aborted) return;
      setData(arr);
      setLoading(false);
    });
    return () => ctrl.abort();
  }, [url]);

  return { data, loading };
}
