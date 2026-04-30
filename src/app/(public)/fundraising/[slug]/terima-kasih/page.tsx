'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HeartHandshake, CheckCircle2, Clock, Share2, Home, MessageCircle,
  Copy, Check, Hash, Loader2, Sparkles,
} from 'lucide-react';
import { formatRupiah } from '@/utils/format';
import ShareBar from './_components/ShareBar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Donation {
  id: string;
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  donation_code: string;
  message?: string | null;          // ← FIX: read from DB instead of localStorage
  verification_status: string;
  created_at: string;
  campaigns?: {
    title: string;
    slug: string;
    partner_name?: string;
  };
}

export default function TerimaKasihPage({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const { slug } = use(params);
  const donationId = searchParams.get('id');

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!donationId) {
      setLoading(false);
      return;
    }

    async function fetchDonation() {
      try {
        const res = await fetch(`${API}/funding/donations/${donationId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDonation(json.data);
        }
      } catch {
        // Silent fail — user sees generic thank-you
      } finally {
        setLoading(false);
      }
    }
    fetchDonation();
  }, [donationId]);

  function copyDonationCode() {
    if (!donation?.donation_code) return;
    navigator.clipboard.writeText(donation.donation_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }



  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FDF2F8] via-white to-[#003526]/5">
        <Loader2 size={32} className="animate-spin text-[#EC4899]" />
      </div>
    );
  }

  // FIX: Read message dari donation.message (dari API response) — bukan dari localStorage
  const userMessage = donation?.message?.trim() || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF2F8] via-white to-[#003526]/5 pb-8">

      {/* Hero success */}
      <div className="px-4 pt-12 pb-8">
        <div className="mx-auto max-w-md text-center">

          {/* Animated success icon */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-xl shadow-pink-200">
              <HeartHandshake size={48} className="text-white" />
            </div>
            {/* Sparkle accents */}
            <Sparkles size={16} className="absolute -top-1 -right-2 text-yellow-400 animate-pulse" />
            <Sparkles size={14} className="absolute top-4 -left-3 text-pink-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <Sparkles size={12} className="absolute -bottom-1 right-2 text-[#003526] animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>

          <p className="text-xs font-bold text-[#EC4899] uppercase tracking-widest mb-2">Alhamdulillah</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            Terima Kasih{donation && !donation.is_anonymous ? `, ${donation.donor_name}` : ''}!
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {donation ? (
              <>
                Donasimu <span className="font-bold text-[#003526]">{formatRupiah(donation.amount)}</span>
                {donation.campaigns && (
                  <> untuk <span className="font-bold">{donation.campaigns.title}</span></>
                )} telah kami catat.
              </>
            ) : (
              'Donasimu telah kami terima.'
            )}
          </p>
        </div>
      </div>

      {/* Verification status card */}
      {donation && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Clock size={18} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Sedang Diverifikasi</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tim BADONASI akan konfirmasi dalam 1-3 jam kerja. Kamu akan{' '}
                  {donation.donor_phone ? 'mendapat notifikasi WhatsApp' : 'bisa cek status di halaman campaign'}.
                </p>
              </div>
            </div>

            {/* Donation details */}
            <div className="border-t border-gray-100 pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Nominal transfer</span>
                <span className="text-sm font-bold text-gray-900">{formatRupiah(donation.total_transfer)}</span>
              </div>
              {donation.operational_fee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Termasuk dukungan operasional</span>
                  <span className="text-xs font-semibold text-[#BA7517]">{formatRupiah(donation.operational_fee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Hash size={12} /> Kode transaksi
                </span>
                <button
                  onClick={copyDonationCode}
                  className="flex items-center gap-1 text-sm font-bold text-[#EC4899] font-mono tracking-wider hover:opacity-80 transition-opacity">
                  {donation.donation_code}
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donor's message/doa — FIX: baca dari DB (donation.message), bukan localStorage */}
      {userMessage && (
        <div className="mx-auto max-w-md px-4 mb-4">
          <div className="bg-[#003526]/5 border border-[#003526]/10 rounded-2xl p-5">
            <p className="text-xs font-bold text-[#003526] uppercase tracking-widest mb-2">Pesan & Doa dari Kamu</p>
            <p className="text-sm text-gray-700 italic leading-relaxed">&quot;{userMessage}&quot;</p>
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
              Doa kamu akan muncul di <strong>wall Doa & Harapan</strong> setelah donasi diverifikasi — jadi bagian dari dukungan untuk penerima.
            </p>
          </div>
        </div>
      )}

      {/* Inspirational message */}
      <div className="mx-auto max-w-md px-4 mb-6">
        <div className="bg-gradient-to-br from-[#003526] to-[#1B6B4A] rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-[#95d3ba] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold mb-1">Setiap Kebaikan Akan Kembali</p>
              <p className="text-xs text-white/85 leading-relaxed">
                Donasimu jadi bagian dari perubahan kecil yang berdampak besar bagi warga Maluku Utara. Jazakumullahu khairan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mx-auto max-w-md px-4 space-y-2.5">
        {donation?.campaigns && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Share2 size={12} /> Ajak Teman Donasi
            </p>
            <ShareBar
              url={`https://teraloka.vercel.app/fundraising/${slug}`}
              title={donation.campaigns?.title ?? 'Bantu campaign ini di BADONASI!'}
            />
          </div>
        )}

        <Link
          href={`/fundraising/${slug}`}
          className="flex items-center justify-center gap-2 w-full bg-white border border-[#003526]/10 text-[#003526] text-sm font-bold py-4 rounded-2xl hover:bg-gray-50 transition-colors">
          <MessageCircle size={16} />
          Lihat Update Campaign
        </Link>

        <Link
          href="/fundraising"
          className="flex items-center justify-center gap-2 w-full text-gray-500 text-sm font-semibold py-3 hover:text-gray-700 transition-colors">
          <Home size={14} />
          Jelajahi Campaign Lain
        </Link>
      </div>

    </div>
  );
}
