"use client";

import { useEffect, useMemo, useState } from "react";
import { toVideoDTO, type VideoDTO } from "@/lib/dto";
import { VideoCard } from "@/components/shared/video-card";

const FILTERS = [
  { id: "semua", label: "Semua" },
  { id: "aktif", label: "Diproses" },
  { id: "completed", label: "Selesai" },
  { id: "failed", label: "Gagal" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function isActive(v: VideoDTO): boolean {
  return v.status === "queued" || v.status === "processing";
}

export function GalleryGrid({ initialVideos }: { initialVideos: VideoDTO[] }) {
  const [videos, setVideos] = useState<VideoDTO[]>(initialVideos);
  const [filter, setFilter] = useState<FilterId>("semua");

  const hasActive = useMemo(() => videos.some(isActive), [videos]);

  // Polling: selama ada video yang diproses, perbarui daftar tiap 4 detik.
  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/jobs?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.videos)) setVideos(data.videos.map(toVideoDTO));
      } catch {
        /* coba lagi di tick berikutnya */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [hasActive]);

  const filtered = videos.filter((v) => {
    if (filter === "semua") return true;
    if (filter === "aktif") return isActive(v);
    return v.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter galeri">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-border bg-white text-muted-foreground hover:border-violet-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {hasActive && (
        <p className="rounded-xl bg-violet-50 px-4 py-2.5 text-sm text-violet-800">
          ⏳ Ada video yang sedang diproses — daftar ini diperbarui otomatis setiap beberapa detik.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {videos.length === 0
            ? "Belum ada video. Yuk buat animasi pertamamu di menu “Buat Animasi”!"
            : "Tidak ada video pada filter ini."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
