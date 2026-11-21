// Kontrak lapisan data AnimGen. Dua implementasi:
//  - local.ts      → mode demo (Prisma/SQLite, tanpa Supabase)
//  - supabase.ts   → produksi (PostgreSQL/Supabase, RLS aktif)
// Pemilihan otomatis ada di index.ts.

export type VideoStatus = "queued" | "processing" | "completed" | "failed";
export type VideoMode = "text" | "image";

export interface UserProfile {
  id: string;
  email: string;
  credits: number;
  createdAt: string; // ISO
}

export interface VideoRecord {
  id: string;
  userId: string;
  mode: VideoMode;
  prompt: string;
  imageUrl: string | null;
  style: string;
  ratio: string;
  durationSeconds: number;
  status: VideoStatus;
  provider: string | null;
  providerJobId: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  creditsCharged: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface NewVideoInput {
  userId: string;
  mode: VideoMode;
  prompt: string;
  imageUrl?: string | null;
  style: string;
  ratio: string;
  durationSeconds: number;
  status?: VideoStatus;
  provider?: string;
  creditsCharged?: number;
}

export interface VideoPatch {
  status?: VideoStatus;
  provider?: string;
  providerJobId?: string;
  videoUrl?: string;
  errorMessage?: string;
  creditsCharged?: number;
}

export interface DataStore {
  readonly backend: "local" | "supabase";

  // Profil / pengguna
  getUserByEmail(email: string): Promise<UserProfile | null>;
  getUserById(id: string): Promise<UserProfile | null>;
  createUser(email: string, passwordHash: string | null, name?: string | null): Promise<UserProfile>;

  // Kredit (operasi atomik + pencatatan ledger)
  /** Kurangi kredit hanya jika saldo cukup. Return false jika saldo kurang. */
  consumeCredits(userId: string, amount: number, videoId: string): Promise<boolean>;
  /** Kembalikan kredit (refund kegagalan). */
  refundCredits(userId: string, amount: number, videoId: string): Promise<void>;
  /** Tambah kredit (pembelian/bonus). Return saldo terbaru. */
  addCredits(userId: string, amount: number, reason: string): Promise<number>;

  // Video / job
  createVideo(input: NewVideoInput): Promise<VideoRecord>;
  updateVideo(id: string, patch: VideoPatch): Promise<VideoRecord>;
  /** Transisi status atomik (mencegah double-processing / double-refund). */
  claimVideo(id: string, from: VideoStatus, to: VideoStatus): Promise<boolean>;
  getVideo(id: string): Promise<VideoRecord | null>;
  getVideoByProviderJobId(providerJobId: string): Promise<VideoRecord | null>;
  listVideosByUser(userId: string, opts?: { status?: VideoStatus; limit?: number }): Promise<VideoRecord[]>;
  /** Semua video berstatus queued/processing — bahan kerja worker. */
  listActiveVideos(limit: number): Promise<VideoRecord[]>;
}
