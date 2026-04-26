import { createClient } from '@supabase/supabase-js'

/**
 * ════════════════════════════════════════════════════════════════
 * Admin Supabase Client — SERVICE ROLE
 * ────────────────────────────────────────────────────────────────
 * 
 * USAGE:
 *   - Server-side ONLY (engines, API routes, server components)
 *   - Bypasses RLS for backend operations
 *   - Required for tables with RLS enabled (fraud_flags, trust_scores, etc.)
 * 
 * ⚠️  NEVER IMPORT IN:
 *   - Client components ('use client' files)
 *   - Middleware files
 *   - Browser-bound code
 * 
 * Use cases:
 *   ✅ src/lib/engine/*.ts (fraud, moderation, settlement, content)
 *   ✅ src/app/api/v1/**\/*.ts (API routes)
 *   ✅ src/app/admin/**\/page.tsx (server component admin pages)
 * 
 * For SSR with auth cookies: use ./server.ts createClient() instead
 * For browser interactions:  use ./client.ts createClient() instead
 * 
 * SECURITY:
 *   SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to client.
 *   It must be set as private env var (no NEXT_PUBLIC_ prefix).
 *   Vercel env config: type=Encrypted, scope=Production+Preview
 * ════════════════════════════════════════════════════════════════
 */

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      '[admin.ts] NEXT_PUBLIC_SUPABASE_URL is not set. ' +
      'Check your .env.local or Vercel env config.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      '[admin.ts] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'This is required for server-side operations that bypass RLS. ' +
      'Get it from Supabase Dashboard → Settings → API → service_role key. ' +
      'Add to Vercel env vars (PRIVATE, NOT NEXT_PUBLIC_).'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
