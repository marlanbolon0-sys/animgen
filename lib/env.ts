// Konfigurasi lingkungan AnimGen.
// ATURAN KEAMANAN: semua API key hanya dibaca di sisi server (file ini dipakai
// server-only). Kunci yang diawali NEXT_PUBLIC_ aman diekspos ke browser.

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export const RUNWAY_API_KEY = (process.env.RUNWAY_API_KEY ?? "").trim();
export const RUNWAY_WEBHOOK_SECRET = (process.env.RUNWAY_WEBHOOK_SECRET ?? "").trim();
export const MESHY_API_KEY = (process.env.MESHY_API_KEY ?? "").trim();

// mock | runway | meshy — kosongkan untuk otomatis (runway jika ada API key, selain itu mock)
export const ANIMATION_PROVIDER = (process.env.ANIMATION_PROVIDER ?? "").trim().toLowerCase();

export const WORKER_SECRET = (process.env.WORKER_SECRET ?? "").trim();
export const AUTH_SECRET = (process.env.AUTH_SECRET ?? "animgen-dev-secret-ganti-di-produksi").trim();
export const NEXT_PUBLIC_APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

/** Supabase aktif hanya jika URL + anon key + service role key semuanya diisi. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

/** Mode demo = tanpa Supabase: data disimpan lokal (SQLite), provider video = mock. */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}
