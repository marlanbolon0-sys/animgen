import type { MetadataRoute } from "next";

// Manifest PWA AnimGen — membuat aplikasi bisa "di-install" ke layar utama
// Android/iOS/laptop (Chrome/Edge: Install app; Safari: Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AnimGen — Buat Video Animasi AI",
    short_name: "AnimGen",
    description:
      "Ubah teks atau gambar menjadi video animasi pendek untuk TikTok, Reels, iklan produk, dan konten edukasi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06060c",
    theme_color: "#7c3aed",
    lang: "id",
    categories: ["video", "entertainment", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
