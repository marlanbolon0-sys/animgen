import { NextResponse } from "next/server";
import { WORKER_SECRET } from "@/lib/env";
import { runWorkerTick } from "@/lib/queue/worker";

/**
 * Endpoint worker untuk cron produksi (mis. tiap 20 detik):
 *   curl -X POST $APP_URL/api/worker/tick -H "x-worker-secret: $WORKER_SECRET"
 * Jika WORKER_SECRET tidak diset (dev), endpoint terbuka.
 */
export async function POST(req: Request) {
  try {
    if (WORKER_SECRET) {
      const provided = req.headers.get("x-worker-secret");
      if (provided !== WORKER_SECRET) {
        return NextResponse.json({ error: "Secret worker tidak valid." }, { status: 401 });
      }
    }
    const processed = await runWorkerTick(10);
    return NextResponse.json({ processed });
  } catch (e) {
    console.error("[AnimGen] Worker tick error:", e);
    return NextResponse.json({ error: "Worker tick gagal." }, { status: 500 });
  }
}
