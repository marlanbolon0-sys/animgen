"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toVideoDTO, type VideoDTO } from "@/lib/dto";
import { notifyCredits } from "@/components/shell/credit-chip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { JobProgress } from "./job-progress";
import { styleById } from "@/lib/pricing";
import { ArrowLeft, Download, RotateCcw, Wand2 } from "lucide-react";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VideoDetail({ initialVideo }: { initialVideo: VideoDTO }) {
  const [video, setVideo] = useState<VideoDTO>(initialVideo);
  const prevStatus = useRef(initialVideo.status);

  // Polling status selama masih queued/processing.
  useEffect(() => {
    const active = video.status === "queued" || video.status === "processing";
    if (!active) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${video.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.video) {
          const next = toVideoDTO(data.video);
          setVideo(next);
          // Saat bertransisi ke status final, sinkronkan saldo kredit (refund dsb).
          if (
            next.status !== prevStatus.current &&
            (next.status === "failed" || next.status === "completed")
          ) {
            try {
              const me = await fetch("/api/me").then((r) => r.json());
              if (me?.user?.credits != null) notifyCredits(me.user.credits);
            } catch {
              /* abaikan */
            }
          }
          prevStatus.current = next.status;
        }
      } catch {
        /* coba lagi di tick berikutnya */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [video.id, video.status]);

  const style = styleById(video.style);
  const active = video.status === "queued" || video.status === "processing";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/galeri"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Galeri
      </Link>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">Detail Video</h1>
        <StatusBadge status={video.status} />
      </div>

      {/* Area utama sesuai status */}
      {active && (
        <Card>
          <CardContent className="p-6">
            <JobProgress video={video} />
          </CardContent>
        </Card>
      )}

      {video.status === "completed" && video.videoUrl && (
        <Card className="overflow-hidden">
          <video
            controls
            autoPlay
            muted
            loop
            playsInline
            src={video.videoUrl}
            className="w-full bg-black"
            aria-label={`Video animasi: ${video.prompt.slice(0, 60)}`}
          />
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
            <Button asChild className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
              <a href={`/api/jobs/${video.id}/download`} download>
                <Download className="mr-2 h-4 w-4" /> Unduh MP4
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/buat">
                <Wand2 className="mr-2 h-4 w-4" /> Buat Animasi Lagi
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {video.status === "failed" && (
        <>
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Maaf, video ini gagal dibuat.</strong>
              <br />
              {video.errorMessage ?? "Terjadi kesalahan di provider saat merender video."}
              {video.creditsCharged > 0 && (
                <>
                  <br />
                  💜 {video.creditsCharged} kredit sudah <strong>dikembalikan otomatis</strong> ke saldo kamu.
                </>
              )}
            </AlertDescription>
          </Alert>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
              <Link href="/buat">
                <RotateCcw className="mr-2 h-4 w-4" /> Coba Prompt Lain
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/galeri">Lihat Galeri</Link>
            </Button>
          </div>
        </>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="space-y-3 p-5 text-sm">
          <div>
            <p className="font-semibold">Prompt</p>
            <p className="mt-1 rounded-lg bg-muted/60 p-3 text-foreground/90">“{video.prompt}”</p>
          </div>
          <Separator />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <dt className="text-muted-foreground">Mode</dt>
            <dd>{video.mode === "image" ? "🖼️ Gambar → Animasi" : "✍️ Teks → Animasi"}</dd>
            <dt className="text-muted-foreground">Gaya</dt>
            <dd>{style ? `${style.emoji} ${style.label}` : video.style}</dd>
            <dt className="text-muted-foreground">Rasio</dt>
            <dd>{video.ratio}</dd>
            <dt className="text-muted-foreground">Durasi</dt>
            <dd>{video.durationSeconds} detik</dd>
            <dt className="text-muted-foreground">Biaya</dt>
            <dd>{video.creditsCharged} kredit</dd>
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="capitalize">{video.provider ?? "-"}</dd>
            <dt className="text-muted-foreground">Dibuat</dt>
            <dd>{formatDateTime(video.createdAt)}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
