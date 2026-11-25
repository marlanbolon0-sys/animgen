// Adapter Meshy Animation API — untuk animasi KARAKTER 3D (rencana tahap 2).
// Meshy menganimasikan model 3D (GLB) dengan action rig (walk, dance, dll),
// berbeda dari video umum berbasis prompt. Adapter ini disiapkan terpisah
// sesuai PRD: aktifkan dengan ANIMATION_PROVIDER=meshy + MESHY_API_KEY.
// Alur penuh (gambar → model 3D → animasi) akan dihubungkan pada tahap 2.

import { MESHY_API_KEY } from "@/lib/env";
import {
  ProviderError,
  type AnimationProvider,
  type ProviderCreateParams,
  type ProviderCreateResult,
  type ProviderPollResult,
} from "./types";

const BASE_URL = "https://api.meshy.ai";

export class MeshyProvider implements AnimationProvider {
  readonly name = "meshy";

  private headers(): Record<string, string> {
    if (!MESHY_API_KEY) {
      throw new ProviderError("MESHY_API_KEY belum dikonfigurasi di server.");
    }
    return {
      Authorization: `Bearer ${MESHY_API_KEY}`,
      "Content-Type": "application/json",
    };
  }

  // Alur MVP belum didukung Meshy — diberikan pesan yang jelas, bukan diam-diam gagal.
  async createTextToVideo(_p: ProviderCreateParams): Promise<ProviderCreateResult> {
    throw new ProviderError(
      "Meshy Animation bekerja dari model 3D (GLB), bukan prompt teks. Alur karakter 3D direncanakan untuk tahap 2."
    );
  }

  async createImageToVideo(_p: ProviderCreateParams): Promise<ProviderCreateResult> {
    throw new ProviderError(
      "Meshy Animation membutuhkan model 3D (GLB) sebagai input. Alur gambar→model 3D direncanakan untuk tahap 2."
    );
  }

  /** Tahap 2: buat job animasi dari model 3D + action (walk, dance, ...). */
  async createAnimationFromModel(modelUrl: string, action = "walk"): Promise<ProviderCreateResult> {
    const res = await fetch(`${BASE_URL}/openapi/v2/animations`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ action, model_url: modelUrl }),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new ProviderError(`Meshy API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    return { providerJobId: data.id ?? data.data?.id };
  }

  async poll(providerJobId: string): Promise<ProviderPollResult> {
    const res = await fetch(`${BASE_URL}/openapi/v2/animations/${providerJobId}`, {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!res.ok) throw new ProviderError(`Meshy API error ${res.status}`);
    const data = await res.json();
    const status = String(data.status ?? data.data?.status ?? "").toUpperCase();
    if (status === "SUCCEEDED") {
      return {
        status: "completed",
        progress: 1,
        videoUrl: data.task_url ?? data.data?.task_url,
      };
    }
    if (status === "FAILED") return { status: "failed", error: "Animasi Meshy gagal diproses." };
    if (status === "PENDING") return { status: "queued" };
    return {
      status: "processing",
      progress: typeof data.progress === "number" ? data.progress / 100 : undefined,
    };
  }
}
