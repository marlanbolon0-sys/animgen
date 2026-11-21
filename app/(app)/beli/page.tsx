import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { BuyCredits } from "@/components/billing/buy-credits";

export const metadata = { title: "Beli Kredit — AnimGen" };

export default async function BeliPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Beli Kredit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kredit dipakai untuk merender video. Semakin besar paket, semakin hemat.
        </p>
      </div>
      <BuyCredits initialCredits={user.credits} />
    </div>
  );
}
