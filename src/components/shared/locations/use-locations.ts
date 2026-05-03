'use client';

/**
 * TeraLoka — Locations Hooks
 * Pre-Sprint #0 Step 6 — Geographic Foundation Picker
 * ────────────────────────────────────────────────────────────
 * Custom hooks wrapping `useApi()` untuk consume 7 backend endpoints:
 *   - useLocationTree   → GET /locations/tree
 *   - useLocationChildren → GET /locations/:id/children
 *   - useLocationSearch → GET /locations/search
 *   - useLocationBreadcrumb → GET /locations/breadcrumb/:id
 *   - useReverseGeo    → GET /locations/reverse-geo
 *
 * All hooks support:
 *   - Auto-fetch on mount + dependency change
 *   - Loading + error state
 *   - Manual refetch via `refetch()`
 *   - AbortController cleanup (prevent stale state on unmount)
 *
 * Pattern: mirror existing hooks di codebase (e.g., useApi from @/lib/api/client).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi, ApiError } from '@/lib/api/client';
import type {
  Location,
  LocationTreeNode,
  LocationBreadcrumb,
  ReverseGeoResult,
  LocationType,
} from './locations-types';

// ─── Generic state shape ─────────────────────────────────────

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: FetchState<unknown> = {
  data:    null,
  loading: false,
  error:   null,
};

// ════════════════════════════════════════════════════════════════
// 1. useLocationTree — Nested hierarchy
// ════════════════════════════════════════════════════════════════

/**
 * Fetch tree dari /locations/tree.
 * @param rootId Optional UUID — kalau null, return Tier 1+2 (provinsi + kab/kota)
 * @param enabled Default true. Set false untuk lazy fetch.
 */
export function useLocationTree(rootId: string | null = null, enabled = true) {
  const api = useApi();
  const [state, setState] = useState<FetchState<LocationTreeNode | LocationTreeNode[]>>(
    INITIAL_STATE as FetchState<LocationTreeNode | LocationTreeNode[]>,
  );
  const abortRef = useRef<AbortController | null>(null);

  const fetchTree = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const data = await api.get<LocationTreeNode | LocationTreeNode[]>(
        '/locations/tree',
        {
          params: rootId ? { root_id: rootId } : undefined,
          signal: controller.signal,
        },
      );
      if (!controller.signal.aborted) {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof ApiError ? err.message : 'Gagal memuat hierarchy lokasi';
      setState({ data: null, loading: false, error: message });
    }
  }, [api, rootId, enabled]);

  useEffect(() => {
    fetchTree();
    return () => abortRef.current?.abort();
  }, [fetchTree]);

  return { ...state, refetch: fetchTree };
}

// ════════════════════════════════════════════════════════════════
// 2. useLocationChildren — Direct children (lazy load picker drill-down)
// ════════════════════════════════════════════════════════════════

/**
 * Fetch direct children dari /locations/:id/children.
 * @param parentId UUID parent location
 * @param type Optional filter by LocationType
 * @param enabled Default true. Set false untuk skip fetch.
 */
export function useLocationChildren(
  parentId: string | null,
  type?: LocationType,
  enabled = true,
) {
  const api = useApi();
  const [state, setState] = useState<FetchState<Location[]>>(
    INITIAL_STATE as FetchState<Location[]>,
  );
  const abortRef = useRef<AbortController | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!parentId || !enabled) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const data = await api.get<Location[]>(`/locations/${parentId}/children`, {
        params: type ? { type } : undefined,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setState({ data: data ?? [], loading: false, error: null });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof ApiError ? err.message : 'Gagal memuat sub-wilayah';
      setState({ data: null, loading: false, error: message });
    }
  }, [api, parentId, type, enabled]);

  useEffect(() => {
    fetchChildren();
    return () => abortRef.current?.abort();
  }, [fetchChildren]);

  return { ...state, refetch: fetchChildren };
}

// ════════════════════════════════════════════════════════════════
// 3. useLocationSearch — Autocomplete (debounced)
// ════════════════════════════════════════════════════════════════

/**
 * Search lokasi by name (ILIKE).
 * Debounced 300ms biar gak spam backend per keystroke.
 * @param query Search term (min 2 chars)
 * @param type Optional filter by type
 * @param limit Default 20, max 50
 */
export function useLocationSearch(
  query: string,
  type?: LocationType,
  limit = 20,
) {
  const api = useApi();
  const [state, setState] = useState<FetchState<Location[]>>(
    INITIAL_STATE as FetchState<Location[]>,
  );
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Min 2 chars
    if (!query || query.trim().length < 2) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await api.get<Location[]>('/locations/search', {
          params: {
            q: query.trim(),
            type,
            limit,
          },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setState({ data: data ?? [], loading: false, error: null });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof ApiError ? err.message : 'Gagal cari lokasi';
        setState({ data: null, loading: false, error: message });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [api, query, type, limit]);

  return state;
}

// ════════════════════════════════════════════════════════════════
// 4. useLocationBreadcrumb — Parent chain
// ════════════════════════════════════════════════════════════════

export function useLocationBreadcrumb(locationId: string | null) {
  const api = useApi();
  const [state, setState] = useState<FetchState<LocationBreadcrumb>>(
    INITIAL_STATE as FetchState<LocationBreadcrumb>,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!locationId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({ ...s, loading: true, error: null }));

    api
      .get<LocationBreadcrumb>(`/locations/breadcrumb/${locationId}`, {
        signal: controller.signal,
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof ApiError ? err.message : 'Gagal load breadcrumb';
        setState({ data: null, loading: false, error: message });
      });

    return () => abortRef.current?.abort();
  }, [api, locationId]);

  return state;
}

// ════════════════════════════════════════════════════════════════
// 5. useReverseGeo — GPS lookup (manual trigger only)
// ════════════════════════════════════════════════════════════════

/**
 * Reverse geocode GPS → nearest kelurahan/desa.
 * Manual trigger only (gak auto-run, harus call execute()).
 *
 * Phase 1 NOTE: latitude/longitude masih NULL di DB,
 *   so result.data akan null sampai koordinat di-seed Phase 2.
 *   Frontend HARUS handle null gracefully (fallback manual pick).
 */
export function useReverseGeo() {
  const api = useApi();
  const [state, setState] = useState<FetchState<ReverseGeoResult | null>>(
    INITIAL_STATE as FetchState<ReverseGeoResult | null>,
  );

  const execute = useCallback(
    async (lat: number, lng: number, maxKm = 50) => {
      setState({ data: null, loading: true, error: null });

      try {
        const data = await api.get<ReverseGeoResult | null>(
          '/locations/reverse-geo',
          {
            params: { lat, lng, max_km: maxKm },
          },
        );
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal deteksi lokasi GPS';
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [api],
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE as FetchState<ReverseGeoResult | null>);
  }, []);

  return { ...state, execute, reset };
}
