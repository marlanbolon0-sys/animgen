// Adapter Runway (Runway Dev API) — text-to-video & image-to-video.
// Docs: https://docs.dev.runwayml.com  (base URL api.dev.runwayml.com/v1)
//
// Catatan model:
//  - gen3a_turbo: text-to-video & image-to-video, durasi 5s atau 10s.
//  - gen4_turbo : image-to-video (first frame wajib), hanya durasi 5s →
//                 jika pengguna memilih 10s, otomatis turun ke gen3a_turbo.
//  - Durasi pilihan pengguna kini 5/10/15s; mesin Runway masih maks 10s per
//    klip, jadi permintaan 15s otomatis dirender 10s (mode demo tetap 15s).
// Model dapat dioverride lewat RUNWAY_TEXT_MODEL / RUNWAY_IMAGE_MODEL.
//
// URL keluaran Runway kedaluwarsa (±1 jam). Untuk produksi, mirror file ke
// Supabase Storage/R2 direncanakan pada tahap berikutnya (lihat README).

import { NEXT_PUBLIC_APP_URL, RUNWAY_API_KEY } from "@/lib/env";
import { styledPrompt } from "@/lib/pricing";
import {
  ProviderError,
  type AnimationProvider,
  type ProviderCreateParams,
  type ProviderCreateResult,
  type ProviderPollResult,
} from "./types";

const BASE_URL = "https://api.dev.runwayml.com/v1";
const API_VERSION = "2024-11-06";

// Pemetaan rasio AnimGen → resolusi Runway
const RATIO_MAP: Record<string, string> = {
  "9:16": "720:1280",
  "1:1": "960:960",
  "16:9": "1280:720",
};

/** Runway butuh URL gambar absolut. */
function absoluteImageUrl(imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!NEXT_PUBLIC_APP_URL) {
    throw new ProviderError(
      "URL gambar harus absolut untuk Runway. Set NEXT_PUBLIC_APP_URL di environment server."
    );
  }
  return `${NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${imageUrl}`;
}

async function runwayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!RUNWAY_API_KEY) {
    throw new ProviderError("RUNWAY_API_KEY belum dikonfigurasi di server.");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${RUNWAY_API_KEY}`,
      "X-Runway-Version": API_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ProviderError(`Runway API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface RunwayTask {
  status: string;
  progress?: number;
  output?: string[];
  failure?: string;
}

export class RunwayProvider implements AnimationProvider {
  readonly name = "runway";

  async createTextToVideo(p: ProviderCreateParams): Promise<ProviderCreateResult> {
    let model = process.env.RUNWAY_TEXT_MODEL || "gen3a_turbo";
    const dur = Math.min(p.durationSeconds, 10) as 5 | 10;
    if (dur === 10 && model === "gen4_turbo") model = "gen3a_turbo";
    const data = await runwayFetch<{ id: string }>("/text_to_video", {
      method: "POST",
      body: JSON.stringify({
        model,
        promptText: styledPrompt(p.prompt, p.style),
        ratio: RATIO_MAP[p.ratio] ?? "1280:720",
        duration: dur,
      }),
    });
    return { providerJobId: data.id };
  }

  async createImageToVideo(p: ProviderCreateParams): Promise<ProviderCreateResult> {
    if (!p.imageUrl) throw new ProviderError("Mode image-to-video membutuhkan gambar first frame.");
    let model = process.env.RUNWAY_IMAGE_MODEL || "gen4_turbo";
    const dur = Math.min(p.durationSeconds, 10) as 5 | 10;
    if (dur === 10 && model === "gen4_turbo") model = "gen3a_turbo";
    const data = await runwayFetch<{ id: string }>("/image_to_video", {
      method: "POST",
      body: JSON.stringify({
        model,
        promptImage: absoluteImageUrl(p.imageUrl),
        promptText: styledPrompt(p.prompt, p.style),
        ratio: RATIO_MAP[p.ratio] ?? "1280:720",
        duration: Math.min(dur, model === "gen4_turbo" ? 5 : 10),
      }),
    });
    return { providerJobId: data.id };
  }

  async poll(providerJobId: string): Promise<ProviderPollResult> {
    const task = await runwayFetch<RunwayTask>(`/tasks/${providerJobId}`);
    switch (task.status) {
      case "PENDING":
      case "THROTTLED":
        return { status: "queued" };
      case "RUNNING":
        return {
          status: "processing",
          progress: typeof task.progress === "number" ? task.progress : undefined,
        };
      case "SUCCEEDED":
        return {
          status: "completed",
          videoUrl: Array.isArray(task.output) ? task.output[0] : undefined,
        };
      case "FAILED":
      case "CANCELLED":
        return { status: "failed", error: task.failure ?? "Render gagal di provider Runway." };
      default:
        return { status: "processing" };
    }
  }
}
