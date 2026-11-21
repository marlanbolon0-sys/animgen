// Service animasi AnimGen — kontrak sesuai PRD:
//   createTextAnimationJob(prompt, style, ratio, duration)
//   createImageAnimationJob(prompt, imageUrl, ratio, duration)
//   getJobStatus(jobId)
//   getVideoUrl(jobId)
// Semua fungsi menerima userId eksplisit (diambil dari sesi di API route) dan
// menjaga kepemilikan: pengguna hanya bisa melihat/mengakses videonya sendiri.

import { AppError } from "@/lib/api";
import { kickWorker, processVideo } from "@/lib/queue/worker";
import { checkPrompt } from "@/lib/prompt-filter";
import {
  MAX_PROMPT_LENGTH,
  MIN_PROMPT_LENGTH,
  creditCostFor,
  isValidDuration,
  isValidRatio,
  isValidStyle,
} from "@/lib/pricing";
import { getAnimationProvider } from "@/lib/providers";
import { getStore, type VideoRecord } from "@/lib/store";

export interface CreateJobInput {
  prompt: string;
  style: string;
  ratio: string;
  durationSeconds: number;
  imageUrl?: string | null;
}

function validateInput(input: CreateJobInput, mode: "text" | "image"): string {
  const prompt = (input.prompt ?? "").trim();
  if (prompt.length < MIN_PROMPT_LENGTH) {
    throw new AppError(400, "Deskripsi terlalu pendek. Tulis minimal 3 karakter ya.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new AppError(400, `Deskripsi maksimal ${MAX_PROMPT_LENGTH} karakter.`);
  }
  if (!isValidStyle(input.style)) throw new AppError(400, "Gaya animasi tidak dikenal.");
  if (!isValidRatio(input.ratio)) throw new AppError(400, "Rasio video tidak dikenal.");
  if (!isValidDuration(input.durationSeconds)) {
    throw new AppError(400, "Durasi hanya boleh 5, 10, atau 15 detik.");
  }
  if (mode === "image" && !input.imageUrl) {
    throw new AppError(400, "Gambar wajib diunggah untuk mode Gambar → Animasi.");
  }
  const filter = checkPrompt(prompt);
  if (!filter.allowed) {
    throw new AppError(400, filter.message ?? "Prompt ditolak oleh filter konten.", "PROMPT_BLOCKED");
  }
  return prompt;
}

async function createAnimationJob(
  userId: string,
  mode: "text" | "image",
  input: CreateJobInput
): Promise<VideoRecord> {
  const prompt = validateInput(input, mode);
  const store = getStore();
  const provider = getAnimationProvider();
  const cost = creditCostFor(input.durationSeconds);

  const profile = await store.getUserById(userId);
  if (!profile) throw new AppError(401, "Pengguna tidak ditemukan.");
  if (profile.credits < cost) {
    throw new AppError(
      402,
      `Kredit Anda tidak cukup. Butuh ${cost} kredit, saldo Anda ${profile.credits}. Silakan isi kredit di halaman Beli Kredit.`,
      "INSUFFICIENT_CREDITS"
    );
  }

  // 1) Simpan job berstatus queued → 2) potong kredit secara atomik →
  // 3) jika pemotongan gagal (race), tandai job gagal tanpa memproses.
  let video = await store.createVideo({
    userId,
    mode,
    prompt,
    imageUrl: input.imageUrl ?? null,
    style: input.style,
    ratio: input.ratio,
    durationSeconds: input.durationSeconds,
    status: "queued",
    provider: provider.name,
    creditsCharged: cost,
  });
  const ok = await store.consumeCredits(userId, cost, video.id);
  if (!ok) {
    await store.updateVideo(video.id, {
      status: "failed",
      errorMessage: "Kredit tidak cukup saat pemotongan.",
    });
    throw new AppError(402, "Kredit tidak cukup. Silakan beli kredit terlebih dahulu.", "INSUFFICIENT_CREDITS");
  }

  // Antrean diproses di latar belakang — BUKAN di dalam request HTTP.
  kickWorker();
  return video;
}

/** Buat job Text-to-Animation. */
export async function createTextAnimationJob(
  userId: string,
  input: { prompt: string; style: string; ratio: string; durationSeconds: number }
): Promise<VideoRecord> {
  return createAnimationJob(userId, "text", input);
}

/** Buat job Image-to-Animation (gambar dipakai sebagai first frame). */
export async function createImageAnimationJob(
  userId: string,
  input: { prompt: string; imageUrl: string; style: string; ratio: string; durationSeconds: number }
): Promise<VideoRecord> {
  if (!input.imageUrl) {
    throw new AppError(400, "Gambar wajib diunggah untuk mode Gambar → Animasi.");
  }
  return createAnimationJob(userId, "image", input);
}

/** Status job milik pengguna. Jika masih aktif, sekalian dorong prosesnya. */
export async function getJobStatus(userId: string, jobId: string): Promise<VideoRecord> {
  const store = getStore();
  const video = await store.getVideo(jobId);
  if (!video || video.userId !== userId) {
    throw new AppError(404, "Video tidak ditemukan atau bukan milik Anda.");
  }
  if (video.status === "queued" || video.status === "processing") {
    try {
      await processVideo(video);
    } catch (e) {
      console.error("[AnimGen] processVideo (on-read) error:", e);
    }
    return (await store.getVideo(jobId)) ?? video;
  }
  return video;
}

/** URL video hasil (hanya jika completed dan milik pengguna). */
export async function getVideoUrl(userId: string, jobId: string): Promise<string> {
  const video = await getJobStatus(userId, jobId); // sinkronkan status dulu
  if (video.status !== "completed") {
    throw new AppError(409, "Video belum selesai diproses.");
  }
  if (!video.videoUrl) {
    throw new AppError(404, "URL video belum tersedia.");
  }
  return video.videoUrl;
}
