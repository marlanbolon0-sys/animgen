// Kontrak adapter provider animasi. Mengganti vendor = tulis class baru yang
// mengimplementasikan AnimationProvider lalu daftarkan di index.ts.

export type ProviderJobStatus = "queued" | "processing" | "completed" | "failed";

export interface ProviderCreateParams {
  prompt: string;
  style: string;
  ratio: string; // "9:16" | "1:1" | "16:9"
  durationSeconds: 5 | 10 | 15;
  imageUrl?: string; // wajib untuk image-to-video (dipakai sebagai first frame)
}

export interface ProviderCreateResult {
  providerJobId: string;
}

export interface ProviderPollResult {
  status: ProviderJobStatus;
  progress?: number; // 0..1
  videoUrl?: string;
  error?: string;
}

export interface AnimationProvider {
  readonly name: string;
  createTextToVideo(params: ProviderCreateParams): Promise<ProviderCreateResult>;
  createImageToVideo(params: ProviderCreateParams): Promise<ProviderCreateResult>;
  poll(providerJobId: string): Promise<ProviderPollResult>;
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}
