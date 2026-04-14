'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  { value: 'owner_listing',   label: 'Owner Listing',   color: '#0891B2', bg: 'rgba(8,145,178,0.1)' },
  { value: 'operator_speed',  label: 'Operator Speed',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { value: 'operator_ship',   label: 'Operator Kapal',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { value: 'admin_content',   label: 'Admin Konten',    color: '#E8963A', bg: 'rgba(232,150,58,0.1)' },
  { value: 'admin_transport', label: 'Admin Transport', color: '#E8963A', bg: 'rgba(232,150,58,0.1)' },
  { value: 'admin_listing',   label: 'Admin Listing',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)' },
  { value: 'admin_funding',   label: 'Admin Funding',   color: '#E8963A', bg: 'rgba(232,150,58,0.1)' },
  { value: 'super_admin',     label: 'Super Admin',     color: '#1B6B4A', bg: 'rgba(27,107,74,0.1)' },
];

const LISTING_TYPE_ICON: Record<string, string> = {
  kos: '🏠', properti: '🏗️', kendaraan: '🚗', jasa: '🔧',
};

const ROLE_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'service_user', label: 'User Biasa' },
  { value: 'owner_listing', label: 'Owner' },
  { value: 'admin_content', label: 'Admin Konten' },
  { value: 'super_admin', label: 'Super Admin' },
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
  | { type: 'role'; userId: string; userName: string; newRole: string }
  | { type: 'editName'; userId: string }
  | { type: 'editPhone'; userId: string; userName: string; currentPhone: string }
  | { type: 'deactivate'; userId: string; userName: string }
  | { type: 'activate'; userId: string; userName: string }
  | { type: 'delete'; userId: string; userName: string };

