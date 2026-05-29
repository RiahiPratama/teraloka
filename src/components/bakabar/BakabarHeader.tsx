'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  // Wilayah
  Globe, MapPin, Building2, Anchor, Flame,
  // Topik
  Newspaper, Landmark, Wallet, HeartHandshake, Ship, Trophy,
  Stethoscope, GraduationCap, Drama, Cpu, Cloud, MessageSquare,
  // Layanan
  Megaphone, Home, Heart,
  // Avatar dropdown
  User, FileText, Briefcase, Sparkles, Settings, LogOut, Search, ChevronDown,
  Menu, X,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════
// BAKABAR HEADER — Detik-style header v3 (29 Mei 2026)
// PATH: src/components/bakabar/BakabarHeader.tsx
// ────────────────────────────────────────────────────────────────
// v3 (29 Mei malam):
//   - Drawer z-index raised ke z-[75] supaya di atas Ticker (z-70)
//   - Drawer content: WILAYAH (13) + TOPIK (12) + LAYANAN (5+1)
//   - Avatar dropdown popover dengan user-specific menu
//   - SEMUA emoji icons diganti dengan Lucide React icons (premium look)
// ════════════════════════════════════════════════════════════════

const NAV_LINKS = [
  { label: 'BAKABAR',  href: '/bakabar',     Icon: Newspaper },
  { label: 'BALAPOR',  href: '/reports',     Icon: Megaphone },
  { label: 'BAPASIAR', href: '/speed',       Icon: Ship },
  { label: 'BAKOS',    href: '/kos',         Icon: Home },
  { label: 'BADONASI', href: '/fundraising', Icon: Heart },
];

const WILAYAH_ITEMS = [
  { key: 'nasional', label: 'Nasional',     Icon: Globe },
  { key: 'ternate',  label: 'Ternate',      Icon: MapPin },
  { key: 'tidore',   label: 'Tidore',       Icon: MapPin },
  { key: 'sofifi',   label: 'Sofifi',       Icon: Building2 },
  { key: 'halbar',   label: 'Halbar',       Icon: MapPin },
  { key: 'halut',    label: 'Halut',        Icon: MapPin },
  { key: 'halteng',  label: 'Halteng',      Icon: MapPin },
  { key: 'halsel',   label: 'Halsel',       Icon: MapPin },
  { key: 'haltim',   label: 'Haltim',       Icon: MapPin },
  { key: 'morotai',  label: 'Kep. Morotai', Icon: Anchor },
  { key: 'sula',     label: 'Kep. Sula',    Icon: Anchor },
  { key: 'taliabu',  label: 'P. Taliabu',   Icon: Anchor },
  { key: 'viral',    label: 'Viral Medsos', Icon: Flame },
];

const TOPIK_ITEMS = [
  { key: 'berita',       label: 'Berita',       Icon: Newspaper },
  { key: 'politik',      label: 'Politik',      Icon: Landmark },
  { key: 'ekonomi',      label: 'Ekonomi',      Icon: Wallet },
  { key: 'sosial',       label: 'Sosial',       Icon: HeartHandshake },
  { key: 'transportasi', label: 'Transportasi', Icon: Ship },
  { key: 'olahraga',     label: 'Olahraga',     Icon: Trophy },
  { key: 'kesehatan',    label: 'Kesehatan',    Icon: Stethoscope },
  { key: 'pendidikan',   label: 'Pendidikan',   Icon: GraduationCap },
  { key: 'budaya',       label: 'Budaya',       Icon: Drama },
  { key: 'teknologi',    label: 'Teknologi',    Icon: Cpu },
  { key: 'cuaca',        label: 'Cuaca',        Icon: Cloud },
  { key: 'opini',        label: 'Opini',        Icon: MessageSquare },
];

const PLACEHOLDERS = [
  'Cari berita di Ternate...',
  'Politik Maluku Utara...',
  'Olahraga Sofifi...',
  'Ekonomi Tidore...',
  'Pendidikan Halmahera...',
  'Budaya Ternate-Tidore...',
];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  super_admin:     { label: 'Super Admin',     color: '#fff',    bg: '#E8963A' },
  admin_content:   { label: 'Admin Konten',    color: '#fff',    bg: '#0891B2' },
  admin_transport: { label: 'Admin Transport', color: '#fff',    bg: '#6366F1' },
  admin_listing:   { label: 'Admin Listing',   color: '#fff',    bg: '#8B5CF6' },
  admin_funding:   { label: 'Admin Funding',   color: '#fff',    bg: '#1B6B4A' },
  user:            { label: 'Pengguna',        color: '#374151', bg: '#E5E7EB' },
};

