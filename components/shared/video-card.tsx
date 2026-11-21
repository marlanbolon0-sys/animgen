import Link from "next/link";
import { styleById } from "@/lib/pricing";
import type { VideoDTO } from "@/lib/dto";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RATIO_CLASS: Record<string, string> = {
  "9:16": "aspect-[9/16] max-w-[10rem]",
  "1:1": "aspect-square max-w-[13rem]",
  "16:9": "aspect-video",
};

export function VideoCard({ video }: { video: VideoDTO }) {
  const style = styleById(video.style);

  return (
    <Link href={`/galeri/${video.id}`} className="block focus-visible:outline-ring rounded-xl">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
        {/* Thumbnail */}
        <div className={`relative w-full ${RATIO_CLASS[video.ratio] ?? "aspect-video"} mx-auto bg-gradient-to-br from-violet-600/90 to-blue-600/80`}>
          {video.status === "completed" && video.imageUrl ? (
            <img src={video.imageUrl} alt={`Thumbnail ${video.prompt.slice(0, 40)}`} className="h-full w-full object-cover" />
          ) : null}
          {video.status === "completed" ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">▶</span>
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-4xl">
              {style?.emoji ?? "🎬"}
            </span>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {video.ratio} · {video.durationSeconds}s
          </span>
        </div>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={video.status} />
            <span className="text-xs text-muted-foreground">{formatDate(video.createdAt)}</span>
          </div>
          <p className="line-clamp-2 text-sm text-foreground/90">{video.prompt}</p>
          <p className="text-xs text-muted-foreground">
            {style ? `${style.emoji} ${style.label}` : video.style}
            {video.mode === "image" ? " · dari gambar" : " · dari teks"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
