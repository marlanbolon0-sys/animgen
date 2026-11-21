"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EVENT_NAME = "animgen:credits";

/** Panggil setelah saldo kredit berubah agar chip di navbar ikut terbarui. */
export function notifyCredits(credits: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<number>(EVENT_NAME, { detail: credits }));
  }
}

export function CreditChip({ initialCredits }: { initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setCredits(detail);
    };
    window.addEventListener(EVENT_NAME, handler);

    // Sinkronkan juga saat jendela kembali aktif (mis. setelah pindah tab).
    const onFocus = async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (data?.user?.credits != null) setCredits(data.user.credits);
      } catch {
        /* abaikan */
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-800"
      aria-label={`Saldo kredit: ${credits}`}
    >
      <Coins className="h-4 w-4 text-amber-500" />
      {credits} kredit
    </Badge>
  );
}
