import { NextResponse } from "next/server";
import { AppError, jsonError, readJson } from "@/lib/api";
import { signInUser } from "@/lib/auth";

interface Body {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      throw new AppError(400, "Email dan kata sandi wajib diisi.");
    }
    const user = await signInUser(email, password);
    return NextResponse.json({ user: { id: user.id, email: user.email, credits: user.credits } });
  } catch (e) {
    return jsonError(e);
  }
}
