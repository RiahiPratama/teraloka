'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Listing {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  price: number | null;
  price_period: string | null;
  address: string | null;
  listing_tier: string | null;
  created_at: string;
}

const TYPE_TABS = [
  { value: '', label: 'Semua' },
  { value: 'kos', label: '🏠 Kos' },
  { value: 'properti', label: '🏗️ Properti' },
  { value: 'kendaraan', label: '🚗 Kendaraan' },
  { value: 'jasa', label: '🔧 Jasa' },
];

const STATUS_OPTS = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Nonaktif' },
  { value: 'rejected', label: 'Ditolak' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', label: 'Aktif' },
  draft:    { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', label: 'Draft' },
  pending:  { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', label: 'Pending' },
  inactive: { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF', label: 'Nonaktif' },
  rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444', label: 'Ditolak' },
};

const TYPE_ICON: Record<string, string> = {
  kos: '🏠', properti: '🏗️', kendaraan: '🚗', jasa: '🔧',
};

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  return `${d} hari lalu`;
}

export default function AdminListingsPage() {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchListings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (typeFilter)   params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search)       params.set('q', search);

      const res  = await fetch(`${API_URL}/admin/listings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setListings(data.data.data);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat listing', false);
    } finally {
      setLoading(false);
    }
  }, [token, typeFilter, statusFilter, search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const updateStatus = async (id: string, status: string, title: string) => {
    if (!token) return;
    setActionLoading(id + status);
    try {
      const res  = await fetch(`${API_URL}/admin/listings/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`"${title}" → ${STATUS_STYLE[status]?.label ?? status}`);
      fetchListings();
    } catch (err: any) {
      showToast(err.message || 'Gagal update status', false);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: toast.ok ? '#10B981' : '#EF4444',
          color: '#fff', padding: '10px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
            🏠 Manajemen Listing
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
            {total} listing ditemukan
          </p>
        </div>
        <Link href="/admin" style={{
          fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none',
          padding: '6px 12px', background: 'rgba(27,107,74,0.08)', borderRadius: 8,
        }}>
          ← Overview
        </Link>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
        padding: '16px', marginBottom: 20,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
      }}>
        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: typeFilter === t.value ? '#1B6B4A' : '#F3F4F6',
                color: typeFilter === t.value ? '#fff' : '#374151',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: '#E5E7EB' }} />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
            fontSize: 12, color: '#374151', background: '#F9FAFB', cursor: 'pointer',
          }}
        >
          {STATUS_OPTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Search */}
        <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 180 }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="Cari judul listing..."
            style={{
              flex: 1, padding: '6px 12px', borderRadius: 8,
              border: '1px solid #E5E7EB', fontSize: 12, color: '#374151',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setSearch(searchInput)}
            style={{
              padding: '6px 12px', borderRadius: 8, background: '#1B6B4A',
              color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
            }}
          >
            Cari
          </button>
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); }}
              style={{
                padding: '6px 10px', borderRadius: 8, background: '#F3F4F6',
                color: '#374151', border: 'none', fontSize: 12, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid #1B6B4A', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          Memuat listing...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty */}
      {!loading && listings.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB',
          padding: '60px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>Tidak ada listing</p>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>Coba ubah filter atau kata kunci pencarian</p>
        </div>
      )}

      {/* Listing Table */}
      {!loading && listings.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 120px 110px 160px',
            padding: '12px 16px',
            background: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            fontSize: 11, fontWeight: 700, color: '#6B7280',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            <div>Listing</div>
            <div>Tipe</div>
            <div>Harga</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Aksi</div>
          </div>

          {/* Rows */}
          {listings.map((listing) => {
            const st = STATUS_STYLE[listing.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: listing.status };
            return (
              <div
                key={listing.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 120px 110px 160px',
                  padding: '12px 16px',
                  borderBottom: '1px solid #F3F4F6',
                  alignItems: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Title */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontWeight: 600, fontSize: 13, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {listing.title}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {listing.address?.slice(0, 40) || '—'} · {timeAgo(listing.created_at)}
                  </p>
                </div>

                {/* Type */}
                <div style={{ fontSize: 12, color: '#374151' }}>
                  {TYPE_ICON[listing.type] || '📦'} {listing.type}
                </div>

                {/* Price */}
                <div style={{ fontSize: 12, color: '#374151' }}>
                  {listing.price ? formatRupiah(listing.price) : '—'}
                  {listing.price_period && (
                    <span style={{ color: '#9CA3AF' }}>/{listing.price_period}</span>
                  )}
                </div>

                {/* Status badge */}
                <div>
                  <span style={{
                    background: st.bg, color: st.color,
                    fontSize: 11, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 20, whiteSpace: 'nowrap',
                  }}>
                    {st.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {listing.status !== 'active' && (
                    <ActionBtn
                      label="Aktifkan"
                      color="#10B981"
                      loading={actionLoading === listing.id + 'active'}
                      onClick={() => updateStatus(listing.id, 'active', listing.title)}
                    />
                  )}
                  {listing.status === 'active' && (
                    <ActionBtn
                      label="Nonaktifkan"
                      color="#6B7280"
                      loading={actionLoading === listing.id + 'inactive'}
                      onClick={() => updateStatus(listing.id, 'inactive', listing.title)}
                    />
                  )}
                  {listing.status !== 'rejected' && listing.status !== 'active' && (
                    <ActionBtn
                      label="Tolak"
                      color="#EF4444"
                      loading={actionLoading === listing.id + 'rejected'}
                      onClick={() => updateStatus(listing.id, 'rejected', listing.title)}
                    />
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

function ActionBtn({ label, color, loading, onClick }: {
  label: string; color: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '4px 10px', borderRadius: 6, border: 'none',
        background: `${color}18`, color, fontSize: 11, fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => !loading && (e.currentTarget.style.background = `${color}30`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = `${color}18`)}
    >
      {loading ? '...' : label}
    </button>
  );
}
