import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt, PwaRegister } from "@/components/pwa/pwa";
import { NEW_USER_CREDITS } from "@/lib/pricing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnimGen — Buat Video Animasi AI dari Teks & Gambar",
  description:
    `Ubah deskripsi teks atau satu gambar menjadi video animasi pendek untuk TikTok, Reels, iklan produk, dan konten edukasi. Mobile-first, ${NEW_USER_CREDITS} kredit gratis untuk pengguna baru.`,
  keywords: ["animasi AI", "text to video", "image to video", "AnimGen", "video pendek", "AI Indonesia"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AnimGen",
  },
  icons: {
    icon: [
      { url: "/animgen-icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster position="top-center" richColors />
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
