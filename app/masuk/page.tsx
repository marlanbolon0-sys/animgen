import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { MasukForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Masuk — AnimGen" };

export default async function MasukPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="hero-dark flex min-h-screen flex-col items-center justify-center px-4 py-10 text-white">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-extrabold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
          ▶
        </span>
        Anim<span className="text-gradient">Gen</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-foreground shadow-2xl">
        <h1 className="text-xl font-bold">Masuk ke AnimGen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lanjutkan membuat animasi pendek dari idemu.
        </p>
        <MasukForm demoMode={isDemoMode()} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-semibold text-violet-700 hover:underline">
            Daftar gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
