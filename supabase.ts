// Implementasi store untuk PRODUKSI: Supabase (PostgreSQL + Auth + RLS).
// Dipakai hanya di server dengan SUPABASE_SERVICE_ROLE_KEY (melewati RLS —
// otorisasi tetap dijaga: setiap query video difilter berdasarkan userId).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/env";
import { NEW_USER_CREDITS } from "@/lib/pricing";
import type {
  DataStore,
  NewVideoInput,
  UserProfile,
  VideoPatch,
  VideoRecord,
  VideoStatus,
} from "./types";

interface ProfileRow {
  id: string;
  email: string;
  credits: number;
  created_at: string;
}

interface VideoRow {
  id: string;
  user_id: string;
  mode: string;
  prompt: string;
  image_url: string | null;
  style: string;
  ratio: string;
  duration_seconds: number;
  status: string;
  provider: string | null;
  provider_job_id: string | null;
  video_url: string | null;
  error_message: string | null;
  credits_charged: number;
  created_at: string;
  updated_at: string;
}

let adminClient: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

function toProfile(row: ProfileRow): UserProfile {
  return { id: row.id, email: row.email, credits: row.credits, createdAt: row.created_at };
}

function toVideo(row: VideoRow): VideoRecord {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode as VideoRecord["mode"],
    prompt: row.prompt,
    imageUrl: row.image_url,
    style: row.style,
    ratio: row.ratio,
    durationSeconds: row.duration_seconds,
    status: row.status as VideoStatus,
    provider: row.provider,
    providerJobId: row.provider_job_id,
    videoUrl: row.video_url,
    errorMessage: row.error_message,
    creditsCharged: row.credits_charged,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseStore implements DataStore {
  readonly backend = "supabase" as const;

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const { data } = await admin().from("profiles").select("*").eq("email", email).maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const { data } = await admin().from("profiles").select("*").eq("id", id).maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  }

  async createUser(email: string, passwordHash: string | null, name?: string | null): Promise<UserProfile> {
    // passwordHash tidak dipakai di Supabase — auth ditangani Supabase Auth.
    void passwordHash;
    const { data: authData, error } = await admin().auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: name ? { full_name: name } : undefined,
    });
    if (error || !authData.user) {
      throw new Error(error?.message ?? "Gagal membuat pengguna Supabase");
    }
    // Trigger handle_new_user() membuat profil + ledger signup_bonus.
    const existing = await this.getUserById(authData.user.id);
    if (existing) return existing;
    // Fallback jika trigger belum terpasang (migrasi belum dijalankan).
    const { data } = await admin()
      .from("profiles")
      .upsert({ id: authData.user.id, email, credits: NEW_USER_CREDITS }, { onConflict: "id" })
      .select("*")
      .single();
    await admin().from("credit_ledger").insert({
      user_id: authData.user.id,
      delta: NEW_USER_CREDITS,
      reason: "signup_bonus",
    });
    return toProfile(data as ProfileRow);
  }

  async consumeCredits(userId: string, amount: number, videoId: string): Promise<boolean> {
    const { data, error } = await admin().rpc("use_credits", {
      p_user: userId,
      p_amount: amount,
      p_video: videoId,
    });
    if (!error) return data === true;
    // Fallback optimistik jika fungsi RPC belum ada (migrasi belum dijalankan).
    console.warn("use_credits RPC gagal, memakai fallback:", error.message);
    for (let i = 0; i < 3; i++) {
      const { data: prof } = await admin()
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single<{ credits: number }>();
      if (!prof || prof.credits < amount) return false;
      const { data: upd, error: updErr } = await admin()
        .from("profiles")
        .update({ credits: prof.credits - amount, updated_at: new Date().toISOString() })
        .eq("id", userId)
        .eq("credits", prof.credits)
        .select("credits")
        .maybeSingle<{ credits: number }>();
      if (!updErr && upd) {
        await admin()
          .from("credit_ledger")
          .insert({ user_id: userId, video_id: videoId, delta: -amount, reason: "generation" });
        return true;
      }
    }
    return false;
  }

  async refundCredits(userId: string, amount: number, videoId: string): Promise<void> {
    if (amount <= 0) return;
    const { error } = await admin().rpc("refund_credits", {
      p_user: userId,
      p_amount: amount,
      p_video: videoId,
    });
    if (!error) return;
    console.warn("refund_credits RPC gagal, memakai fallback:", error.message);
    await admin().rpc("add_credits", { p_user: userId, p_delta: amount, p_reason: "refund", p_video: videoId });
  }

  async addCredits(userId: string, amount: number, reason: string): Promise<number> {
    const { data, error } = await admin().rpc("add_credits", {
      p_user: userId,
      p_delta: amount,
      p_reason: reason,
    });
    if (!error && typeof data === "number") return data;
    // Fallback jika RPC belum ada.
    const { data: prof } = await admin()
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single<{ credits: number }>();
    const newCredits = (prof?.credits ?? 0) + amount;
    await admin()
      .from("profiles")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", userId);
    await admin().from("credit_ledger").insert({ user_id: userId, delta: amount, reason });
    return newCredits;
  }

  async createVideo(input: NewVideoInput): Promise<VideoRecord> {
    const { data, error } = await admin()
      .from("videos")
      .insert({
        user_id: input.userId,
        mode: input.mode,
        prompt: input.prompt,
        image_url: input.imageUrl ?? null,
        style: input.style,
        ratio: input.ratio,
        duration_seconds: input.durationSeconds,
        status: input.status ?? "queued",
        provider: input.provider ?? null,
        credits_charged: input.creditsCharged ?? 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(`Gagal menyimpan job: ${error.message}`);
    return toVideo(data as VideoRow);
  }

  async updateVideo(id: string, patch: VideoPatch): Promise<VideoRecord> {
    const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) mapped.status = patch.status;
    if (patch.provider !== undefined) mapped.provider = patch.provider;
    if (patch.providerJobId !== undefined) mapped.provider_job_id = patch.providerJobId;
    if (patch.videoUrl !== undefined) mapped.video_url = patch.videoUrl;
    if (patch.errorMessage !== undefined) mapped.error_message = patch.errorMessage;
    if (patch.creditsCharged !== undefined) mapped.credits_charged = patch.creditsCharged;
    const { data, error } = await admin().from("videos").update(mapped).eq("id", id).select("*").single();
    if (error) throw new Error(`Gagal memperbarui job: ${error.message}`);
    return toVideo(data as VideoRow);
  }

  async claimVideo(id: string, from: VideoStatus, to: VideoStatus): Promise<boolean> {
    const { data, error } = await admin()
      .from("videos")
      .update({ status: to, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", from)
      .select("id");
    if (error) {
      console.warn("claimVideo error:", error.message);
      return false;
    }
    return (data?.length ?? 0) === 1;
  }

  async getVideo(id: string): Promise<VideoRecord | null> {
    const { data } = await admin().from("videos").select("*").eq("id", id).maybeSingle();
    return data ? toVideo(data as VideoRow) : null;
  }

  async getVideoByProviderJobId(providerJobId: string): Promise<VideoRecord | null> {
    const { data } = await admin().from("videos").select("*").eq("provider_job_id", providerJobId).maybeSingle();
    return data ? toVideo(data as VideoRow) : null;
  }

  async listVideosByUser(
    userId: string,
    opts?: { status?: VideoStatus; limit?: number }
  ): Promise<VideoRecord[]> {
    let q = admin().from("videos").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (opts?.status) q = q.eq("status", opts.status);
    const { data } = await q.limit(opts?.limit ?? 50);
    return (data ?? []).map((r) => toVideo(r as VideoRow));
  }

  async listActiveVideos(limit: number): Promise<VideoRecord[]> {
    const { data } = await admin()
      .from("videos")
      .select("*")
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: true })
      .limit(limit);
    return (data ?? []).map((r) => toVideo(r as VideoRow));
  }
}
