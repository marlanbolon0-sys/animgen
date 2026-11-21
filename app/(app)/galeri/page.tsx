import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { toVideoDTO } from "@/lib/dto";
import { getStore } from "@/lib/store";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export const metadata = { title: "Galeri Video — AnimGen" };

export default async function GaleriPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const store = getStore();
  const videos = await store.listVideosByUser(user.id, { limit: 50 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Galeri Video</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua animasi milikmu — status antre, diproses, selesai, atau gagal. Hanya kamu yang bisa melihatnya.
        </p>
      </div>
      <GalleryGrid initialVideos={videos.map(toVideoDTO)} />
    </div>
  );
}
