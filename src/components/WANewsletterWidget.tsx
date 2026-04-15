'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0'))  return '62' + cleaned.slice(1);
  if (cleaned.startsWith('62')) return cleaned;
  if (cleaned.startsWith('8'))  return '62' + cleaned;
  return cleaned;
}

export default function WANewsletterWidget() {
  const [phone,  setPhone]  = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`${API}/public/newsletter/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();
      setStatus(data.success ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '20px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
        <p style={{ fontWeight: 700, color: '#065F46', fontSize: 14, margin: 0 }}>
          Terima kasih! Kamu sudah terdaftar.
        </p>
        <p style={{ color: '#059669', fontSize: 12, marginTop: 4 }}>
          Kabar Maluku Utara akan masuk ke WA kamu setiap pagi.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          💬
        </div>
        <div>
          <p style={{ fontWeight: 700, color: '#111827', fontSize: 14, margin: 0 }}>
            Mau kabar Maluku Utara tiap pagi?
          </p>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>
            Dapatkan rangkuman berita terbaru langsung di WhatsApp kamu.
          </p>
        </div>
      </div>

      {/* Input + Button */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          type="tel"
          placeholder="08xxxxxxxxxx"
          value={phone}
          onChange={e => { setPhone(e.target.value); setStatus('idle'); }}
          onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 10,
            border: `1.5px solid ${status === 'error' ? '#FCA5A5' : '#D1FAE5'}`,
            fontSize: 13,
            outline: 'none',
            background: '#fff',
            color: '#111827',
          }}
        />
        <button
          onClick={handleSubscribe}
          disabled={status === 'loading'}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: status === 'loading' ? '#9CA3AF' : '#003526',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {status === 'loading' ? '...' : 'Gabung Sekarang'}
        </button>
      </div>

      {status === 'error' && (
        <p style={{ color: '#EF4444', fontSize: 11, marginTop: 6 }}>
          Nomor WA tidak valid. Contoh: 08123456789
        </p>
      )}

      <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 8 }}>
        🔒 Data kamu aman dan tidak akan dibagikan.
      </p>
    </div>
  );
}
