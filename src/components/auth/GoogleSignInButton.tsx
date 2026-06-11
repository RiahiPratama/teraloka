'use client';

// src/components/auth/GoogleSignInButton.tsx (NEW)
// Tombol Google Sign-In. Pakai @react-oauth/google (GoogleOAuthProvider + GoogleLogin).
// Dapet id_token (credential) dari Google → panggil onCredential(idToken) → parent
// (login page) yang nyambungin ke useAuth.googleLogin + handle step berikutnya.
//
// Client ID dari NEXT_PUBLIC_GOOGLE_CLIENT_ID (wajib di .env.local + Vercel env).
// GREP MARKER: GOOGLE_SIGNIN_BTN_20260611

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface GoogleSignInButtonProps {
  // dipanggil dengan id_token (JWT credential) saat user sukses pilih akun Google
  onCredential: (idToken: string) => void;
  onError?: () => void;
  disabled?: boolean;
}

export default function GoogleSignInButton({ onCredential, onError, disabled }: GoogleSignInButtonProps) {
  // Guard: kalau Client ID belum di-set, jangan render tombol rusak — kasih info dev.
  if (!GOOGLE_CLIENT_ID) {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
          NEXT_PUBLIC_GOOGLE_CLIENT_ID belum di-set
        </div>
      );
    }
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div
        className={disabled ? 'pointer-events-none opacity-50' : ''}
        // GoogleLogin render tombol resmi Google sendiri (width mengikuti container)
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <GoogleLogin
          onSuccess={(resp) => {
            if (resp.credential) onCredential(resp.credential);
            else onError?.();
          }}
          onError={() => onError?.()}
          theme="outline"
          size="large"
          width="320"
          text="signin_with"
          shape="rectangular"
        />
      </div>
    </GoogleOAuthProvider>
  );
}
