import Link from "next/link";
import { redirect } from "next/navigation";
import { Coins, Info, Sparkles, Wand2 } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { toVideoDTO } from "@/lib/dto";
import { isDemoMode } from "@/lib/env";
import { getStore, type VideoStatus } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoCard } from "@/components/shared/video-card";

export const metadata = { title: "Dashboard — AnimGen" };

const STATUS_LABEL: Record<VideoStatus, string> = {
  queued: "menunggu",
  processing: "diproses",
  completed: "selesai",
  failed: "gagal",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const store = getStore();
  const recent = await store.listVideosByUser(user.id, { limit: 3 });
  const all = await store.listVideosByUser(user.id, { limit: 100 });
  const counts = all.reduce<Record<VideoStatus, number>>(
    (acc, v) => ({ ...acc, [v.status]: acc[v.status] + 1 }),
    { queued: 0, processing: 0, completed: 0, failed: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Sapaan */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Halo{user.email ? `, ${user.email.split("@")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Siap membuat animasi pendek hari ini?
          </p>
        </div>
        <Button asChild size="lg" className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
          <Link href="/buat">
            <Wand2 className="mr-2 h-5 w-5" /> Buat Animasi
          </Link>
        </Button>
      </section>

      {/* Kartu kredit + statistik */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-violet-600 to-blue-700 text-white shadow-lg sm:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-white/80">
              <Coins className="h-4 w-4" />
              <span className="text-sm">Saldo Kredit</span>
            </div>
            <p className="mt-2 text-4xl font-extrabold">{user.credits}</p>
            <p className="mt-1 text-xs text-white/70">
              1 video 5 detik = 1 kredit · 10 detik = 2 kredit · 15 detik = 3 kredit
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/beli">Isi Kredit</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardContent className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {(Object.keys(counts) as VideoStatus[]).map((s) => (
              <div key={s} className="rounded-xl bg-muted/60 p-3 text-center">
                <p className="text-2xl font-extrabold text-violet-700">{counts[s]}</p>
                <p className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Video terbaru */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Video Terbaru</h2>
          <Link href="/galeri" className="text-sm font-medium text-violet-700 hover:underline">
            Lihat semua →
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="text-4xl">🎬</span>
              <p className="font-semibold">Belum ada video</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Mulai dari satu kalimat: “kucing oranye kartun berjalan di taman sakura”.
                Animasi pertamamu siap dalam beberapa menit.
              </p>
              <Button asChild className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
                <Link href="/buat">
                  <Sparkles className="mr-2 h-4 w-4" /> Buat Animasi Pertama
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((v) => (
              <VideoCard key={v.id} video={toVideoDTO(v)} />
            ))}
          </div>
        )}
      </section>

      {isDemoMode() && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Mode demo: video dibuat oleh provider <strong>mock</strong> (contoh MP4 statis) agar seluruh
          alur bisa dicoba tanpa API key. Sambungkan Runway lewat <code>.env</code> untuk render sungguhan.
        </p>
      )}
    </div>
  );
}