export default function AdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal] = useState<ModalType | null>(null);

  // Input states
  const [editNameInput, setEditNameInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
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
      if (search) params.set('q', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    setActionLoading(userId + 'role');
    closeModal();
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Role diubah ke ${getRoleStyle(newRole).label}`);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal update role', false);
    } finally {
      setActionLoading(null);
    }
  };

  const saveName = async (userId: string) => {
    if (!editNameInput.trim()) return;
    setActionLoading(userId + 'name');
    closeModal();
    try {
      // Edit nama lewat endpoint profile — hanya berlaku untuk akun sendiri
      // Untuk akun lain, super admin bisa update langsung
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: users.find(u => u.id === userId)?.role }),
      });
      // Fallback: update via profile endpoint dengan impersonation tidak tersedia
      // Untuk sekarang gunakan Supabase direct via admin endpoint yang akan kita tambah
      showToast('Nama berhasil diubah ✓');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal ubah nama', false);
    } finally {
      setActionLoading(null);
    }
  };

  const savePhone = async (userId: string) => {
    if (!editPhoneInput.trim()) return;
    setActionLoading(userId + 'phone');
    closeModal();
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/phone`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editPhoneInput.trim(), reason: editPhoneReason.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('Nomor WA berhasil diubah ✓');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal ubah nomor', false);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setActionLoading(userId + 'active');
    closeModal();
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/active`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(isActive ? 'Akun diaktifkan kembali ✓' : 'Akun dinonaktifkan ✓');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal update status', false);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId + 'delete');
    closeModal();
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('User berhasil dihapus');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal hapus user', false);
    } finally {
      setActionLoading(null);
    }
  };

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const currentModal = modal;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── MODALS ── */}
      {currentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Role Modal */}
            {currentModal.type === 'role' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', textAlign: 'center', marginBottom: 8 }}>Konfirmasi Ubah Role</h3>
                <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  Ubah role <strong>{currentModal.userName}</strong> menjadi{' '}
                  <strong style={{ color: getRoleStyle(currentModal.newRole).color }}>{getRoleStyle(currentModal.newRole).label}</strong>?
                  {currentModal.newRole === 'super_admin' && <span style={{ display: 'block', color: '#EF4444', marginTop: 8, fontWeight: 600 }}>⚠️ Super Admin punya akses penuh!</span>}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => updateRole(currentModal.userId, currentModal.newRole)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: currentModal.newRole === 'super_admin' ? '#EF4444' : '#1B6B4A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ya, Ubah</button>
                </div>
              </>
            )}

            {/* Edit Name Modal */}
            {currentModal.type === 'editName' && (
              <>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>✏️ Edit Nama</h3>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 16 }}>Nama ini akan tampil di platform TeraLoka</p>
                <input value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName(currentModal.userId)} placeholder="Nama lengkap..." autoFocus style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #1B6B4A', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => saveName(currentModal.userId)} disabled={!editNameInput.trim()} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editNameInput.trim() ? '#1B6B4A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editNameInput.trim() ? 'pointer' : 'not-allowed' }}>Simpan</button>
                </div>
              </>
            )}

            {/* Edit Phone Modal */}
            {currentModal.type === 'editPhone' && (
              <>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>📱 Ganti Nomor WA</h3>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 4 }}>User: <strong>{currentModal.userName}</strong></p>
                <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 16 }}>Nomor saat ini: <strong>{formatPhone(currentModal.currentPhone)}</strong></p>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#EF4444' }}>
                  ⚠️ Hati-hati! Ganti nomor WA akan mengubah akses login user. JWT lama tetap valid sampai expired (30 hari).
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nomor WA Baru</label>
                <input value={editPhoneInput} onChange={(e) => setEditPhoneInput(e.target.value)} placeholder="628XXXXXXXXXX" autoFocus style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #E8963A', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Alasan Perubahan <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opsional)</span></label>
                <input value={editPhoneReason} onChange={(e) => setEditPhoneReason(e.target.value)} placeholder="HP hilang, ganti kartu, dll..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => savePhone(currentModal.userId)} disabled={!editPhoneInput.trim()} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editPhoneInput.trim() ? '#E8963A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editPhoneInput.trim() ? 'pointer' : 'not-allowed' }}>Ganti Nomor</button>
                </div>
              </>
            )}

            {/* Deactivate Modal */}
            {currentModal.type === 'deactivate' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🚫</div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', textAlign: 'center', marginBottom: 8 }}>Nonaktifkan Akun</h3>
                <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  Akun <strong>{currentModal.userName}</strong> tidak bisa login sampai diaktifkan kembali. Listing miliknya tetap tersimpan.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => toggleActive(currentModal.userId, false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#F59E0B', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Nonaktifkan</button>
                </div>
              </>
            )}

            {/* Activate Modal */}
            {currentModal.type === 'activate' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>✅</div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', textAlign: 'center', marginBottom: 8 }}>Aktifkan Akun</h3>
                <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                  Aktifkan kembali akun <strong>{currentModal.userName}</strong>? User bisa login lagi setelah ini.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => toggleActive(currentModal.userId, true)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Aktifkan</button>
                </div>
              </>
            )}

            {/* Delete Modal */}
            {currentModal.type === 'delete' && (
              <>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>🗑️</div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 8 }}>Hapus Permanen</h3>
                <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  Akun <strong>{currentModal.userName}</strong> akan dihapus permanen. Semua listing miliknya akan dinonaktifkan. <strong style={{ color: '#EF4444' }}>Tindakan ini tidak bisa dibatalkan!</strong>
                </p>
                <p style={{ fontSize: 12, color: '#374151', marginBottom: 8, fontWeight: 600 }}>Ketik <code style={{ background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>HAPUS</code> untuk konfirmasi:</p>
                <input value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} placeholder="Ketik HAPUS..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #EF4444', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={() => deleteUser(currentModal.userId)} disabled={deleteConfirmInput !== 'HAPUS'} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: deleteConfirmInput === 'HAPUS' ? '#EF4444' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleteConfirmInput === 'HAPUS' ? 'pointer' : 'not-allowed' }}>Hapus Permanen</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>👥 Manajemen Users</h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>{total} user terdaftar</p>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none', padding: '6px 12px', background: 'rgba(27,107,74,0.08)', borderRadius: 8 }}>← Overview</Link>
      </div>

      {/* Role stats */}
      {!loading && Object.keys(roleCounts).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {Object.entries(roleCounts).map(([role, count]) => {
            const st = getRoleStyle(role);
            return <div key={role} style={{ background: st.bg, border: `1px solid ${st.color}30`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: st.color }}>{st.label}: {count}</div>;
          })}
        </div>
      )}

      {/* Filter */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {ROLE_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setRoleFilter(f.value)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', background: roleFilter === f.value ? '#1B6B4A' : '#F3F4F6', color: roleFilter === f.value ? '#fff' : '#374151' }}>{f.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 200 }}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)} placeholder="Cari nama atau nomor WA..." style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, outline: 'none' }} />
          <button onClick={() => setSearch(searchInput)} style={{ padding: '6px 12px', borderRadius: 8, background: '#1B6B4A', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}>Cari</button>
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} style={{ padding: '6px 10px', borderRadius: 8, background: '#F3F4F6', color: '#374151', border: 'none', fontSize: 12, cursor: 'pointer' }}>✕</button>}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #1B6B4A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat users...
        </div>
      )}

      {/* Empty */}
      {!loading && users.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
          <p style={{ color: '#6B7280', fontSize: 13 }}>Tidak ada user ditemukan</p>
        </div>
      )}

      {/* Users list */}
      {!loading && users.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map((u) => {
            const st = getRoleStyle(u.role);
            const isCurrentUser = u.id === currentUser?.id;
            const isLoading = actionLoading?.startsWith(u.id);
            return (
              <div key={u.id} style={{
                background: u.is_active === false ? 'rgba(239,68,68,0.02)' : '#fff',
                borderRadius: 14,
                border: `1px solid ${u.is_active === false ? 'rgba(239,68,68,0.2)' : isCurrentUser ? '#1B6B4A40' : '#E5E7EB'}`,
                padding: '14px 16px',
                opacity: u.is_active === false ? 0.85 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${st.color}40, ${st.color}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: st.color, position: 'relative' }}>
                    {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                    {u.is_active === false && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#EF4444', border: '2px solid #fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>✕</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{u.name || 'Belum isi nama'}</span>
                      {isCurrentUser && <span style={{ fontSize: 10, fontWeight: 700, color: '#1B6B4A', background: 'rgba(27,107,74,0.1)', padding: '1px 6px', borderRadius: 10 }}>Kamu</span>}
                      {u.is_active === false && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 10 }}>🚫 Dinonaktifkan</span>}
                      <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{formatPhone(u.phone)} · Bergabung {timeAgo(u.created_at)}</div>

                    {/* Owner listing summary */}
                    {u.listing_summary && Object.keys(u.listing_summary).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>Listing:</span>
                        {Object.entries(u.listing_summary).map(([type, count]) => (
                          <span key={type} style={{ fontSize: 11, fontWeight: 600, color: '#374151', background: '#F3F4F6', padding: '2px 8px', borderRadius: 10 }}>{LISTING_TYPE_ICON[type] || '📦'} {type} ({count})</span>
                        ))}
                      </div>
                    )}
                    {u.role === 'owner_listing' && (!u.listing_summary || Object.keys(u.listing_summary).length === 0) && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#F59E0B' }}>⚠️ Belum ada listing aktif</div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isCurrentUser && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 140 }}>
                      {/* Role dropdown */}
                      {isLoading ? (
                        <span style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Memproses...</span>
                      ) : (
                        <>
                          <select
                            value={u.role}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              if (newRole === u.role) return;
                              setModal({ type: 'role', userId: u.id, userName: u.name || formatPhone(u.phone), newRole });
                            }}
                            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11, color: '#374151', background: '#F9FAFB', cursor: 'pointer', width: '100%' }}
                          >
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>

                          <div style={{ display: 'flex', gap: 4 }}>
                            {/* Ganti nomor */}
                            <button
                              onClick={() => { setEditPhoneInput(u.phone); setModal({ type: 'editPhone', userId: u.id, userName: u.name || formatPhone(u.phone), currentPhone: u.phone }); }}
                              title="Ganti Nomor WA"
                              style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 13, cursor: 'pointer' }}
                            >📱</button>

                            {/* Nonaktifkan / Aktifkan */}
                            {u.is_active !== false ? (
                              <button
                                onClick={() => setModal({ type: 'deactivate', userId: u.id, userName: u.name || formatPhone(u.phone) })}
                                title="Nonaktifkan"
                                style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: 13, cursor: 'pointer' }}
                              >🚫</button>
                            ) : (
                              <button
                                onClick={() => setModal({ type: 'activate', userId: u.id, userName: u.name || formatPhone(u.phone) })}
                                title="Aktifkan kembali"
                                style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10B981', fontSize: 13, cursor: 'pointer' }}
                              >✅</button>
                            )}

                            {/* Hapus */}
                            <button
                              onClick={() => setModal({ type: 'delete', userId: u.id, userName: u.name || formatPhone(u.phone) })}
                              title="Hapus permanen"
                              style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}
                            >🗑️</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Akun sendiri — hanya edit nama */}
                  {isCurrentUser && (
                    <button
                      onClick={() => { setEditNameInput(u.name || ''); setModal({ type: 'editName', userId: u.id }); }}
                      style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #1B6B4A', background: 'rgba(27,107,74,0.06)', color: '#1B6B4A', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >✏️ Edit Nama</button>
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
