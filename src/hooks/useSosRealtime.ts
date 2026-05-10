'use client';

/**
 * TeraLoka — useSosRealtime Hook
 * Bridge Sprint Day 12 Step 7 Batch B1 (10 Mei 2026)
 * ------------------------------------------------------------
 * Hybrid realtime + polling fallback untuk admin SOS dashboard.
 *
 * Strategy (Saran X — establish first realtime pattern di TeraLoka):
 *   1. Subscribe ke Supabase Realtime channel `balapor.emergency_calls`
 *   2. Listen INSERT events → trigger callback onNew()
 *   3. Listen UPDATE events → trigger callback onUpdate()
 *   4. Polling fallback 60s — kalau realtime disconnect/error
 *
 * Pre-launch consideration:
 *   - First realtime usage di TeraLoka (Pattern UUU establishment)
 *   - Anon key already exposed via SSR pattern (acceptable)
 *   - RLS protect data — anon user SELECT only via emergency_calls policies
 *
 * Behaviors:
 *   - Auto-subscribe on mount
 *   - Auto-cleanup on unmount
 *   - Reconnect attempt setiap 10s kalau channel error
 *   - Polling fallback ALWAYS active (safety net)
 *
 * Hotfix 10 Mei 2026 evening:
 *   - Fix Supabase v2.103 API: remove `as 'system'` + `as never` type cast
 *   - Both `.on()` calls MUST happen BEFORE `.subscribe()`
 *   - Pattern reference: https://supabase.com/docs/guides/realtime/postgres-changes
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

// ─── Singleton Supabase Client untuk Realtime ──────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let realtimeClient: SupabaseClient | null = null;

function getRealtimeClient(): SupabaseClient {
  if (!realtimeClient) {
    realtimeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: false }, // realtime-only, no auth state
    });
  }
  return realtimeClient;
}

// ─── Hook Return Type ──────────────────────────────────────────

export interface UseSosRealtimeReturn {
  isConnected: boolean;
  lastEventAt: Date | null;
  manualRefresh: () => void;
}

export interface UseSosRealtimeOptions {
  /** Triggered saat ada SOS BARU INSERT */
  onNew?: (newSos: { id: string; display_id: string; emergency_type: string }) => void;
  /** Triggered saat SOS existing UPDATE (status change, etc) */
  onUpdate?: (updatedSos: { id: string; status: string }) => void;
  /** Triggered setiap polling tick (untuk refetch list) */
  onPoll?: () => void;
  /** Polling interval ms (default 60000 = 60s) */
  pollIntervalMs?: number;
  /** Enable realtime — set false untuk testing polling-only */
  enableRealtime?: boolean;
}

// ─── Main Hook ─────────────────────────────────────────────────

export function useSosRealtime(options: UseSosRealtimeOptions = {}): UseSosRealtimeReturn {
  const {
    onNew,
    onUpdate,
    onPoll,
    pollIntervalMs = 60000,
    enableRealtime = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  // Refs untuk callbacks (avoid stale closures)
  const onNewRef = useRef(onNew);
  const onUpdateRef = useRef(onUpdate);
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onNewRef.current = onNew;
    onUpdateRef.current = onUpdate;
    onPollRef.current = onPoll;
  }, [onNew, onUpdate, onPoll]);

  const manualRefresh = useCallback(() => {
    onPollRef.current?.();
    setLastEventAt(new Date());
  }, []);

  // ─── Realtime Subscription ─────────────────────────────────
  useEffect(() => {
    if (!enableRealtime) {
      setIsConnected(false);
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('[useSosRealtime] Missing Supabase env vars, skip realtime');
      return;
    }

    const client = getRealtimeClient();
    let channel: RealtimeChannel | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    const setupChannel = () => {
      if (isCleanedUp) return;

      // Build channel dengan kedua listener BEFORE subscribe
      // Supabase v2.103 API: .on('postgres_changes', filter, callback)
      // BOTH .on() calls MUST chain BEFORE .subscribe()
      const newChannel = client.channel('admin-sos-realtime');

      // INSERT listener
      newChannel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'balapor',
          table: 'emergency_calls',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newRow = payload.new as Record<string, unknown>;
          if (!newRow) return;
          setLastEventAt(new Date());
          onNewRef.current?.({
            id: String(newRow.id),
            display_id: String(newRow.display_id ?? ''),
            emergency_type: String(newRow.emergency_type ?? ''),
          });
        },
      );

      // UPDATE listener
      newChannel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'balapor',
          table: 'emergency_calls',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newRow = payload.new as Record<string, unknown>;
          if (!newRow) return;
          setLastEventAt(new Date());
          onUpdateRef.current?.({
            id: String(newRow.id),
            status: String(newRow.status ?? ''),
          });
        },
      );

      // Subscribe SETELAH semua listener registered
      newChannel.subscribe((status) => {
        if (isCleanedUp) return;

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('[useSosRealtime] Connected to balapor.emergency_calls');
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setIsConnected(false);
          console.warn(`[useSosRealtime] Channel ${status}, retry in 10s`);

          // Cleanup current channel sebelum retry
          if (channel) {
            client.removeChannel(channel).catch(() => {
              // ignore cleanup errors
            });
            channel = null;
          }

          retryTimeout = setTimeout(() => {
            if (!isCleanedUp) setupChannel();
          }, 10000);
        }
      });

      channel = newChannel;
    };

    setupChannel();

    return () => {
      isCleanedUp = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) {
        client.removeChannel(channel).catch(() => {
          // ignore cleanup errors
        });
        channel = null;
      }
      setIsConnected(false);
    };
  }, [enableRealtime]);

  // ─── Polling Fallback (always active, safety net) ──────────
  useEffect(() => {
    if (pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      onPollRef.current?.();
      setLastEventAt(new Date());
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { isConnected, lastEventAt, manualRefresh };
}
