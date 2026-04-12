# TeraLoka Pre-Launch Checklist

## 1. Vercel Environment Variables
Buka Vercel Dashboard → teraloka → Settings → Environment Variables.
Tambahkan semua ini:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
NEXT_PUBLIC_APP_URL=https://teraloka.vercel.app
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

Ambil dari:
- Supabase: Dashboard → Settings → API
- PostHog: Project Settings → Project API Key
- Sentry: Settings → Projects → teraloka → Client Keys (DSN)

## 2. Custom Domain (Opsional)
Vercel → teraloka → Settings → Domains → Add `teraloka.com`

## 3. Jalankan Seed Data
Buka Supabase SQL Editor, paste isi file:
`supabase/migrations/20260412_009_seed_prelaunch.sql`

## 4. Setup Super Admin
Di Supabase SQL Editor:
```sql
-- Ganti USER_ID dengan auth.users.id kamu setelah login pertama kali
INSERT INTO public.user_roles (user_id, role) VALUES ('USER_ID', 'super_admin');
```

## 5. UptimeRobot Monitor
Buka UptimeRobot → Add Monitor:
- Type: HTTP(s)
- URL: https://teraloka.vercel.app (atau domain custom)
- Interval: 5 minutes

## 6. Pre-Launch Content Checklist
- [ ] 50-100 artikel BAKABAR pre-loaded
- [ ] 5-10 operator speed onboarded & trained
- [ ] 30-50 listing kos (mix tier) uploaded
- [ ] 20-30 listing properti
- [ ] 10-20 listing kendaraan rental
- [ ] 30-50 provider jasa (gratis bulan pertama)
- [ ] 1-2 campaign BASUMBANG aktif & verified
- [ ] Internal testing end-to-end semua 13 service
- [ ] Test di HP Samsung A-series / Redmi (target device)
- [ ] Test di jaringan 3G (throttle di DevTools)

## 7. Launch Day Checklist
- [ ] Semua env vars di Vercel production
- [ ] DNS pointing (jika custom domain)
- [ ] UptimeRobot aktif
- [ ] Sentry monitoring aktif
- [ ] PostHog tracking verified
- [ ] WA blast template siap
- [ ] Facebook event created
- [ ] Press release draft ready
- [ ] Target: 1,000+ visitors hari pertama
