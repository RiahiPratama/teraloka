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
  { value: '', label: 'Semua Role' },
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
  const [confirmModal, setConfirmModal] = useState<{ userId: string; userName: string; newRole: string } | null>(null);
  const [editNameModal, setEditNameModal] = useState<{ userId: string } | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editNameLoading, setEditNameLoading] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
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

  const updateRole = async (userId: string, newRole: string) => {
    if (!token) return;
    setActionLoading(userId);
    setConfirmModal(null);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Role berhasil diubah ke ${getRoleStyle(newRole).label}`);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal update role', false);
    } finally {
      setActionLoading(null);
    }
  };

  const saveName = async () => {
    if (!token || !editNameModal || !editNameInput.trim()) return;
    setEditNameLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editNameInput.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('Nama berhasil diubah ✓');
      setEditNameModal(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gagal ubah nama', false);
    } finally {
      setEditNameLoading(false);
    }
  };

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

      {/* Confirm Role Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', textAlign: 'center', marginBottom: 8 }}>Konfirmasi Ubah Role</h3>
            <p style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              Ubah role <strong>{confirmModal.userName}</strong> menjadi{' '}
              <strong style={{ color: getRoleStyle(confirmModal.newRole).color }}>{getRoleStyle(confirmModal.newRole).label}</strong>?
              {confirmModal.newRole === 'super_admin' && (
                <span style={{ display: 'block', color: '#EF4444', marginTop: 8, fontWeight: 600 }}>⚠️ Super Admin punya akses penuh ke semua fitur!</span>
              )}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
              <button onClick={() => updateRole(confirmModal.userId, confirmModal.newRole)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: confirmModal.newRole === 'super_admin' ? '#EF4444' : '#1B6B4A', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Ya, Ubah</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {editNameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>✏️ Edit Nama</h3>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 16 }}>Nama ini akan tampil di seluruh platform TeraLoka</p>
            <input
              value={editNameInput}
              onChange={(e) => setEditNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              placeholder="Masukkan nama lengkap..."
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '2px solid #1B6B4A', fontSize: 14, outline: 'none',
                marginBottom: 16, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditNameModal(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
              <button
                onClick={saveName}
                disabled={editNameLoading || !editNameInput.trim()}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: editNameInput.trim() ? '#1B6B4A' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editNameInput.trim() ? 'pointer' : 'not-allowed' }}
              >
                {editNameLoading ? 'Menyimpan...' : 'Simpan Nama'}
              </button>
            </div>
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
            return (
              <div key={role} style={{ background: st.bg, border: `1px solid ${st.color}30`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: st.color }}>
                {st.label}: {count}
              </div>
            );
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
            return (
              <div key={u.id} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${isCurrentUser ? '#1B6B4A40' : '#E5E7EB'}`, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${st.color}40, ${st.color}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: st.color }}>
                    {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        {u.name || 'Belum isi nama'}
                      </span>
                      {isCurrentUser && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#1B6B4A', background: 'rgba(27,107,74,0.1)', padding: '1px 6px', borderRadius: 10 }}>Kamu</span>
                      )}
                      <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {formatPhone(u.phone)} · Bergabung {timeAgo(u.created_at)}
                    </div>

                    {/* Owner listing summary */}
                    {u.listing_summary && Object.keys(u.listing_summary).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>Listing:</span>
                        {Object.entries(u.listing_summary).map(([type, count]) => (
                          <span key={type} style={{ fontSize: 11, fontWeight: 600, color: '#374151', background: '#F3F4F6', padding: '2px 8px', borderRadius: 10 }}>
                            {LISTING_TYPE_ICON[type] || '📦'} {type} ({count})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Owner tapi tidak ada listing */}
                    {u.role === 'owner_listing' && (!u.listing_summary || Object.keys(u.listing_summary).length === 0) && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#F59E0B' }}>
                        ⚠️ Belum ada listing aktif
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    {isCurrentUser ? (
                      <button
                        onClick={() => { setEditNameInput(u.name || ''); setEditNameModal({ userId: u.id }); }}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #1B6B4A', background: 'rgba(27,107,74,0.06)', color: '#1B6B4A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ✏️ Edit Nama
                      </button>
                    ) : (
                      actionLoading === u.id ? (
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>Menyimpan...</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole === u.role) return;
                            setConfirmModal({ userId: u.id, userName: u.name || formatPhone(u.phone), newRole });
                          }}
                          style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 11, color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
