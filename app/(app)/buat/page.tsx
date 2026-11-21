import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { GeneratorForm } from "@/components/generator/generator-form";

export const metadata = { title: "Buat Animasi — AnimGen" };

export default async function BuatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Buat Animasi Baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tulis ide, pilih gaya & format, lalu biarkan AnimGen merender. Estimasi biaya selalu
          tampil sebelum kamu menekan tombol Generate.
        </p>
      </div>
      <GeneratorForm initialCredits={user.credits} />
    </div>
  );
}
