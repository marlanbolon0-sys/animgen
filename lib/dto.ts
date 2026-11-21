// DTO aman untuk klien (JSON) + estimasi progres untuk UI.

import type { VideoRecord } from "@/lib/store";

export interface VideoDTO {
  id: string;
  mode: "text" | "image";
  prompt: string;
  imageUrl: string | null;
  style: string;
  ratio: string;
  durationSeconds: number;
  status: "queued" | "processing" | "completed" | "failed";
  provider: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  creditsCharged: number;
  createdAt: string;
  updatedAt: string;
}

export function toVideoDTO(v: VideoRecord): VideoDTO {
  return {
    id: v.id,
    mode: v.mode,
    prompt: v.prompt,
    imageUrl: v.imageUrl,
    style: v.style,
    ratio: v.ratio,
    durationSeconds: v.durationSeconds,
    status: v.status,
    provider: v.provider,
    videoUrl: v.videoUrl,
    errorMessage: v.errorMessage,
    creditsCharged: v.creditsCharged,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

/** Estimasi total waktu proses (ms) untuk menampilkan progres di UI. */
export function estimateTotalMs(v: Pick<VideoDTO, "durationSeconds" | "mode" | "provider">): number {
  if (v.provider === "runway") return 150_000; // render nyata: ±1-3 menit
  // mock: antre 4s + proses (9s + 4s gambar + 0.8s per detik durasi)
  return 4000 + 9000 + (v.mode === "image" ? 4000 : 0) + v.durationSeconds * 800 + 1500;
}

/** Persen progres perkiraan (0-100) berdasarkan waktu berjalan. */
export function progressPercent(
  v: Pick<VideoDTO, "status" | "createdAt" | "durationSeconds" | "mode" | "provider">,
  now: number = Date.now()
): number {
  if (v.status === "completed") return 100;
  if (v.status === "failed") return 0;
  const elapsed = Math.max(0, now - new Date(v.createdAt).getTime());
  return Math.min(97, Math.round((elapsed / estimateTotalMs(v)) * 100));
}
