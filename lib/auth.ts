// Auth AnimGen.
//  - Mode Supabase (produksi): Supabase Auth email+kata sandi, sesi via cookie @supabase/ssr.
//  - Mode demo (tanpa Supabase): pengguna lokal SQLite + cookie sesi bertanda tangan HMAC.
// API key service-role hanya pernah dipakai di file server ini.

import crypto from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  AUTH_SECRET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStore, type UserProfile } from "@/lib/store";
import { localUserCredentials } from "@/lib/store/local";
import { AppError } from "@/lib/api";

const SESSION_COOKIE = "animgen_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

// ---------- sesi demo (HMAC) ----------

function hmac(payload: string): string {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

function makeSessionToken(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${hmac(payload)}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, ts, sig] = parts;
  const expected = hmac(`${userId}.${ts}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  // tolak token > 30 hari
  if (Date.now() - Number(ts) > SESSION_MAX_AGE * 1000) return null;
  return userId;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored || !stored.startsWith("scrypt:")) return false;
  const [, salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}

// ---------- API publik ----------

export async function getSessionUser(): Promise<UserProfile | null> {
  const store = getStore();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return null;
    return store.getUserById(data.user.id);
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  return store.getUserById(userId);
}

export async function signUpUser(
  email: string,
  password: string,
  name?: string
): Promise<UserProfile> {
  const store = getStore();
  const existing = await store.getUserByEmail(email);
  if (existing) {
    throw new AppError(409, "Email sudah terdaftar. Silakan masuk atau gunakan email lain.");
  }

  if (isSupabaseConfigured()) {
    // Buat akun via Admin API agar pengguna bisa langsung dipakai tanpa
    // menunggu verifikasi email (konfigurasi MVP; produksi bisa mengaktifkan
    // konfirmasi email di Supabase Dashboard bila diinginkan).
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { full_name: name } : undefined,
    });
    if (createErr) {
      const already = /already|registered|exist/i.test(createErr.message);
      throw new AppError(
        already ? 409 : 400,
        already
          ? "Email sudah terdaftar. Silakan masuk atau gunakan email lain."
          : `Gagal mendaftar: ${createErr.message}`
      );
    }
    // Tukar ke sesi cookie pengguna (bukan service role).
    const supabase = await createSupabaseServerClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      throw new AppError(500, "Akun berhasil dibuat, tetapi sesi gagal dibuat. Coba masuk manual.");
    }
    const { data } = await supabase.auth.getUser();
    const profile = data?.user ? await store.getUserById(data.user.id) : null;
    if (!profile) {
      throw new AppError(500, "Profil belum siap. Pastikan migrasi Supabase sudah dijalankan.");
    }
    return profile;
  }

  // Mode demo
  const user = await store.createUser(email, hashPassword(password), name ?? null);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return user;
}

export async function signInUser(email: string, password: string): Promise<UserProfile> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new AppError(401, "Email atau kata sandi salah.");
    }
    const { data } = await supabase.auth.getUser();
    const profile = data?.user ? await getStore().getUserById(data.user.id) : null;
    if (!profile) {
      throw new AppError(500, "Profil tidak ditemukan. Pastikan migrasi Supabase sudah dijalankan.");
    }
    return profile;
  }

  // Mode demo
  const creds = await localUserCredentials(email);
  if (!creds || !verifyPassword(password, creds.passwordHash)) {
    throw new AppError(401, "Email atau kata sandi salah.");
  }
  const profile = await getStore().getUserById(creds.id);
  if (!profile) throw new AppError(401, "Akun tidak ditemukan.");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeSessionToken(profile.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return profile;
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
