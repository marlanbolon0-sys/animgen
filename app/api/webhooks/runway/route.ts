import { NextResponse } from "next/server";
import { RUNWAY_WEBHOOK_SECRET } from "@/lib/env";
import { getStore } from "@/lib/store";
import { processVideo } from "@/lib/queue/worker";

interface RunwayWebhookBody {
  task_id?: string;
  id?: string;
  status?: string;
}

/**
 * Webhook Runway (opsional): memicu sinkronisasi status job.
 * Worker juga melakukan polling reguler, jadi webhook hanya mempercepat update.
 * Keamanan: wajib menyamakan header x-animgen-secret dengan RUNWAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  try {
    if (!RUNWAY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { ok: false, reason: "Webhook belum dikonfigurasi (RUNWAY_WEBHOOK_SECRET kosong)." },
        { status: 503 }
      );
    }
    const provided = req.headers.get("x-animgen-secret");
    if (provided !== RUNWAY_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, reason: "Secret tidak valid." }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as RunwayWebhookBody;
    const providerJobId = body.task_id ?? body.id;
    if (!providerJobId) {
      return NextResponse.json({ ok: false, reason: "task_id tidak ada." }, { status: 400 });
    }

    const video = await getStore().getVideoByProviderJobId(providerJobId);
    if (!video) {
      // Balas 200 supaya provider tidak terus mengulang pengiriman.
      return NextResponse.json({ ok: true, known: false });
    }
    if (video.status === "queued" || video.status === "processing") {
      await processVideo(video);
    }
    return NextResponse.json({ ok: true, known: true, status: video.status });
  } catch (e) {
    console.error("[AnimGen] Webhook error:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
