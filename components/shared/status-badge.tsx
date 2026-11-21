import { Badge } from "@/components/ui/badge";
import type { VideoStatus } from "@/lib/store";

const STATUS_META: Record<VideoStatus, { label: string; className: string }> = {
  queued: {
    label: "⏳ Menunggu",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  processing: {
    label: "🎬 Diproses…",
    className: "border-violet-200 bg-violet-100 text-violet-800 animate-pulse",
  },
  completed: {
    label: "✅ Selesai",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  failed: {
    label: "❌ Gagal",
    className: "border-red-200 bg-red-100 text-red-700",
  },
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.queued;
  return (
    <Badge variant="outline" className={`whitespace-nowrap ${meta.className}`}>
      {meta.label}
    </Badge>
  );
}
