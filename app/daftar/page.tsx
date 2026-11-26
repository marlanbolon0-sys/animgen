import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { NEW_USER_CREDITS } from "@/lib/pricing";
import { DaftarForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Daftar — AnimGen" };

export default async function DaftarPage() {
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
        <h1 className="text-xl font-bold">Buat Akun AnimGen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar dengan email dan dapatkan <strong>{NEW_USER_CREDITS} kredit gratis</strong> — cukup untuk {NEW_USER_CREDITS} video 5 detik.
        </p>
        <DaftarForm demoMode={isDemoMode()} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-violet-700 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
