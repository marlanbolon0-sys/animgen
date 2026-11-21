import { NextResponse } from "next/server";
import { AppError, jsonError, readJson } from "@/lib/api";
import { signUpUser } from "@/lib/auth";

interface Body {
  email?: string;
  password?: string;
  name?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim() || undefined;

    if (!EMAIL_RE.test(email)) {
      throw new AppError(400, "Format email tidak valid.");
    }
    if (password.length < 8) {
      throw new AppError(400, "Kata sandi minimal 8 karakter.");
    }
    if (name && name.length > 60) {
      throw new AppError(400, "Nama maksimal 60 karakter.");
    }

    const user = await signUpUser(email, password, name);
    return NextResponse.json({ user: { id: user.id, email: user.email, credits: user.credits } });
  } catch (e) {
    return jsonError(e);
  }
}