export default function BakabarHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  function handleNavClick(e: React.MouseEvent, href: string, closeMenu?: () => void) {
    if (pathname === href) {
      e.preventDefault();
      router.replace(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    closeMenu?.();
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen]         = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const avatarRef      = useRef<HTMLDivElement>(null);

  function navigateBakabar(nav?: string, topic?: string) {
    const params = new URLSearchParams();
    if (nav && nav !== 'terbaru')  params.set('nav', nav);
    if (topic)                     params.set('topic', topic);
    const qs = params.toString();
    router.push(qs ? `/bakabar?${qs}` : '/bakabar');
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '/' && !inInput) { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    function onClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [avatarOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/bakabar?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  function handleLogout() {
    logout();
    setMobileMenuOpen(false);
    router.push('/');
  }

  const isAdmin = user?.role === 'super_admin' || (user?.role ?? '').startsWith('admin_');
  const roleMeta = ROLE_META[user?.role ?? 'user'] ?? ROLE_META.user;

  return (
    <>
      <header
        className="fixed top-[36px] left-0 right-0 z-[60] bg-white"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {/* ─── ROW 1: Semua element dalam col-3 (main 1000px) — sejajar Hero kiri+kanan ─── */}
        <div className="border-b border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 20px minmax(0, 1000px) 20px 160px',
                justifyContent: 'center',
                alignItems: 'center',
                height: 56,
              }}
            >

              {/* COL 1: empty (left sky-space) */}
              <div />
              {/* COL 2: gap */}
              <div />

              {/* COL 3 (main 1000px): hamburger + BAKABAR + [spacer] + Search center + [spacer] + Avatar */}
              <div className="flex items-center gap-3 min-w-0">

                {/* Hamburger (icon only, no MENU text) */}
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                  aria-label="Menu utama"
                >
                  <Menu size={20} strokeWidth={2.25} className="text-gray-700" />
                </button>

                {/* BAKABAR plain text — no background, brand color via CategoryTabs */}
                <Link
                  href="/bakabar"
                  onClick={e => handleNavClick(e, '/bakabar')}
                  className="shrink-0 flex items-center transition-colors hover:opacity-70"
                  style={{
                    color: '#1F2937',
                    fontWeight: 800,
                    fontSize: 18,
                    letterSpacing: 0.6,
                    fontFamily: 'var(--font-sora), sans-serif',
                  }}
                  aria-label="BAKABAR Home"
                >
                  BAKABAR
                </Link>

                {/* Spacer kiri (push Search ke tengah) */}
                <div className="flex-1 min-w-0" />

                {/* Search di TENGAH (max 500px) */}
                <form onSubmit={handleSearch} className="shrink-0" style={{ width: '100%', maxWidth: 500 }}>
                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-2 transition-all"
                    style={{ background: '#F1F5F9', border: '1.5px solid transparent' }}
                    onFocusCapture={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)';
                    }}
                    onBlurCapture={e => {
                      e.currentTarget.style.background = '#F1F5F9';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <Search size={16} strokeWidth={2.25} className="shrink-0 text-gray-500" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={PLACEHOLDERS[placeholderIdx]}
                      className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder:text-gray-400"
                      aria-label="Pencarian"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Bersihkan">
                        ✕
                      </button>
                    )}
                  </div>
                </form>

                {/* Spacer kanan (push Avatar ke right edge main) */}
                <div className="flex-1 min-w-0" />

                {/* Avatar / Login + Dropdown popover */}
                <div className="flex items-center gap-2 shrink-0" ref={avatarRef}>
                  {user ? (
                    <div className="relative">
                      <button
                        onClick={() => setAvatarOpen(o => !o)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Akun saya"
                        aria-expanded={avatarOpen}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B6B4A] text-xs font-bold text-white">
                          {user.name ? user.name[0].toUpperCase() : '+'}
                        </div>
                        <span className="hidden md:inline text-[13px] font-semibold text-gray-800 truncate max-w-[100px]">
                          {user.name ?? 'Pengguna'}
                        </span>
                        <ChevronDown size={14} strokeWidth={2.25} className="hidden md:inline text-gray-400 transition-transform" style={{ transform: avatarOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </button>

                      {/* DROPDOWN POPOVER */}
                      {avatarOpen && (
                        <div
                          className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[70]"
                          style={{ width: 280, animation: 'avatarPopIn 0.18s ease-out' }}
                        >
                          <style>{`
                            @keyframes avatarPopIn {
                              from { opacity: 0; transform: translateY(-8px); }
                              to   { opacity: 1; transform: translateY(0); }
                            }
                          `}</style>

                          {/* Header: avatar + nama + role */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)' }}>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1B6B4A] font-bold text-white text-base shrink-0">
                              {user.name ? user.name[0].toUpperCase() : '+'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-sm truncate">{user.name ?? 'Pengguna'}</p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5"
                                style={{ background: roleMeta.bg, color: roleMeta.color }}>
                                {roleMeta.label}
                              </span>
                            </div>
                          </div>

                          {/* Menu: Akun Saya */}
                          <div className="py-1">
                            <Link href="/profile" onClick={() => setAvatarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                              <User size={16} strokeWidth={2} className="text-gray-500" />
                              <span>Profil Saya</span>
                            </Link>
                            <Link href="/profile/donations" onClick={() => setAvatarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                              <Heart size={16} strokeWidth={2} className="text-gray-500" />
                              <span>Donasi Saya</span>
                            </Link>
                            <Link href="/my-reports" onClick={() => setAvatarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                              <FileText size={16} strokeWidth={2} className="text-gray-500" />
                              <span>Laporan Saya</span>
                            </Link>
                          </div>

                          {/* Galang Dana */}
                          <div className="py-1 border-t border-gray-100">
                            <Link href="/owner" onClick={() => setAvatarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                              <Briefcase size={16} strokeWidth={2} className="text-gray-500" />
                              <span>Portal Mitra</span>
                            </Link>
                            <Link href="/owner/funding/campaigns/new/info" onClick={() => setAvatarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-gray-50 transition-colors"
                              style={{ color: '#1B6B4A' }}>
                              <Sparkles size={16} strokeWidth={2} />
                              <span>Ajukan Campaign</span>
                            </Link>
                          </div>

                          {/* Tools Admin (kondisional) */}
                          {isAdmin && (
                            <div className="py-1 border-t border-gray-100">
                              <Link href="/admin" onClick={() => setAvatarOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                                style={{ color: roleMeta.bg }}>
                                <Settings size={16} strokeWidth={2} />
                                <span>Admin Dashboard</span>
                              </Link>
                            </div>
                          )}

                          {/* Logout */}
                          <div className="py-1 border-t border-gray-100">
                            <button onClick={() => { handleLogout(); setAvatarOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors text-left">
                              <LogOut size={16} strokeWidth={2} />
                              <span>Keluar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Link href="/login"
                        className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-[13px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                        Masuk
                      </Link>
                      <Link href="/login"
                        className="px-3 py-1.5 rounded-full text-[12.5px] font-bold text-white whitespace-nowrap"
                        style={{ background: '#8B5CF6' }}>
                        Daftar
                      </Link>
                    </>
                  )}
                </div>

              </div>

              {/* COL 4: gap */}
              <div />
              {/* COL 5: empty (right sky-space) */}
              <div />

            </div>
          </div>
        </div>

        {/* Row 2 gradient blue 5 layanan DIHAPUS 29 Mei sore — redundant
            dengan hamburger menu yang sudah berisi 5 layanan + akses lainnya. */}
      </header>

      {/* ═══ MENU OVERLAY (slide from LEFT drawer, di atas Ticker z-70) ═══ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[75]"
          onClick={() => setMobileMenuOpen(false)}
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div
            className="absolute top-0 left-0 bottom-0 bg-white shadow-2xl overflow-y-auto"
            style={{
              width: 320,
              maxWidth: '85vw',
              animation: 'slideInLeft 0.25s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to   { transform: translateX(0); }
              }
            `}</style>

            <div className="px-5 py-5">

              {/* Header drawer: branding + close button */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-white text-[13px] font-extrabold tracking-wide"
                    style={{ background: '#8B5CF6', fontFamily: 'var(--font-sora), sans-serif' }}
                  >
                    BAKABAR
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">Maluku Utara</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
                  aria-label="Tutup menu">
                  <X size={18} strokeWidth={2.25} />
                </button>
              </div>

              {/* ─── SECTION 1: WILAYAH ─── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider">Wilayah</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {WILAYAH_ITEMS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => navigateBakabar(key)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] text-gray-700 font-medium hover:bg-[#EDE9FE] hover:text-[#5B21B6] transition-colors text-left group"
                    >
                      <Icon size={16} strokeWidth={2} className="shrink-0 text-gray-500 group-hover:text-[#8B5CF6]" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── SECTION 2: TOPIK ─── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider">Topik</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TOPIK_ITEMS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => navigateBakabar(undefined, key)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] text-gray-700 font-medium hover:bg-[#EDE9FE] hover:text-[#5B21B6] transition-colors text-left group"
                    >
                      <Icon size={16} strokeWidth={2} className="shrink-0 text-gray-500 group-hover:text-[#8B5CF6]" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── SECTION 3: LAYANAN TERALOKA ─── */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider">Layanan TeraLoka</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Beranda TeraLoka — accent */}
                <Link href="/"
                  onClick={(e) => handleNavClick(e, '/', () => setMobileMenuOpen(false))}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[13px] transition-colors hover:bg-[#EDE9FE] mb-2"
                  style={{ color: '#5B21B6', border: '1.5px solid #8B5CF6', background: '#FAF5FF' }}>
                  <Home size={17} strokeWidth={2} />
                  <span>Beranda TeraLoka</span>
                </Link>

                {/* 5 Layanan grid */}
                <div className="grid grid-cols-1 gap-1.5">
                  {NAV_LINKS.map(({ label, href, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={(e) => handleNavClick(e, href, () => setMobileMenuOpen(false))}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <Icon size={17} strokeWidth={2} className="text-gray-500" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Login/Daftar kalau belum login */}
              {!user && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-center border border-gray-200 hover:bg-gray-50"
                    style={{ color: 'var(--text-muted)' }}>
                    Masuk
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white text-center"
                    style={{ background: '#8B5CF6' }}>
                    Daftar
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
