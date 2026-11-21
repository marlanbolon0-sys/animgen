"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { progressPercent, type VideoDTO } from "@/lib/dto";
import type { VideoStatus } from "@/lib/store";

const STEPS: { key: string; label: string }[] = [
  { key: "queued", label: "Di antrean" },
  { key: "processing", label: "Dirender" },
  { key: "completed", label: "Selesai" },
];

const TIPS = [
  "Menyiapkan keyframe…",
  "Menggambar frame demi frame…",
  "Menghitung gerakan karakter…",
  "Menyusun warna & pencahayaan…",
  "Merender video final…",
  "Hampir siap, sabar ya…",
];

function stepIndex(status: VideoStatus): number {
  if (status === "queued") return 0;
  if (status === "processing") return 1;
  if (status === "completed") return 2;
  return 1;
}

export function JobProgress({ video }: { video: VideoDTO }) {
  const [now, setNow] = useState(() => Date.now());
  const [tip, setTip] = useState(0);

  const active = video.status === "queued" || video.status === "processing";

  useEffect(() => {
    if (!active) return;
    const t1 = setInterval(() => setNow(Date.now()), 1000);
    const t2 = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 3500);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [active]);

  const percent = progressPercent(video, now);
  const idx = stepIndex(video.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-violet-800">
          <Loader2 className="h-4 w-4 animate-spin" /> {TIPS[tip]}
        </span>
        <span className="text-sm font-bold text-violet-800">{percent}%</span>
      </div>
      <Progress value={percent} className="h-2.5" />

      <ol className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
        {STEPS.map((s, i) => {
          const done = i < idx || video.status === "completed";
          const current = i === idx && active;
          return (
            <li
              key={s.key}
              className={`rounded-xl border px-2 py-3 font-medium ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : current
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              <span className="mr-1">{done ? "✅" : current ? "🎬" : "⏳"}</span>
              {s.label}
            </li>
          );
        })}
      </ol>

      <p className="text-center text-xs text-muted-foreground">
        Kamu boleh menutup halaman ini — progres tetap berjalan dan hasilnya bisa dilihat di Galeri.
      </p>
    </div>
  );
}
