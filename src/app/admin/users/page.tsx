'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── SVG Icons ─────────────────────────────────────────────────────
const Icons = {
  Users:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  UserCheck:() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  UserX:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>,
  Clock:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Phone:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.54a16 16 0 0 0 5.55 5.55l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>,
  Ban:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  Check:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Plus:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  DotsH:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>,
};

interface User {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
  last_login: string | null;
  listing_summary: Record<string, number> | null;
}

const ROLES = [
  { value: 'service_user',    label: 'User',            color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  { value: 'owner_listing',   label: 'Owner',           color: '#0891B2', bg: 'rgba(8,145,178,0.12)'   },
  { value: 'operator_speed',  label: 'Operator Speed',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  { value: 'operator_ship',   label: 'Operator Kapal',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  { value: 'admin_content',   label: 'Admin Konten',    color: '#E8963A', bg: 'rgba(232,150,58,0.12)'  },
  { value: 'admin_transport', label: 'Admin Transport', color: '#E8963A', bg: 'rgba(232,150,58,0.12)'  },
  { value: 'admin_listing',   label: 'Admin Listing',   color: '#E8963A', bg: 'rgba(232,150,58,0.12)'  },
  { value: 'admin_funding',   label: 'Admin Funding',   color: '#E8963A', bg: 'rgba(232,150,58,0.12)'  },
  { value: 'super_admin',     label: 'Super Admin',     color: '#1B6B4A', bg: 'rgba(27,107,74,0.12)'   },
];

// Mapping role → portal groups
const ROLE_GROUPS: Record<string, { label: string; color: string }[]> = {
  super_admin:     [{ label: 'Semua Portal', color: '#1B6B4A' }],
  admin_content:   [{ label: 'BAKABAR', color: '#0891B2' }, { label: 'BALAPOR', color: '#EF4444' }],
  admin_transport: [{ label: 'BAPASIAR', color: '#8B5CF6' }],
  admin_listing:   [{ label: 'BAKOS', color: '#E8963A' }],
  admin_funding:   [{ label: 'BASUMBANG', color: '#10B981' }],
  owner_listing:   [{ label: 'Mitra', color: '#0891B2' }],
  operator_speed:  [{ label: 'Speedboat', color: '#8B5CF6' }],
  operator_ship:   [{ label: 'Kapal', color: '#8B5CF6' }],
  service_user:    [{ label: 'Publik', color: '#6B7280' }],
};

const ROLE_FILTERS = [
  { value: '',               label: 'Semua Role'    },
  { value: 'service_user',   label: 'User Biasa'    },
  { value: 'owner_listing',  label: 'Owner'         },
  { value: 'admin_content',  label: 'Admin Konten'  },
  { value: 'super_admin',    label: 'Super Admin'   },
];

const STATUS_FILTERS = [
  { value: '',     label: 'Semua Status' },
  { value: 'aktif',    label: 'Aktif'   },
  { value: 'nonaktif', label: 'Nonaktif'},
];

function getRoleStyle(role: string) {
  return ROLES.find(r => r.value === role) ?? { label: role, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
}

function formatPhone(phone: string) {
  if (phone.startsWith('62')) {
    const local = '0' + phone.slice(2);
    return '+62 ' + local.slice(1, 4) + '-' + local.slice(4, 8) + '-' + local.slice(8);
  }
  return phone;
}

function lastSeen(dateStr: string | null) {
  if (!dateStr) return 'Belum pernah';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} hari lalu`;
  if (d < 30) return `${Math.floor(d / 7)} minggu lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  if (d < 30)  return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

// Avatar component
function UserAvatar({ user, size = 36 }: { user: User; size?: number }) {
  const st = getRoleStyle(user.role);
  const [imgError, setImgError] = useState(false);

  if (user.avatar_url && !imgError) {
    return (
      <img src={user.avatar_url} onError={() => setImgError(true)} alt={user.name || '?'}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${st.color}30`, flexShrink: 0 }} />
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${st.color}50, ${st.color}25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: st.color, border: `2px solid ${st.color}30`, flexShrink: 0 }}>
      {initial}
    </div>
  );
}

type ModalType =
  | { type: 'invite' }
  | { type: 'role';       userId: string; userName: string; newRole: string }
  | { type: 'editName';   userId: string; currentName: string }
  | { type: 'editPhone';  userId: string; userName: string; currentPhone: string }
  | { type: 'deactivate'; userId: string; userName: string }
  | { type: 'activate';   userId: string; userName: string }
  | { type: 'delete';     userId: string; userName: string };

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const { t, dark } = useContext(AdminThemeContext);

  const [users, setUsers]             = useState<User[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab]     = useState('overview');
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal]             = useState<ModalType | null>(null);
  const [openMenuId, setOpenMenuId]   = useState<string | null>(null);
  const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down');

  // Input states
  const [invitePhone, setInvitePhone]         = useState('');
  const [inviteName, setInviteName]           = useState('');
  const [inviteRole, setInviteRole]           = useState('service_user');
  const [inviteLoading, setInviteLoading]     = useState(false);
  const [editNameInput, setEditNameInput]     = useState('');
  const [editPhoneInput, setEditPhoneInput]   = useState('');
  const [editPhoneReason, setEditPhoneReason] = useState('');
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const closeModal = () => {
    setModal(null);
    setInvitePhone('');
    setInviteName('');
    setInviteRole('service_user');
    setEditNameInput('');
    setEditPhoneInput('');
    setEditPhoneReason('');
    setDeleteConfirmInput('');
  };

  const inviteUser = async () => {
    if (!invitePhone.trim() || inviteLoading) return;
    setInviteLoading(true);
    try {
      const res  = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: invitePhone.trim(), name: inviteName.trim() || undefined, role: inviteRole }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`User berhasil ditambahkan! ✓`);
      closeModal();
      fetchUsers();
    } catch (err: any) { showToast(err.message || 'Gagal menambah user', false); }
    finally { setInviteLoading(false); }
  };

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search)     params.set('q', search);
      if (roleFilter) params.set('role', roleFilter);
      const res  = await fetch(`${API_URL}/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      let filtered = data.data.data;
      if (statusFilter === 'aktif')    filtered = filtered.filter((u: User) => u.is_active !== false);
      if (statusFilter === 'nonaktif') filtered = filtered.filter((u: User) => u.is_active === false);
      setUsers(filtered);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat users', false);
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Actions
  const updateRole = async (userId: string, newRole: string) => {
    setActionLoading(userId + 'role'); closeModal();
    try {
      const res  = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Role diubah ke ${getRoleStyle(newRole).label}`);
      fetchUsers();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setActionLoading(null); }
  };

  const saveName = async (userId: string) => {
    if (!editNameInput.trim()) return;
    setActionLoading(userId + 'name'); closeModal();
    try {
      const res  = await fetch(`${API_URL}/admin/users/${userId}/name`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editNameInput.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('Nama berhasil diubah ✓');
      fetchUsers();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setActionLoading(null); }
  };

  const savePhone = async (userId: string) => {
    if (!editPhoneInput.trim()) return;
    setActionLoading(userId + 'phone'); closeModal();
    try {
      const res  = await fetch(`${API_URL}/admin/users/${userId}/phone`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editPhoneInput.trim(), reason: editPhoneReason.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('Nomor WA berhasil diubah ✓');
      fetchUsers();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setActionLoading(null); }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setActionLoading(userId + 'active'); closeModal();
    try {
      const res  = await fetch(`${API_URL}/admin/users/${userId}/active`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(isActive ? 'Akun diaktifkan ✓' : 'Akun dinonaktifkan ✓');
      fetchUsers();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setActionLoading(null); }
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId + 'delete'); closeModal();
    try {
      const res  = await fetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('User berhasil dihapus');
      fetchUsers();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setActionLoading(null); }
  };

  // Stats
  const activeCount   = users.filter(u => u.is_active !== false).length;
  const inactiveCount = users.filter(u => u.is_active === false).length;
  const neverLogin    = users.filter(u => !u.last_login).length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .usr-row:hover  { background: ${t.navHover} !important; }
        .usr-btn:hover  { opacity: 0.75; }
        .menu-item:hover { background: ${t.navHover} !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── MODALS ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: t.sidebar, borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: `1px solid ${t.sidebarBorder}`, animation: 'fadeIn 0.2s ease' }}>

            {modal.type === 'invite' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(27,107,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Plus />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary }}>Tambah User Baru</h3>
                    <p style={{ color: t.textDim, fontSize: 12 }}>User bisa langsung login via OTP WA</p>
                  </div>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'block', marginBottom: 6 }}>
                  Nomor WA <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input value={invitePhone} onChange={e => setInvitePhone(e.target.value)}
                  placeholder="628123456789 atau 0812..." autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `2px solid #1B6B4A`, fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary }} />

                <label style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'block', marginBottom: 6 }}>
                  Nama <span style={{ color: t.textDim, fontWeight: 400 }}>(opsional)</span>
                </label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)}
                  placeholder="Nama lengkap karyawan..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary }} />

                <label style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'block', marginBottom: 6 }}>Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary, cursor: 'pointer' }}>
                  {ROLES.filter(r => r.value !== 'super_admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={inviteUser} disabled={!invitePhone.trim() || inviteLoading}
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: invitePhone.trim() && !inviteLoading ? '#1B6B4A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: invitePhone.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {inviteLoading ? (
                      <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Menambahkan...</>
                    ) : (
                      <><Icons.Plus /> Tambah User</>
                    )}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'role' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, textAlign: 'center', marginBottom: 8 }}>Konfirmasi Ubah Role</h3>
                <p style={{ color: t.textDim, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
                  Ubah role <strong style={{ color: t.textPrimary }}>{modal.userName}</strong> menjadi{' '}
                  <strong style={{ color: getRoleStyle(modal.newRole).color }}>{getRoleStyle(modal.newRole).label}</strong>?
                </p>
                {modal.newRole === 'super_admin' && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#EF4444', textAlign: 'center' }}>
                    ⚠️ Super Admin punya akses penuh ke seluruh platform!
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => updateRole(modal.userId, modal.newRole)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: modal.newRole === 'super_admin' ? '#EF4444' : '#1B6B4A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ya, Ubah</button>
                </div>
              </>
            )}

            {modal.type === 'editName' && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, marginBottom: 4 }}>✏️ Edit Nama</h3>
                <p style={{ color: t.textDim, fontSize: 12, marginBottom: 16 }}>Nama tampil di platform TeraLoka</p>
                <input value={editNameInput} onChange={e => setEditNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName(modal.userId)}
                  placeholder="Nama lengkap..." autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `2px solid #1B6B4A`, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => saveName(modal.userId)} disabled={!editNameInput.trim()} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editNameInput.trim() ? '#1B6B4A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editNameInput.trim() ? 'pointer' : 'not-allowed' }}>Simpan</button>
                </div>
              </>
            )}

            {modal.type === 'editPhone' && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, marginBottom: 12 }}><span style={{display:"flex",alignItems:"center",gap:8}}><Icons.Phone /> Ganti Nomor WA</span></h3>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#EF4444' }}>
                  ⚠️ JWT lama tetap valid sampai expired (30 hari).
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, display: 'block', marginBottom: 6 }}>Nomor WA Baru</label>
                <input value={editPhoneInput} onChange={e => setEditPhoneInput(e.target.value)} placeholder="628XXXXXXXXXX" autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #E8963A', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, display: 'block', marginBottom: 6 }}>Alasan <span style={{ color: t.textDim, fontWeight: 400 }}>(opsional)</span></label>
                <input value={editPhoneReason} onChange={e => setEditPhoneReason(e.target.value)} placeholder="HP hilang, ganti kartu, dll..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => savePhone(modal.userId)} disabled={!editPhoneInput.trim()} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editPhoneInput.trim() ? '#E8963A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editPhoneInput.trim() ? 'pointer' : 'not-allowed' }}>Ganti Nomor</button>
                </div>
              </>
            )}

            {modal.type === 'deactivate' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🚫</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, textAlign: 'center', marginBottom: 8 }}>Nonaktifkan Akun</h3>
                <p style={{ color: t.textDim, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  <strong style={{ color: t.textPrimary }}>{modal.userName}</strong> tidak bisa login sampai diaktifkan kembali.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => toggleActive(modal.userId, false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Nonaktifkan</button>
                </div>
              </>
            )}

            {modal.type === 'activate' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>✅</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: t.textPrimary, textAlign: 'center', marginBottom: 8 }}>Aktifkan Akun</h3>
                <p style={{ color: t.textDim, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  Aktifkan kembali akun <strong style={{ color: t.textPrimary }}>{modal.userName}</strong>?
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => toggleActive(modal.userId, true)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Aktifkan</button>
                </div>
              </>
            )}

            {modal.type === 'delete' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🗑️</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>Hapus Permanen</h3>
                <p style={{ color: t.textDim, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  Akun <strong style={{ color: t.textPrimary }}>{modal.userName}</strong> akan dihapus. <strong style={{ color: '#EF4444' }}>Tidak bisa dibatalkan!</strong>
                </p>
                <p style={{ fontSize: 12, color: t.textPrimary, marginBottom: 8, fontWeight: 600 }}>
                  Ketik <code style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '1px 6px', borderRadius: 4 }}>HAPUS</code> untuk konfirmasi:
                </p>
                <input value={deleteConfirmInput} onChange={e => setDeleteConfirmInput(e.target.value)} placeholder="Ketik HAPUS..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #EF4444', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: t.textPrimary }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => deleteUser(modal.userId)} disabled={deleteConfirmInput !== 'HAPUS'} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: deleteConfirmInput === 'HAPUS' ? '#EF4444' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleteConfirmInput === 'HAPUS' ? 'pointer' : 'not-allowed' }}>Hapus Permanen</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>
              <span style={{display:"flex",alignItems:"center",gap:8}}><Icons.Users /> Management User</span>
            </h1>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1B6B4A', background: 'rgba(27,107,74,0.1)', padding: '3px 10px', borderRadius: 20 }}>
              Super Admin
            </span>
          </div>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>
            {total} total user terdaftar
          </p>
        </div>
        <button onClick={() => setModal({ type: 'invite' })}
          style={{ padding: '8px 18px', borderRadius: 10, background: '#1B6B4A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icons.Plus /> Tambah User
        </button>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.sidebarBorder}` }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'groups',   label: 'Per Grup'  },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? '#1B6B4A' : t.textDim, background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #1B6B4A' : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── STATS ROW ── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Icons.Users />, label: 'Total Users',    value: total,        sub: `${activeCount} aktif`,         color: '#1B6B4A' },
            { icon: <Icons.UserCheck />, label: 'Aktif',          value: activeCount,  sub: 'Bisa login',                   color: '#10B981' },
            { icon: <Icons.UserX />, label: 'Nonaktif',       value: inactiveCount,sub: 'Akses diblokir',              color: '#EF4444' },
            { icon: <Icons.Clock />, label: 'Belum Login',    value: neverLogin,   sub: 'Belum pernah masuk',           color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: t.sidebar, borderRadius: 12, border: `1px solid ${t.sidebarBorder}`, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.mainBg, color: t.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Role filter */}
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: t.mainBg, color: t.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
          {ROLE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Search */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: t.mainBg, borderRadius: 8, padding: '6px 12px', border: `1px solid ${t.sidebarBorder}`, minWidth: 200 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textDim} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="Cari nama atau nomor WA..."
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: t.textPrimary, width: '100%' }} />
          {searchInput && (
            <button onClick={() => { setSearch(''); setSearchInput(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 14 }}>✕</button>
          )}
        </div>

        <button onClick={() => setSearch(searchInput)}
          style={{ padding: '7px 16px', borderRadius: 8, background: '#1B6B4A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Cari
        </button>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textDim }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat users...
        </div>
      )}

      {/* ── EMPTY ── */}
      {!loading && users.length === 0 && (
        <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
          <p style={{ color: t.textDim, fontSize: 13 }}>Tidak ada user ditemukan</p>
        </div>
      )}

      {/* ── TABLE ── */}
      {!loading && users.length > 0 && activeTab === 'overview' && (
        <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 180px 100px 110px 110px 100px', padding: '10px 16px', background: t.mainBg, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 10, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', gap: 10, alignItems: 'center' }}>
            <span></span>
            <span>Name</span>
            <span>Groups / Portal</span>
            <span>Status</span>
            <span>Role</span>
            <span>Last Seen</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          {users.map((u, idx) => {
            const st           = getRoleStyle(u.role);
            const isCurrentUser= u.id === currentUser?.id;
            const isLoading    = actionLoading?.startsWith(u.id);
            const isActive     = u.is_active !== false;
            const groups       = ROLE_GROUPS[u.role] ?? [{ label: 'Publik', color: '#6B7280' }];
            const isMenuOpen   = openMenuId === u.id;

            return (
              <div key={u.id} className="usr-row"
                style={{ display: 'grid', gridTemplateColumns: '48px 1fr 180px 100px 110px 110px 100px', padding: '11px 16px', alignItems: 'center', gap: 10, borderBottom: idx < users.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none', background: !isActive ? `rgba(239,68,68,0.02)` : 'transparent', transition: 'background 0.15s', opacity: isLoading ? 0.6 : 1 }}>

                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <UserAvatar user={u} size={36} />
                  {!isActive && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#EF4444', border: `2px solid ${t.sidebar}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 800 }}>✕</div>
                  )}
                </div>

                {/* Name */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || 'Belum isi nama'}
                    </span>
                    {isCurrentUser && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#1B6B4A', background: 'rgba(27,107,74,0.12)', padding: '1px 6px', borderRadius: 10, flexShrink: 0 }}>KAMU</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: t.textDim }}>{formatPhone(u.phone)}</div>
                </div>

                {/* Groups */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {groups.map(g => (
                    <span key={g.label} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${g.color}15`, color: g.color, border: `1px solid ${g.color}30`, whiteSpace: 'nowrap' }}>
                      {g.label}
                    </span>
                  ))}
                </div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isActive ? '#10B981' : '#EF4444', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10B981' : '#EF4444', display: 'inline-block' }} />
                    {isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Role */}
                <div>
                  {isCurrentUser ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: st.bg, color: st.color, display: 'inline-block' }}>{st.label}</span>
                  ) : (
                    <select value={u.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        if (newRole === u.role) return;
                        setModal({ type: 'role', userId: u.id, userName: u.name || formatPhone(u.phone), newRole });
                      }}
                      style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 11, color: st.color, background: st.bg, cursor: 'pointer', fontWeight: 700, outline: 'none', width: '100%' }}>
                      {ROLES.filter(r => r.value !== 'super_admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                </div>

                {/* Last Seen */}
                <div>
                  <div style={{ fontSize: 11, color: t.textPrimary, fontWeight: 500 }}>{lastSeen(u.last_login)}</div>
                  <div style={{ fontSize: 10, color: t.textDim }}>Gabung {timeAgo(u.created_at)}</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isCurrentUser ? (
                    <button onClick={() => { setEditNameInput(u.name || ''); setModal({ type: 'editName', userId: u.id, currentName: u.name || '' }); }}
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid #1B6B4A`, background: 'rgba(27,107,74,0.08)', color: '#1B6B4A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Edit
                    </button>
                  ) : (
                    <>
                      {/* Edit button */}
                      <button onClick={() => { setEditNameInput(u.name || ''); setModal({ type: 'editName', userId: u.id, currentName: u.name || '' }); }}
                        style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${t.sidebarBorder}`, background: t.mainBg, color: t.textPrimary, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Edit
                      </button>

                      {/* ··· dropdown menu */}
                      <div style={{ position: 'relative' }}>
                        <button data-menu="trigger"
                          onClick={e => {
                            e.stopPropagation();
                            if (!isMenuOpen) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              setMenuDirection(spaceBelow < 160 ? 'up' : 'down');
                            }
                            setOpenMenuId(isMenuOpen ? null : u.id);
                          }}
                          style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${t.sidebarBorder}`, background: isMenuOpen ? t.navActive : t.mainBg, color: t.textMuted, fontSize: 13, cursor: 'pointer', fontWeight: 800, lineHeight: 1 }}>
                          <Icons.DotsH />
                        </button>

                        {isMenuOpen && (
                          <div data-menu="dropdown" style={{ position: 'absolute', right: 0, ...(menuDirection === 'up' ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }), background: t.sidebar, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 99, minWidth: 160, overflow: 'hidden', animation: 'fadeIn 0.15s ease' }}>

                            <button className="menu-item" onClick={() => { setEditPhoneInput(u.phone); setModal({ type: 'editPhone', userId: u.id, userName: u.name || formatPhone(u.phone), currentPhone: u.phone }); setOpenMenuId(null); }}
                              style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.textPrimary, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{display:"flex",alignItems:"center",gap:8}}><Icons.Phone /> Ganti Nomor WA</span>
                            </button>

                            <div style={{ height: 1, background: t.sidebarBorder }} />

                            {isActive ? (
                              <button className="menu-item" onClick={() => { setModal({ type: 'deactivate', userId: u.id, userName: u.name || formatPhone(u.phone) }); setOpenMenuId(null); }}
                                style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#F59E0B', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{display:"flex",alignItems:"center",gap:8}}><Icons.Ban /> Nonaktifkan</span>
                              </button>
                            ) : (
                              <button className="menu-item" onClick={() => { setModal({ type: 'activate', userId: u.id, userName: u.name || formatPhone(u.phone) }); setOpenMenuId(null); }}
                                style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#10B981', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{display:"flex",alignItems:"center",gap:8}}><Icons.Check /> Aktifkan</span>
                              </button>
                            )}

                            <div style={{ height: 1, background: t.sidebarBorder }} />

                            <button className="menu-item" onClick={() => { setModal({ type: 'delete', userId: u.id, userName: u.name || formatPhone(u.phone) }); setOpenMenuId(null); }}
                              style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#EF4444', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{display:"flex",alignItems:"center",gap:8}}><Icons.Trash /> Hapus Permanen</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${t.sidebarBorder}`, background: t.mainBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: t.textDim }}>Menampilkan {users.length} dari {total} total</span>
            {total > 50 && (
              <span style={{ fontSize: 11, color: '#1B6B4A', fontWeight: 600 }}>Scroll untuk lihat lebih banyak →</span>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS TAB ── */}
      {!loading && activeTab === 'groups' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {ROLES.map(role => {
            const roleUsers = users.filter(u => u.role === role.value);
            if (roleUsers.length === 0) return null;
            return (
              <div key={role.value} style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, display: 'flex', alignItems: 'center', gap: 8, background: `${role.color}08` }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: role.color, flex: 1 }}>{role.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: role.bg, color: role.color }}>{roleUsers.length}</span>
                </div>
                {roleUsers.slice(0, 5).map((u, i) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < Math.min(roleUsers.length, 5) - 1 ? `1px solid ${t.sidebarBorder}` : 'none' }}>
                    <UserAvatar user={u} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Belum isi nama'}</p>
                      <p style={{ fontSize: 10, color: t.textDim }}>{lastSeen(u.last_login)}</p>
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active !== false ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                  </div>
                ))}
                {roleUsers.length > 5 && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: '#1B6B4A', fontWeight: 600, textAlign: 'center', borderTop: `1px solid ${t.sidebarBorder}` }}>
                    +{roleUsers.length - 5} lainnya
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
