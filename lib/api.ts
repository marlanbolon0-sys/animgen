// Helper bersama untuk API routes: error terkelas, pesan Indonesia, auth guard.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import type { UserProfile } from "@/lib/store";

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(e: unknown): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  console.error("[AnimGen] Kesalahan tak terduga:", e);
  return NextResponse.json(
    { error: "Terjadi kesalahan tak terduga. Coba lagi sebentar ya." },
    { status: 500 }
  );
}

export async function requireUser(): Promise<UserProfile> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError(401, "Sesi Anda berakhir atau belum masuk. Silakan masuk dulu.");
  }
  return user;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError(400, "Format permintaan tidak valid.");
  }
}
