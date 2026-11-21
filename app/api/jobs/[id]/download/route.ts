import fs from "fs/promises";
import path from "path";
import { jsonError, requireUser } from "@/lib/api";
import { getVideoUrl } from "@/lib/animation-service";
import { getStore } from "@/lib/store";

/**
 * Proxy download MP4.
 * - URL eksternal (Runway): di-stream lewat server agar browser bisa
 *   mengunduh dengan Content-Disposition (CORS aman).
 * - URL lokal (mode mock/demo): dibaca dari folder public/.
 * Selalu verifikasi kepemilikan video terlebih dahulu.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const videoUrl = await getVideoUrl(user.id, id);
    const video = await getStore().getVideo(id);
    const filename = `animgen-${(video?.id ?? id).slice(0, 8)}-${(video?.ratio ?? "16x9").replace(":", "x")}.mp4`;
    const headers = {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
    };

    if (/^https?:\/\//i.test(videoUrl)) {
      const upstream = await fetch(videoUrl);
      if (!upstream.ok || !upstream.body) {
        return new Response(
          JSON.stringify({ error: "File video tidak dapat diakses. URL provider mungkin sudah kedaluwarsa." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(upstream.body, { headers });
    }

    // Path lokal "/samples/..." atau "/uploads/..." → baca dari folder public.
    if (!videoUrl.startsWith("/") || videoUrl.includes("..")) {
      return new Response(JSON.stringify({ error: "URL video tidak valid." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const filePath = path.join(process.cwd(), "public", videoUrl);
    const file = await fs.readFile(filePath);
    return new Response(new Uint8Array(file), { headers });
  } catch (e) {
    return jsonError(e);
  }
}
