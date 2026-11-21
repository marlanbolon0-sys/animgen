import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { providerLabel } from "@/lib/providers";

/** Profil ringkas + status konfigurasi untuk UI (credit chip, badge demo). */
export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({
      user: user ? { id: user.id, email: user.email, credits: user.credits } : null,
      demoMode: isDemoMode(),
      provider: providerLabel(),
    });
  } catch (e) {
    return NextResponse.json({ user: null, demoMode: true, provider: "mock" });
  }
}
