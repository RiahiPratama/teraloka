// ════════════════════════════════════════════════════════════════
// BAKABAR ADS — Resilient client fetch primitive  [useAdFetch lapis 1]
// PATH: src/lib/ads/fetchAdJson.ts
// ────────────────────────────────────────────────────────────────
// Dipakai useAdFetch hook + (Batch 2-3 nanti) kasus khusus: chain
// political-banner, module-cache ArchiveInFeedAd. Hardening vs API
// 521 flapping (Cloudflare origin-down intermittent):
//   - res.ok check  → 521 (HTML) GAK di-JSON.parse (hindari throw senyap)
//   - retry + backoff → nangkep window 521 yang pendek
//   - abort-aware (signal) → unmount/dep-change gak update state basi
//   - gagal total → return [] (BUKAN throw) → komponen tampil kosong, gak crash
// Return: SELALU array (json.data kalau success, else []). Pemanggil pilih
//   [0] / random / slice sesuai kebutuhan.
// ════════════════════════════════════════════════════════════════

export interface FetchAdJsonOpts {
  signal?:    AbortSignal;
  retries?:   number;   // default 1 → total 2 percobaan
  timeoutMs?: number;   // default 6000
}

export async function fetchAdJson<T = any>(
  url: string,
  opts: FetchAdJsonOpts = {},
): Promise<T[]> {
  const { signal, retries = 1, timeoutMs = 6000 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) return [];

    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: ctrl.signal });
      // 🛡️ 521/5xx → JANGAN parse body (HTML error page) sebagai JSON.
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json?.success && Array.isArray(json.data) ? (json.data as T[]) : [];
    } catch {
      if (signal?.aborted) return [];          // unmount/dep-change → diam
      if (attempt === retries) return [];       // 🛡️ habis jatah retry → kosong, bukan crash
      // backoff 400ms, 800ms, ... (respect abort di awal iterasi berikutnya)
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  return [];
}
