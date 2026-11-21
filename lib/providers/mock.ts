// Provider MOCK — default saat RUNWAY_API_KEY belum ada.
// Mensimulasikan siklus queued → processing → completed tanpa API eksternal,
// sehingga seluruh alur (antrean, status, refund) bisa diuji end-to-end.
// Hasil video = contoh MP4 statis di /public/samples, DIPILIH SESUAI DURASI
// yang diminta (5/10/15 detik × rasio) — bukan lagi selalu 5 detik.

import { MOCK_FAIL_TRIGGER } from "@/lib/examples";
import { ProviderError, type AnimationProvider, type ProviderCreateParams, type ProviderCreateResult, type ProviderPollResult } from "./types";

const SAMPLE_VIDEOS: Record<string, Record<number, string>> = {
  "9x16": {
    5: "/samples/animgen-9x16-5s.mp4",
    10: "/samples/animgen-9x16-10s.mp4",
    15: "/samples/animgen-9x16-15s.mp4",
  },
  "1x1": {
    5: "/samples/animgen-1x1-5s.mp4",
    10: "/samples/animgen-1x1-10s.mp4",
    15: "/samples/animgen-1x1-15s.mp4",
  },
  "16x9": {
    5: "/samples/animgen-16x9-5s.mp4",
    10: "/samples/animgen-16x9-10s.mp4",
    15: "/samples/animgen-16x9-15s.mp4",
  },
};

/** Pilih video contoh sesuai durasi; kalau durasi persis tidak ada, ambil yang terkecil ≥ durasi. */
function pickSample(slug: string, dur: number): string {
  const byDur = SAMPLE_VIDEOS[slug] ?? SAMPLE_VIDEOS["16x9"];
  const durations = Object.keys(byDur).map(Number).sort((a, b) => a - b);
  const target = durations.find((d) => d >= dur) ?? durations[durations.length - 1];
  return byDur[target];
}

const QUEUE_MS = 4000; // lama "antre" disimulasikan

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class MockProvider implements AnimationProvider {
  readonly name = "mock";

  async createTextToVideo(p: ProviderCreateParams): Promise<ProviderCreateResult> {
    return this.create(p, false);
  }

  async createImageToVideo(p: ProviderCreateParams): Promise<ProviderCreateResult> {
    return this.create(p, true);
  }

  private async create(p: ProviderCreateParams, isImage: boolean): Promise<ProviderCreateResult> {
    await sleep(400); // latensi pembuatan job
    const processMs = 9000 + (isImage ? 4000 : 0) + p.durationSeconds * 800;
    const fail = p.prompt.includes(MOCK_FAIL_TRIGGER) ? 1 : 0;
    const slug = p.ratio.replace(":", "x");
    // State disandikan ke ID → worker tetap stateless (aman untuk serverless).
    // Format: mock:<start>:<processMs>:<fail>:<slug>:<durasi> — durasi ikut
    // disandikan agar poll() tahu video contoh mana yang harus diambil.
    return { providerJobId: `mock:${Date.now()}:${processMs}:${fail}:${slug}:${p.durationSeconds}` };
  }

  async poll(providerJobId: string): Promise<ProviderPollResult> {
    const parts = providerJobId.split(":");
    // 6 bagian = format baru (dengan durasi); 5 bagian = job lama sebelum
    // update ini — durasi tak diketahui, dianggap 5 detik.
    if (parts[0] !== "mock" || (parts.length !== 6 && parts.length !== 5)) {
      throw new ProviderError("ID job mock tidak valid.");
    }
    const start = Number(parts[1]);
    const processMs = Number(parts[2]);
    const fail = parts[3] === "1";
    const slug = parts[4];
    const dur = parts.length === 6 ? Number(parts[5]) || 5 : 5;
    const elapsed = Date.now() - start;

    if (fail && elapsed > QUEUE_MS + 3000) {
      return {
        status: "failed",
        error:
          "Simulasi kegagalan provider (trigger uji coba). Kredit Anda sudah dikembalikan otomatis.",
      };
    }
    if (elapsed < QUEUE_MS) return { status: "queued", progress: 0.05 };
    if (elapsed < QUEUE_MS + processMs) {
      return {
        status: "processing",
        progress: 0.1 + 0.85 * ((elapsed - QUEUE_MS) / processMs),
      };
    }
    return { status: "completed", progress: 1, videoUrl: pickSample(slug, dur) };
  }
}
