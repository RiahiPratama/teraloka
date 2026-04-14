'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const KOS_FACILITIES = [
  'WiFi', 'AC', 'Kamar mandi dalam', 'Kamar mandi luar', 'Dapur',
  'Parkir motor', 'Listrik token', 'Listrik included', 'Kasur', 'Lemari',
  'Meja belajar', 'Televisi', 'Jendela', 'Balkon', 'Kipas angin',
];

interface RoomType {
  id: string;
  room_type: string;
  description?: string;
  price: number;
  price_period: string;
  total_rooms: number;
  available_rooms: number;
  size_m2?: number;
  facilities: string[];
  photos: string[];
  is_active: boolean;
}

const emptyRoom = {
  room_type: '',
  description: '',
  price: '',
  price_period: 'bulan',
  total_rooms: '1',
  available_rooms: '1',
  size_m2: '',
  facilities: [] as string[],
  photos: [] as string[],
};

export default function RoomTypesPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const { user, token } = useAuth();

  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyRoom });

  useEffect(() => {
    if (!token) return;
    fetchRooms();
  }, [token]);

  async function fetchRooms() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/listings/${listingId}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRooms(data.data);
    } catch {}
    finally { setLoading(false); }
  }

  const toggleFacility = (f: string) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f)
        ? prev.facilities.filter(x => x !== f)
        : [...prev.facilities, f],
    }));
  };

  const fmt = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const unformat = (val: string) => Number(val.replace(/\D/g, ''));

  async function handleSave() {
    if (!form.room_type.trim() || !form.price || !form.total_rooms) {
      setError('Nama tipe, harga, dan jumlah kamar wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      room_type: form.room_type,
      description: form.description || null,
      price: unformat(form.price),
      price_period: form.price_period,
      total_rooms: Number(form.total_rooms),
      available_rooms: Number(form.available_rooms),
      size_m2: form.size_m2 ? Number(form.size_m2) : null,
      facilities: form.facilities,
      photos: form.photos,
    };

    try {
      const url = editingId
        ? `${API}/listings/${listingId}/rooms/${editingId}`
        : `${API}/listings/${listingId}/rooms`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchRooms();
        resetForm();
      } else {
        setError(data.error?.message ?? 'Gagal menyimpan tipe kamar.');
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(roomId: string) {
    if (!confirm('Hapus tipe kamar ini?')) return;
    try {
      await fetch(`${API}/listings/${listingId}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRooms();
    } catch {}
  }

  function handleEdit(room: RoomType) {
    setForm({
      room_type: room.room_type,
      description: room.description ?? '',
      price: room.price.toLocaleString('id-ID'),
      price_period: room.price_period,
      total_rooms: String(room.total_rooms),
      available_rooms: String(room.available_rooms),
      size_m2: room.size_m2 ? String(room.size_m2) : '',
      facilities: room.facilities ?? [],
      photos: room.photos ?? [],
    });
    setEditingId(room.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm({ ...emptyRoom });
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Login dulu untuk akses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-1 text-xs text-gray-400">← Kembali</button>
          <h1 className="text-xl font-bold text-[#1B6B4A]">🛏️ Tipe Kamar</h1>
          <p className="text-sm text-gray-500">Kelola tipe kamar untuk listing ini</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-[#1B6B4A] px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Tambah
          </button>
        )}
      </div>

      {/* ─── Form Tambah/Edit ─── */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-[#1B6B4A]/20 bg-green-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1B6B4A]">
              {editingId ? 'Edit Tipe Kamar' : 'Tambah Tipe Kamar Baru'}
            </h2>
            <button onClick={resetForm} className="text-xs text-gray-400">Batal</button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nama Tipe Kamar</label>
            <input
              type="text"
              value={form.room_type}
              onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))}
              placeholder="Contoh: Kamar Standar, Kamar AC, Kamar VIP"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Deskripsi <span className="text-gray-400">(opsional)</span></label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Ceritakan keistimewaan kamar ini..."
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Harga</label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
                <input
                  type="text"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: fmt(e.target.value) }))}
                  placeholder="500.000"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Per</label>
              <div className="mt-1.5 flex gap-1.5">
                {['bulan', 'malam', 'hari'].map(p => (
                  <button key={p} onClick={() => setForm(prev => ({ ...prev, price_period: p }))}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-medium capitalize transition-colors ${
                      form.price_period === p ? 'bg-[#1B6B4A] text-white' : 'bg-white border border-gray-200 text-gray-600'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Total Kamar</label>
              <input
                type="number" min="1"
                value={form.total_rooms}
                onChange={e => setForm(p => ({ ...p, total_rooms: e.target.value, available_rooms: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Tersedia</label>
              <input
                type="number" min="0"
                value={form.available_rooms}
                onChange={e => setForm(p => ({ ...p, available_rooms: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ukuran (m²)</label>
              <input
                type="number" min="1"
                value={form.size_m2}
                onChange={e => setForm(p => ({ ...p, size_m2: e.target.value }))}
                placeholder="12"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Fasilitas Kamar Ini</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {KOS_FACILITIES.map(f => (
                <button key={f} onClick={() => toggleFacility(f)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    form.facilities.includes(f) ? 'bg-[#1B6B4A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ImageUpload
            bucket="listings"
            label="Foto Kamar"
            onUpload={urls => setForm(p => ({ ...p, photos: urls }))}
            existingUrls={form.photos}
            maxFiles={5}
          />

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Menyimpan...' : editingId ? 'Update Tipe Kamar' : 'Simpan Tipe Kamar'}
          </button>
        </div>
      )}

      {/* ─── List Tipe Kamar ─── */}
      {loading ? (
        <p className="text-center text-sm text-gray-400 py-8">Memuat...</p>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <p className="text-2xl mb-2">🛏️</p>
          <p className="text-sm font-medium text-gray-700">Belum ada tipe kamar</p>
          <p className="text-xs text-gray-500 mt-1">Tambah tipe kamar agar calon penghuni bisa pilih sesuai budget</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map(room => (
            <div key={room.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {room.photos?.length > 0 && (
                <img src={room.photos[0]} alt={room.room_type}
                  className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{room.room_type}</p>
                    {room.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{room.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1B6B4A]">
                      Rp {room.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-400">/{room.price_period}</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>🛏️ {room.available_rooms}/{room.total_rooms} tersedia</span>
                  {room.size_m2 && <span>📐 {room.size_m2} m²</span>}
                </div>

                {room.facilities?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {room.facilities.slice(0, 4).map(f => (
                      <span key={f} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{f}</span>
                    ))}
                    {room.facilities.length > 4 && (
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-400">+{room.facilities.length - 4} lagi</span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleEdit(room)}
                    className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(room.id)}
                    className="flex-1 rounded-lg border border-red-100 py-2 text-xs font-medium text-red-500">
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
