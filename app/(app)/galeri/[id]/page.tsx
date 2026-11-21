import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { toVideoDTO } from "@/lib/dto";
import { getStore } from "@/lib/store";
import { VideoDetail } from "@/components/gallery/video-detail";

export const metadata = { title: "Detail Video — AnimGen" };

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const { id } = await params;
  const store = getStore();
  const video = await store.getVideo(id);

  // Kepemilikan: video milik pengguna lain tidak boleh terlihat.
  if (!video || video.userId !== user.id) notFound();

  return <VideoDetail initialVideo={toVideoDTO(video)} />;
}
