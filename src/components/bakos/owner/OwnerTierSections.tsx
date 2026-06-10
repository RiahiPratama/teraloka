'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Tier-gated sections (Analytics + WA Reminder)
// PATH: src/components/bakos/owner/OwnerTierSections.tsx
// PENANDA: L5-OWNER-TIER-SECTIONS
// ────────────────────────────────────────────────────────────────
// Feature gating WAJAH: baca data.features → render fitur ATAU teaser upgrade.
//   Analytics  → Bisnis  (features.analytics)
//   WA Reminder→ Pro+    (features.waReminder)
// 🛡️ Data analytics DIHITUNG di backend (OTAK). Di sini cuma render.
//    Teaser = funnel upgrade: tier bawah lihat apa yang dilewatin.
// ════════════════════════════════════════════════════════════════

import { BarChart3, Bell, Lock, Crown, TrendingUp, Eye, MessageCircle } from 'lucide-react';
import { type OwnerOverview, BAKOS_TOKENS, formatRp } from './types';

const BRAND = BAKOS_TOKENS.accent;

// ── Teaser terkunci (CTA upgrade) ──
function LockedTeaser({
  icon, title, desc, cta, onUpgrade,
}: {
  icon: React.ReactNode; title: string; desc: string; cta: string; onUpgrade: () => void;
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: BAKOS_TOKENS.surfaceAlt, border: `1px dashed ${BAKOS_TOKENS.border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Lock size={12} style={{ color: BAKOS_TOKENS.textTertiary }} />
            <p className="text-sm font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>{title}</p>
          </div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: BAKOS_TOKENS.textSecondary }}>{desc}</p>
          <button onClick={onUpgrade} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl active:scale-95 transition-transform" style={{ background: BAKOS_TOKENS.accentBg, color: BRAND }}>
            <Crown size={13} /> {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Analytics (Bisnis) ──
function AnalyticsSection({ data }: { data: OwnerOverview }) {
  const a = data.analytics!;
  const maxViews = Math.max(1, ...a.per_listing.map((p) => p.views));
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} style={{ color: BRAND }} />
        <p className="text-sm font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>Performa Kos</p>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#854F0B,#B8860B)', color: '#fff' }}>Bisnis</span>
      </div>

      {/* ringkasan */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl p-3 text-center" style={{ background: BAKOS_TOKENS.surfaceAlt }}>
          <p className="text-lg font-extrabold flex items-center justify-center gap-1" style={{ color: BAKOS_TOKENS.textPrimary }}><Eye size={13} style={{ color: '#0891B2' }} />{a.total_views}</p>
          <p className="text-[10px] mt-0.5" style={{ color: BAKOS_TOKENS.textTertiary }}>Total Views</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: BAKOS_TOKENS.surfaceAlt }}>
          <p className="text-lg font-extrabold flex items-center justify-center gap-1" style={{ color: BAKOS_TOKENS.textPrimary }}><MessageCircle size={13} style={{ color: '#E8963A' }} />{a.total_contacts}</p>
          <p className="text-[10px] mt-0.5" style={{ color: BAKOS_TOKENS.textTertiary }}>Total Kontak</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: BAKOS_TOKENS.surfaceAlt }}>
          <p className="text-lg font-extrabold flex items-center justify-center gap-1" style={{ color: BAKOS_TOKENS.textPrimary }}><TrendingUp size={13} style={{ color: BRAND }} />{(a.contact_rate * 100).toFixed(0)}%</p>
          <p className="text-[10px] mt-0.5" style={{ color: BAKOS_TOKENS.textTertiary }}>Konversi</p>
        </div>
      </div>

      {/* top kos */}
      {a.top_listing && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: BAKOS_TOKENS.accentBg }}>
          <Crown size={14} style={{ color: BRAND }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: BRAND }}>Paling Diminati</p>
            <p className="text-xs font-bold truncate" style={{ color: BAKOS_TOKENS.textPrimary }}>{a.top_listing.title}</p>
          </div>
          <p className="text-xs font-bold shrink-0" style={{ color: BAKOS_TOKENS.textPrimary }}>{a.top_listing.views} views</p>
        </div>
      )}

      {/* bar per kos */}
      {a.per_listing.length > 0 ? (
        <div className="space-y-2.5">
          {a.per_listing.slice(0, 6).map((p) => (
            <div key={p.id}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="truncate font-medium" style={{ color: BAKOS_TOKENS.textSecondary, maxWidth: '60%' }}>{p.title}</span>
                <span className="font-bold shrink-0" style={{ color: BAKOS_TOKENS.textPrimary }}>
                  {p.views} <Eye size={9} className="inline" /> · {p.contacts} <MessageCircle size={9} className="inline" />
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BAKOS_TOKENS.surfaceAlt }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(p.views / maxViews) * 100}%`, background: BRAND }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-center py-3" style={{ color: BAKOS_TOKENS.textTertiary }}>Belum ada data — kos kamu belum dilihat pengunjung.</p>
      )}
    </div>
  );
}

// ── WA Reminder (Pro+) — shell ──
function ReminderSection() {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Bell size={16} style={{ color: BRAND }} />
        <p className="text-sm font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>Pengingat WhatsApp</p>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: BAKOS_TOKENS.accentBg, color: BRAND }}>Aktif</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: BAKOS_TOKENS.textSecondary }}>
        Paket kamu termasuk pengingat WA otomatis untuk penyewa (jatuh tempo sewa, info kos). Fitur pengaturan reminder akan segera tersedia di sini.
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl" style={{ background: BAKOS_TOKENS.surfaceAlt, color: BAKOS_TOKENS.textTertiary }}>
        <Bell size={13} /> Segera hadir
      </div>
    </div>
  );
}

// ── Orchestrator: render gated ──
export function OwnerTierSections({ data, onUpgrade }: { data: OwnerOverview; onUpgrade: () => void }) {
  const f = data.features;
  return (
    <div className="space-y-3 mb-5">
      {/* Analytics — Bisnis */}
      {f.analytics ? (
        <AnalyticsSection data={data} />
      ) : (
        <LockedTeaser
          icon={<BarChart3 size={18} style={{ color: BAKOS_TOKENS.textTertiary }} />}
          title="Performa Kos"
          desc="Lihat views, kontak, & kos paling diminati — pantau performa tiap kos kamu."
          cta="Upgrade ke Bisnis"
          onUpgrade={onUpgrade}
        />
      )}

      {/* WA Reminder — Pro+ */}
      {f.waReminder ? (
        <ReminderSection />
      ) : (
        <LockedTeaser
          icon={<Bell size={18} style={{ color: BAKOS_TOKENS.textTertiary }} />}
          title="Pengingat WhatsApp"
          desc="Kirim pengingat WA otomatis ke penyewa — jatuh tempo sewa & info kos tanpa repot."
          cta="Upgrade ke Pro"
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  );
}
