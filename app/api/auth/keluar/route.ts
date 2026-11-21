import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { signOutUser } from "@/lib/auth";

export async function POST() {
  try {
    await signOutUser();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
