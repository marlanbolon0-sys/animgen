// Implementasi store untuk MODE DEMO (tanpa Supabase): Prisma + SQLite lokal.
// Struktur data identik dengan skema Supabase sehingga migrasi produksi mudah.

import { db } from "@/lib/db";
import { NEW_USER_CREDITS } from "@/lib/pricing";
import type {
  DataStore,
  NewVideoInput,
  UserProfile,
  VideoPatch,
  VideoRecord,
  VideoStatus,
} from "./types";
import type { CreditLedger, User, Video } from "@prisma/client";

type UserWithLedger = User & { ledger?: CreditLedger[] };

function toProfile(u: User): UserProfile {
  return { id: u.id, email: u.email, credits: u.credits, createdAt: u.createdAt.toISOString() };
}

function toVideo(v: Video): VideoRecord {
  return {
    id: v.id,
    userId: v.userId,
    mode: v.mode as VideoRecord["mode"],
    prompt: v.prompt,
    imageUrl: v.imageUrl,
    style: v.style,
    ratio: v.ratio,
    durationSeconds: v.durationSeconds,
    status: v.status as VideoStatus,
    provider: v.provider,
    providerJobId: v.providerJobId,
    videoUrl: v.videoUrl,
    errorMessage: v.errorMessage,
    creditsCharged: v.creditsCharged,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

/** Kredensial lokal — hanya untuk mode demo (verifikasi kata sandi). */
export async function localUserCredentials(
  email: string
): Promise<{ id: string; passwordHash: string | null } | null> {
  const u = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  return u ?? null;
}

export class LocalStore implements DataStore {
  readonly backend = "local" as const;

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const u = await db.user.findUnique({ where: { email } });
    return u ? toProfile(u) : null;
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const u = await db.user.findUnique({ where: { id } });
    return u ? toProfile(u) : null;
  }

  async createUser(email: string, passwordHash: string | null, name?: string | null): Promise<UserProfile> {
    const u = await db.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null,
        credits: NEW_USER_CREDITS,
        ledger: {
          create: { delta: NEW_USER_CREDITS, reason: "signup_bonus" },
        },
      },
    });
    return toProfile(u);
  }

  async consumeCredits(userId: string, amount: number, videoId: string): Promise<boolean> {
    const result = await db.$transaction(async (tx) => {
      const upd = await tx.user.updateMany({
        where: { id: userId, credits: { gte: amount } },
        data: { credits: { decrement: amount } },
      });
      if (upd.count === 0) return false;
      await tx.creditLedger.create({
        data: { userId, videoId, delta: -amount, reason: "generation" },
      });
      return true;
    });
    return result;
  }

  async refundCredits(userId: string, amount: number, videoId: string): Promise<void> {
    if (amount <= 0) return;
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { credits: { increment: amount } } }),
      db.creditLedger.create({
        data: { userId, videoId, delta: amount, reason: "refund" },
      }),
    ]);
  }

  async addCredits(userId: string, amount: number, reason: string): Promise<number> {
    const u = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      });
      await tx.creditLedger.create({ data: { userId, delta: amount, reason } });
      return updated;
    });
    return u.credits;
  }

  async createVideo(input: NewVideoInput): Promise<VideoRecord> {
    const v = await db.video.create({
      data: {
        userId: input.userId,
        mode: input.mode,
        prompt: input.prompt,
        imageUrl: input.imageUrl ?? null,
        style: input.style,
        ratio: input.ratio,
        durationSeconds: input.durationSeconds,
        status: input.status ?? "queued",
        provider: input.provider ?? null,
        creditsCharged: input.creditsCharged ?? 0,
      },
    });
    return toVideo(v);
  }

  async updateVideo(id: string, patch: VideoPatch): Promise<VideoRecord> {
    const v = await db.video.update({ where: { id }, data: patch });
    return toVideo(v);
  }

  async claimVideo(id: string, from: VideoStatus, to: VideoStatus): Promise<boolean> {
    const res = await db.video.updateMany({ where: { id, status: from }, data: { status: to } });
    return res.count === 1;
  }

  async getVideo(id: string): Promise<VideoRecord | null> {
    const v = await db.video.findUnique({ where: { id } });
    return v ? toVideo(v) : null;
  }

  async getVideoByProviderJobId(providerJobId: string): Promise<VideoRecord | null> {
    const v = await db.video.findFirst({ where: { providerJobId } });
    return v ? toVideo(v) : null;
  }

  async listVideosByUser(
    userId: string,
    opts?: { status?: VideoStatus; limit?: number }
  ): Promise<VideoRecord[]> {
    const rows = await db.video.findMany({
      where: { userId, ...(opts?.status ? { status: opts.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: opts?.limit ?? 50,
    });
    return rows.map(toVideo);
  }

  async listActiveVideos(limit: number): Promise<VideoRecord[]> {
    const rows = await db.video.findMany({
      where: { status: { in: ["queued", "processing"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map(toVideo);
  }
}
