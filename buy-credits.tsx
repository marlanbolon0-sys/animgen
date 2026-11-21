"use client";

import { useState } from "react";
import { toast } from "sonner";
import { notifyCredits } from "@/components/shell/credit-chip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CREDIT_PACKAGES, CREDIT_COST, NEW_USER_CREDITS, rupiah } from "@/lib/pricing";
import { Check, Coins, CreditCard, Loader2 } from "lucide-react";

export function BuyCredits({ initialCredits }: { initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function buy(packageId: string) {
    setPendingId(packageId);
    try {
      const res = await fetch("/api/credits/beli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menambahkan kredit.");
        return;
      }
      setCredits(data.credits);
      notifyCredits(data.credits);
      toast.success(`${data.added} kredit berhasil ditambahkan! 🎉`);
    } catch {
      toast.error("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Alert className="border-amber-300 bg-amber-50 text-amber-900">
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          <strong>Pembayaran placeholder (MVP).</strong> Tombol di bawah langsung menambahkan kredit
          tanpa transaksi nyata — tidak ada tagihan. Integrasi payment gateway (Midtrans/Xendit)
          direncanakan untuk tahap berikutnya.
        </AlertDescription>
      </Alert>

      <Card className="border-0 bg-gradient-to-br from-violet-600 to-blue-700 text-white">
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <Coins className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-white/80">Saldo kredit kamu</p>
              <p className="text-3xl font-extrabold">{credits}</p>
            </div>
          </div>
          <p className="hidden text-xs text-white/70 sm:block">
            5 detik = {CREDIT_COST[5]} kredit<br />
            10 detik = {CREDIT_COST[10]} kredit<br />
            15 detik = {CREDIT_COST[15]} kredit
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <Card key={pkg.id} className={pkg.popular ? "relative ring-2 ring-violet-600" : ""}>
            {pkg.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-blue-600 text-white">
                Paling Laris
              </Badge>
            )}
            <CardContent className="flex h-full flex-col gap-3 p-5 text-center">
              <p className="text-sm font-semibold text-muted-foreground">{pkg.label}</p>
              <p className="text-4xl font-extrabold text-violet-700">{pkg.credits}</p>
              <p className="text-xs text-muted-foreground">kredit · {pkg.note}</p>
              <p className="text-xl font-bold">{rupiah(pkg.price)}</p>
              <Button
                onClick={() => buy(pkg.id)}
                disabled={pendingId !== null}
                className={`mt-auto w-full text-white ${
                  pkg.popular
                    ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {pendingId === pkg.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses…
                  </>
                ) : (
                  "Beli (placeholder)"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="font-semibold">Aturan kredit</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Pengguna baru otomatis mendapat {NEW_USER_CREDITS} kredit gratis.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Video 5 detik memotong {CREDIT_COST[5]} kredit; 10 detik memotong {CREDIT_COST[10]} kredit; 15 detik memotong {CREDIT_COST[15]} kredit.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Kredit dipotong saat job masuk antrean; <strong>render gagal = kredit kembali otomatis</strong>.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Prompt yang ditolak filter konten tidak memotong kredit.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
