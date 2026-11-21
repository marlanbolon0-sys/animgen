import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { toVideoDTO } from "@/lib/dto";
import { getStore, type VideoStatus } from "@/lib/store";

const VALID_STATUS: VideoStatus[] = ["queued", "processing", "completed", "failed"];

/** Daftar video milik pengguna termasuk (opsional filter ?status=). */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") as VideoStatus | null;
    const limitParam = Number(url.searchParams.get("limit") ?? 50);

    const store = getStore();
    const videos = await store.listVideosByUser(user.id, {
      status: statusParam && VALID_STATUS.includes(statusParam) ? statusParam : undefined,
      limit: Math.min(Math.max(limitParam || 50, 1), 100),
    });
    return NextResponse.json({ videos: videos.map(toVideoDTO) });
  } catch (e) {
    return jsonError(e);
  }
}
