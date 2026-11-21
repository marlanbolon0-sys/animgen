// Worker antrean sederhana AnimGen.
// Generasi video TIDAK pernah dijalankan di dalam request HTTP: /api/generate
// hanya membuat record berstatus "queued" lalu memanggil kickWorker()
// (fire-and-forget). Worker mengambil job queued/processing dan berbicara
// dengan provider. Untuk produksi serverless, panggil POST /api/worker/tick
// dari cron (mis. Vercel Cron / Supabase pg_cron) tiap 15-30 detik.

import { getAnimationProvider } from "@/lib/providers";
import { getStore, type VideoRecord } from "@/lib/store";

let ticking = false;

interface ProviderCreateParams {
  prompt: string;
  style: string;
  ratio: string;
  durationSeconds: 5 | 10 | 15;
  imageUrl?: string;
}

async function createAtProvider(video: VideoRecord): Promise<string> {
  const provider = getAnimationProvider();
  const params: ProviderCreateParams = {
    prompt: video.prompt,
    style: video.style,
    ratio: video.ratio,
    durationSeconds: ([5, 10, 15].includes(video.durationSeconds) ? video.durationSeconds : 5) as 5 | 10 | 15,
    imageUrl: video.imageUrl ?? undefined,
  };
  const result =
    video.mode === "image"
      ? await provider.createImageToVideo(params)
      : await provider.createTextToVideo(params);
  await getStore().updateVideo(video.id, {
    providerJobId: result.providerJobId,
    provider: provider.name,
  });
  return result.providerJobId;
}

/** Tandai gagal + refund kredit — dengan claim atomik agar refund tidak ganda. */
async function failAndRefund(video: VideoRecord, errorMessage: string): Promise<void> {
  const store = getStore();
  const from = video.status === "queued" ? "queued" : "processing";
  const claimed = await store.claimVideo(video.id, from, "failed");
  if (!claimed) return; // proses lain sudah mengubah status
  if (video.creditsCharged > 0) {
    await store.refundCredits(video.userId, video.creditsCharged, video.id);
  }
  await store.updateVideo(video.id, { errorMessage });
  console.warn(
    `[AnimGen] Job ${video.id} GAGAL: ${errorMessage} — refund ${video.creditsCharged} kredit`
  );
}

/** Proses satu video: queued → kirim ke provider; processing → poll status. */
export async function processVideo(video: VideoRecord): Promise<void> {
  const store = getStore();

  if (video.status === "queued") {
    const claimed = await store.claimVideo(video.id, "queued", "processing");
    if (!claimed) return; // diambil proses lain
    try {
      await createAtProvider({ ...video, status: "processing" });
    } catch (e) {
      await failAndRefund(
        { ...video, status: "processing" },
        e instanceof Error ? e.message : "Gagal membuat job di provider."
      );
    }
    return;
  }

  if (video.status === "processing") {
    if (!video.providerJobId) {
      // Claim terjadi tapi pembuatan job provider sempat terputus — coba lagi.
      try {
        await createAtProvider(video);
      } catch (e) {
        await failAndRefund(video, e instanceof Error ? e.message : "Gagal membuat job di provider.");
      }
      return;
    }
    try {
      const poll = await getAnimationProvider().poll(video.providerJobId);
      if (poll.status === "completed") {
        const claimed = await store.claimVideo(video.id, "processing", "completed");
        if (claimed && poll.videoUrl) {
          await store.updateVideo(video.id, { videoUrl: poll.videoUrl });
          console.log(`[AnimGen] Job ${video.id} SELESAI → ${poll.videoUrl}`);
        }
      } else if (poll.status === "failed") {
        await failAndRefund(video, poll.error ?? "Render gagal di provider.");
      }
      // masih queued/processing → tunggu tick berikutnya
    } catch (e) {
      // Error sementara (jaringan / 5xx provider) TIDAK langsung refund;
      // biarkan tick berikutnya mencoba lagi.
      console.error("[AnimGen] Poll provider error (dibiarkan dicoba ulang):", e);
    }
  }
}

/** Satu siklus worker. Return jumlah video yang diproses. */
export async function runWorkerTick(max = 5): Promise<number> {
  const store = getStore();
  const active = await store.listActiveVideos(max);
  let processed = 0;
  for (const video of active) {
    try {
      await processVideo(video);
      processed++;
    } catch (e) {
      console.error("[AnimGen] Tick error untuk job", video.id, e);
    }
  }
  return processed;
}

/**
 * Fire-and-forget: jalankan satu tick di latar belakang tanpa menahan respons.
 * Dipanggil setelah job dibuat. Pada runtime serverless tick ini bisa mati
 * begitu instance dibekukan — untuk produksi gunakan cron /api/worker/tick.
 */
export function kickWorker(): void {
  if (ticking) return;
  ticking = true;
  void runWorkerTick(5)
    .catch((e) => console.error("[AnimGen] Worker error:", e))
    .finally(() => {
      ticking = false;
    });
}
