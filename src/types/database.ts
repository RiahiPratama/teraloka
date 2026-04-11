/**
 * DATABASE TYPES
 * Auto-generated dari Supabase setelah migration FASE 2.
 * Jalankan: npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * 
 * Untuk sekarang, pakai types di common.ts dulu.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Placeholder — akan di-generate otomatis di FASE 2
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
