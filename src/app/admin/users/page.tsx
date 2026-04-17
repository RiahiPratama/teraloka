'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface User {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  listing_summary: Record<string, number> | null;
}

const ROLES = [
  { value: 'service_user',    label: 'User Biasa',      color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  { value: 'owner_listing',   label: 'Owner Listing',   color: '#0891B2', bg: 'rgba(8,145,178,0.1)'   },
  { value: 'operator_speed',  label: 'Operator Speed',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  { value: 'operator_ship',   label: 'Operator Kapal',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
  { value: 'admin_content',   label: 'Admin Konten',    color: '#E8963A', bg: 'rgba(232,150,58,0.1)'  },
  { value: 'admin_transport', label: 'Admin Transport', color: '#E8963A', bg: 'rgba(232,150,58,0.1)'  },
  { value: 'admin_listing',   label: 'Admin Listing',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)'  },
  { value: 'admin_funding',   label: 'Admin Funding',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)'  },
  { value: 'super_admin',     label: 'Super Admin',     color: '#1B6B4A', bg: 'rgba(27,107,74,0.1)'   },
];

const ROLE_FILTERS = [
  { value: '',               label: 'Semua'         },
  { value: 'service_user',   label: 'User Biasa'    },
  { value: 'owner_listing',  label: 'Owner'         },
  { value: 'admin_content',  label: 'Admin Konten'  },
  { value: 'super_admin',    label: 'Super Admin'   },
];

function getRoleStyle(role: string) {
  return ROLES.find(r => r.value === role) ?? { label: role, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' };
}

function formatPhone(phone: string) {
  if (phone.startsWith('62')) {
    const local = '0' + phone.slice(2);
    return '+62 ' + local.slice(1, 4) + '-' + local.slice(4, 8) + '-' + local.slice(8);
  }
  return phone;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  if (d < 30) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

type ModalType =
  | { type: 'role';       userId: string; userName: string; newRole: string }
  | { type: 'editName';   userId: string; currentName: string }
  | { type: 'editPhone';  userId: string; userName: string; currentPhone: string }
  | { type: 'deactivate'; userId: string; userName: string }
  | { type: 'activate';   userId: string; userName: string }
  | { type: 'delete';     userId: string; userName: string };

function UserAvatar({ name, role, isActive }: { name: string | null; role: string; isActive: boolean }) {
  const st      = getRoleStyle(role);
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `linear-gradient(135deg, ${st.color}50, ${st.color}25)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: st.color,
        border: `2px solid ${st.color}30`,
      }}>
        {initial}
      </div>
      {!isActive && (
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#fff', fontWeight: 800 }}>✕</div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const { t } = useContext(AdminThemeContext);

  const [users, setUsers]               = useState<User[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal]               = useState<ModalType | null>(null);
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
    setEditNameInput('');
    setEditPhoneInput('');
    setEditPhoneReason('');
    setDeleteConfirmInput('');
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
      setUsers(data.data.data);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat users', false);
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Actions ──────────────────────────────────────────────────────
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
    } catch (err: any) { showToast(err.message || 'Gagal update role', false); }
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
    } catch (err: any) { showToast(err.message || 'Gagal ubah nama', false); }
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
    } catch (err: any) { showToast(err.message || 'Gagal ubah nomor', false); }
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
    } catch (err: any) { showToast(err.message || 'Gagal update status', false); }
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
    } catch (err: any) { showToast(err.message || 'Gagal hapus user', false); }
    finally { setActionLoading(null); }
  };

  // Stats
  const roleCounts  = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {} as Record<string, number>);
  const activeCount = users.filter(u => u.is_active !== false).length;
  const inactiveCount = users.filter(u => u.is_active === false).length;

  // Modal background color
  const modalBg = t.sidebar;
  const modalBorder = t.sidebarBorder;
  const modalText = t.textPrimary;
  const modalSub = t.textDim;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .usr-row:hover { background: ${t.navHover} !important; }
        .usr-btn:hover { opacity: 0.8; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── MODALS ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: modalBg, borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: `1px solid ${modalBorder}` }}>

            {/* Role Modal */}
            {modal.type === 'role' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: modalText, textAlign: 'center', marginBottom: 8 }}>Konfirmasi Ubah Role</h3>
                <p style={{ color: modalSub, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
                  Ubah role <strong style={{ color: modalText }}>{modal.userName}</strong> menjadi{' '}
                  <strong style={{ color: getRoleStyle(modal.newRole).color }}>{getRoleStyle(modal.newRole).label}</strong>?
                </p>
                {modal.newRole === 'super_admin' && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#EF4444', textAlign: 'center' }}>
                    ⚠️ Super Admin punya akses penuh ke seluruh platform!
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${modalBorder}`, background: 'transparent', color: modalText, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => updateRole(modal.userId, modal.newRole)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: modal.newRole === 'super_admin' ? '#EF4444' : '#1B6B4A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ya, Ubah</button>
                </div>
              </>
            )}

            {/* Edit Name */}
            {modal.type === 'editName' && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: modalText, marginBottom: 4 }}>✏️ Edit Nama</h3>
                <p style={{ color: modalSub, fontSize: 12, marginBottom: 16 }}>Nama ini akan tampil di platform TeraLoka</p>
                <input value={editNameInput} onChange={e => setEditNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName(modal.userId)}
                  placeholder="Nama lengkap..." autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `2px solid #1B6B4A`, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: modalText }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${modalBorder}`, background: 'transparent', color: modalText, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => saveName(modal.userId)} disabled={!editNameInput.trim()} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editNameInput.trim() ? '#1B6B4A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editNameInput.trim() ? 'pointer' : 'not-allowed' }}>Simpan</button>
                </div>
              </>
            )}

            {/* Edit Phone */}
            {modal.type === 'editPhone' && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: modalText, marginBottom: 4 }}>📱 Ganti Nomor WA</h3>
                <p style={{ color: modalSub, fontSize: 12, marginBottom: 4 }}>User: <strong style={{ color: modalText }}>{modal.userName}</strong></p>
                <p style={{ color: modalSub, fontSize: 12, marginBottom: 12 }}>Nomor saat ini: <strong style={{ color: modalText }}>{formatPhone(modal.currentPhone)}</strong></p>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#EF4444' }}>
                  ⚠️ JWT lama tetap valid sampai expired (30 hari).
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: modalText, display: 'block', marginBottom: 6 }}>Nomor WA Baru</label>
                <input value={editPhoneInput} onChange={e => setEditPhoneInput(e.target.value)} placeholder="628XXXXXXXXXX" autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #E8963A', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box', background: t.mainBg, color: modalText }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: modalText, display: 'block', marginBottom: 6 }}>Alasan <span style={{ color: modalSub, fontWeight: 400 }}>(opsional)</span></label>
                <input value={editPhoneReason} onChange={e => setEditPhoneReason(e.target.value)} placeholder="HP hilang, ganti kartu, dll..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${modalBorder}`, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: modalText }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${modalBorder}`, background: 'transparent', color: modalText, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => savePhone(modal.userId)} disabled={!editPhoneInput.trim()} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editPhoneInput.trim() ? '#E8963A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editPhoneInput.trim() ? 'pointer' : 'not-allowed' }}>Ganti Nomor</button>
                </div>
              </>
            )}

            {/* Deactivate */}
            {modal.type === 'deactivate' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🚫</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: modalText, textAlign: 'center', marginBottom: 8 }}>Nonaktifkan Akun</h3>
                <p style={{ color: modalSub, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  <strong style={{ color: modalText }}>{modal.userName}</strong> tidak bisa login sampai diaktifkan kembali.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${modalBorder}`, background: 'transparent', color: modalText, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => toggleActive(modal.userId, false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Nonaktifkan</button>
                </div>
              </>
            )}

            {/* Activate */}
            {modal.type === 'activate' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>✅</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: modalText, textAlign: 'center', marginBottom: 8 }}>Aktifkan Akun</h3>
                <p style={{ color: modalSub, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  Aktifkan kembali akun <strong style={{ color: modalText }}>{modal.userName}</strong>?
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${modalBorder}`, background: 'transparent', color: modalText, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => toggleActive(modal.userId, true)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Aktifkan</button>
                </div>
              </>
            )}

            {/* Delete */}
            {modal.type === 'delete' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🗑️</div>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>Hapus Permanen</h3>
                <p style={{ color: modalSub, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  Akun <strong style={{ color: modalText }}>{modal.userName}</strong> akan dihapus permanen. <strong style={{ color: '#EF4444' }}>Tidak bisa dibatalkan!</strong>
                </p>
                <p style={{ fontSize: 12, color: modalText, marginBottom: 8, fontWeight: 600 }}>
                  Ketik <code style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '1px 6px', borderRadius: 4 }}>HAPUS</code> untuk konfirmasi:
                </p>
                <input value={deleteConfirmInput} onChange={e => setDeleteConfirmInput(e.target.value)} placeholder="Ketik HAPUS..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #EF4444', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', background: t.mainBg, color: modalText }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${modalBorder}`, background: 'transparent', color: modalText, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>👥 Manajemen Users</h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>{total} user terdaftar</p>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      {!loading && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',      value: total,        color: '#1B6B4A', bg: 'rgba(27,107,74,0.08)'   },
            { label: 'Aktif',      value: activeCount,  color: '#10B981', bg: 'rgba(16,185,129,0.08)'  },
            { label: 'Nonaktif',   value: inactiveCount,color: '#EF4444', bg: 'rgba(239,68,68,0.08)', hidden: inactiveCount === 0 },
            ...Object.entries(roleCounts)
              .filter(([role]) => role !== 'service_user')
              .map(([role, count]) => {
                const st = getRoleStyle(role);
                return { label: st.label, value: count, color: st.color, bg: st.bg };
              }),
          ].filter(s => !s.hidden).map((s, i) => (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}25`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: t.textDim, fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── FILTER & SEARCH ── */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Role filter pills */}
        <div style={{ display: 'flex', gap: 4, background: t.mainBg, borderRadius: 8, padding: 3, border: `1px solid ${t.sidebarBorder}` }}>
          {ROLE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setRoleFilter(f.value)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: roleFilter === f.value ? '#1B6B4A' : 'transparent', color: roleFilter === f.value ? '#fff' : t.textDim, transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>

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
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDim, fontSize: 14, padding: 0 }}>✕</button>
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
      {!loading && users.length > 0 && (
        <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 140px 100px 100px 160px', padding: '10px 16px', background: t.mainBg, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 10, fontWeight: 800, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', gap: 12, alignItems: 'center' }}>
            <span></span>
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Bergabung</span>
            <span>Aksi</span>
          </div>

          {/* Table rows */}
          {users.map((u, idx) => {
            const st           = getRoleStyle(u.role);
            const isCurrentUser= u.id === currentUser?.id;
            const isLoading    = actionLoading?.startsWith(u.id);
            const isActive     = u.is_active !== false;

            return (
              <div key={u.id} className="usr-row"
                style={{ display: 'grid', gridTemplateColumns: '44px 1fr 140px 100px 100px 160px', padding: '12px 16px', alignItems: 'center', gap: 12, borderBottom: idx < users.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none', background: !isActive ? 'rgba(239,68,68,0.02)' : 'transparent', transition: 'background 0.15s', opacity: !isActive ? 0.85 : 1 }}>

                {/* Avatar */}
                <UserAvatar name={u.name} role={u.role} isActive={isActive} />

                {/* User info */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || 'Belum isi nama'}
                    </span>
                    {isCurrentUser && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#1B6B4A', background: 'rgba(27,107,74,0.1)', padding: '1px 6px', borderRadius: 10, flexShrink: 0 }}>KAMU</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: t.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatPhone(u.phone)}
                  </div>
                  {/* Listing summary */}
                  {u.listing_summary && Object.keys(u.listing_summary).length > 0 && (
                    <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
                      {Object.entries(u.listing_summary).map(([type, count]) => `${type}(${count})`).join(' · ')}
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  {isCurrentUser ? (
                    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>
                      {st.label}
                    </span>
                  ) : isLoading ? (
                    <span style={{ fontSize: 11, color: t.textDim }}>Memproses...</span>
                  ) : (
                    <select value={u.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        if (newRole === u.role) return;
                        setModal({ type: 'role', userId: u.id, userName: u.name || formatPhone(u.phone), newRole });
                      }}
                      style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 11, color: st.color, background: st.bg, cursor: 'pointer', fontWeight: 700, outline: 'none', width: '100%' }}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isActive ? '#10B981' : '#EF4444', display: 'inline-block' }}>
                    {isActive ? '● Aktif' : '✕ Nonaktif'}
                  </span>
                </div>

                {/* Bergabung */}
                <div style={{ fontSize: 11, color: t.textDim }}>{timeAgo(u.created_at)}</div>

                {/* Aksi */}
                <div>
                  {isCurrentUser ? (
                    <button onClick={() => { setEditNameInput(u.name || ''); setModal({ type: 'editName', userId: u.id, currentName: u.name || '' }); }}
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid #1B6B4A`, background: 'rgba(27,107,74,0.08)', color: '#1B6B4A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      ✏️ Edit Nama
                    </button>
                  ) : isLoading ? null : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Edit nama */}
                      <button onClick={() => { setEditNameInput(u.name || ''); setModal({ type: 'editName', userId: u.id, currentName: u.name || '' }); }}
                        title="Edit Nama" className="usr-btn"
                        style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${t.sidebarBorder}`, background: t.mainBg, color: t.textMuted, fontSize: 12, cursor: 'pointer' }}>
                        ✏️
                      </button>
                      {/* Edit WA */}
                      <button onClick={() => { setEditPhoneInput(u.phone); setModal({ type: 'editPhone', userId: u.id, userName: u.name || formatPhone(u.phone), currentPhone: u.phone }); }}
                        title="Ganti Nomor WA" className="usr-btn"
                        style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${t.sidebarBorder}`, background: t.mainBg, color: t.textMuted, fontSize: 12, cursor: 'pointer' }}>
                        📱
                      </button>
                      {/* Nonaktif / Aktif */}
                      {isActive ? (
                        <button onClick={() => setModal({ type: 'deactivate', userId: u.id, userName: u.name || formatPhone(u.phone) })}
                          title="Nonaktifkan" className="usr-btn"
                          style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: 12, cursor: 'pointer' }}>
                          🚫
                        </button>
                      ) : (
                        <button onClick={() => setModal({ type: 'activate', userId: u.id, userName: u.name || formatPhone(u.phone) })}
                          title="Aktifkan" className="usr-btn"
                          style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10B981', fontSize: 12, cursor: 'pointer' }}>
                          ✅
                        </button>
                      )}
                      {/* Hapus */}
                      <button onClick={() => setModal({ type: 'delete', userId: u.id, userName: u.name || formatPhone(u.phone) })}
                        title="Hapus Permanen" className="usr-btn"
                        style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
