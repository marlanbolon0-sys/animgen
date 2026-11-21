import { NextResponse } from "next/server";
import { AppError, jsonError, readJson, requireUser } from "@/lib/api";
import {
  createImageAnimationJob,
  createTextAnimationJob,
} from "@/lib/animation-service";
import { toVideoDTO } from "@/lib/dto";

interface Body {
  mode?: "text" | "image";
  prompt?: string;
  style?: string;
  ratio?: string;
  durationSeconds?: number;
  imageUrl?: string;
}

/**
 * Membuat job animasi baru.
 * Validasi + filter konten + pemotongan kredit terjadi di sini (cepat),
 * generasi video berjalan di worker antrean — bukan dalam request ini.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<Body>(req);
    const mode = body.mode === "image" ? "image" : "text";

    const input = {
      prompt: body.prompt ?? "",
      style: body.style ?? "",
      ratio: body.ratio ?? "",
      durationSeconds: Number(body.durationSeconds),
      imageUrl: body.imageUrl,
    };

    const video =
      mode === "image"
        ? await createImageAnimationJob(user.id, input as typeof input & { imageUrl: string })
        : await createTextAnimationJob(user.id, input);

    return NextResponse.json({ video: toVideoDTO(video) }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
