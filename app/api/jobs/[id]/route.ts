import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { getJobStatus } from "@/lib/animation-service";
import { toVideoDTO } from "@/lib/dto";

/** Detail satu video (cek kepemilikan). Jika aktif, status disinkronkan dulu. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const video = await getJobStatus(user.id, id);
    return NextResponse.json({ video: toVideoDTO(video) });
  } catch (e) {
    return jsonError(e);
  }
}
