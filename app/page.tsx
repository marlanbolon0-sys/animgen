import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Download,
  Images,
  Layers,
  PenLine,
  Play,
  RotateCcw,
  School,
  ShoppingBag,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { EXAMPLE_PROMPTS_TEXT } from "@/lib/examples";
import { CREDIT_COST, NEW_USER_CREDITS, STYLES } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function LandingPage() {
  const user = await getSessionUser();

  const steps = [
    {
      icon: PenLine,
      title: "1. Tulis atau unggah",
      desc: "Tulis deskripsi adegan, atau unggah satu gambar lalu jelaskan gerakan yang kamu inginkan.",
    },
    {
      icon: Wand2,
      title: "2. Pilih gaya & format",
      desc: "Enam gaya visual, rasio 9:16 / 1:1 / 16:9, dan durasi 5, 10, atau 15 detik.",
    },
    {
      icon: Clock,
      title: "3. Antre diproses",
      desc: "Video dirender di antrean khusus. Status progresnya selalu terlihat, bukan layar kosong.",
    },
    {
      icon: Download,
      title: "4. Preview & unduh",
      desc: "Putar hasilnya langsung, lalu unduh MP4 siap posting ke TikTok, Reels, atau YouTube.",
    },
  ];

  const modes = [
    {
      icon: PenLine,
      title: "Text-to-Animation",
      desc: "Tulis adegan dalam Bahasa Indonesia, misalnya “kucing oranye kartun berjalan di taman sakura”. AI merendernya jadi video.",
      badge: "Aktif",
      live: true,
    },
    {
      icon: Images,
      title: "Image-to-Animation",
      desc: "Unggah satu gambar sebagai frame pertama, lalu tulis gerakannya: “karakter ini melambaikan tangan dan tersenyum”.",
      badge: "Aktif",
      live: true,
    },
    {
      icon: Layers,
      title: "Storyboard Animation",
      desc: "Susun 3–5 adegan, setujui keyframe tiap adegan, lalu sistem menganimasikannya berurutan.",
      badge: "Tahap 2",
      live: false,
    },
  ];

  const audiences = [
    {
      icon: Video,
      title: "Content creator",
      desc: "Konten TikTok & Instagram Reels yang rutin, tanpa perlu kemampuan editing video.",
    },
    {
      icon: ShoppingBag,
      title: "Pemilik UMKM",
      desc: "Iklan produk pendek dari foto katalog — murah, cepat, dan bisa diposting hari itu juga.",
    },
    {
      icon: School,
      title: "Guru & pelajar",
      desc: "Media pembelajaran dan konten edukasi yang lebih hidup daripada slide statis.",
    },
    {
      icon: Sparkles,
      title: "Freelancer desain",
      desc: "Prototipe animasi klien dalam hitungan menit sebelum produksi besar.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Anim<span className="text-gradient">Gen</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Buka Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/masuk">Masuk</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/daftar">Daftar Gratis</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="hero-dark text-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-4 bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/10">
                ✨ {NEW_USER_CREDITS} kredit gratis untuk pengguna baru — tanpa kartu kredit
              </Badge>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Ubah Teks & Gambar Jadi{" "}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-blue-400 bg-clip-text text-transparent">
                  Video Animasi AI
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
                Animasi pendek untuk TikTok, Reels, iklan produk, dan konten edukasi —
                cukup tulis idemu, pilih gaya, dan biarkan AnimGen merendernya.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90 sm:w-auto">
                  <Link href={user ? "/buat" : "/daftar"}>
                    <Wand2 className="mr-2 h-5 w-5" />
                    {user ? "Buat Animasi" : "Mulai Gratis Sekarang"}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="#cara-kerja">Lihat Cara Kerja</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/50">
                Video 5 detik = 1 kredit · 10 detik = 2 kredit · 15 detik = 3 kredit · gagal render? kredit kembali otomatis.
              </p>
            </div>

            {/* Mock rasio */}
            <div className="mx-auto mt-12 flex max-w-2xl items-end justify-center gap-3 sm:gap-6">
              <div className="aspect-[9/16] w-24 rounded-2xl bg-gradient-to-b from-violet-500/60 to-blue-500/40 ring-1 ring-white/20 sm:w-32">
                <div className="flex h-full items-end p-2">
                  <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] text-white/80">9:16</span>
                </div>
              </div>
              <div className="aspect-square w-28 rounded-2xl bg-gradient-to-b from-fuchsia-500/50 to-violet-600/40 ring-1 ring-white/20 sm:w-36">
                <div className="flex h-full items-end p-2">
                  <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] text-white/80">1:1</span>
                </div>
              </div>
              <div className="aspect-[16/9] w-40 rounded-2xl bg-gradient-to-b from-blue-500/60 to-cyan-500/30 ring-1 ring-white/20 sm:w-56">
                <div className="flex h-full items-end p-2">
                  <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] text-white/80">16:9</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Cara Kerja — 4 Langkah</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
            Dari ide ke video siap posting, tanpa software editing.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <Card key={s.title} className="border-0 shadow-md">
                <CardContent className="p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mode generasi */}
        <section id="fitur" className="bg-white py-16">
          <div className="mx-auto w-full max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">Tiga Mode Generasi</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {modes.map((m) => (
                <Card key={m.title} className={m.live ? "" : "opacity-80"}>
                  <CardContent className="p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                        <m.icon className="h-5 w-5" />
                      </span>
                      <Badge variant={m.live ? "default" : "secondary"}>{m.badge}</Badge>
                    </div>
                    <h3 className="font-semibold">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Gaya visual */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Enam Gaya Visual</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted-foreground">
            Pilih gaya yang paling cocok dengan kontenmu — semua tersedia di paket MVP.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {STYLES.map((s) => (
              <span
                key={s.id}
                className="rounded-full border bg-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                {s.emoji} {s.label}
              </span>
            ))}
          </div>
        </section>

        {/* Contoh prompt */}
        <section className="bg-black py-16 text-white">
          <div className="mx-auto w-full max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Contoh Prompt — <span className="text-gradient">Coba Sekarang</span>
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
              {EXAMPLE_PROMPTS_TEXT.slice(0, 4).map((p) => (
                <div
                  key={p}
                  className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80"
                >
                  “{p}”
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-sm text-white/50">
              Semua contoh di atas bisa langsung diklik di dalam aplikasi setelah kamu masuk.
            </p>
          </div>
        </section>

        {/* Untuk siapa */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Untuk Siapa?</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((a) => (
              <Card key={a.title} className="border-0 shadow-md">
                <CardContent className="p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <a.icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Kredit */}
        <section className="bg-white py-16">
          <div className="mx-auto w-full max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Sistem Kredit yang Jujur</h2>
            <p className="mt-2 text-muted-foreground">
              Estimasi biaya selalu tampil sebelum kamu menekan tombol Generate.
            </p>
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-2xl font-extrabold text-violet-700">{NEW_USER_CREDITS} gratis</p>
                <p className="mt-1 text-sm text-muted-foreground">Kredit awal pengguna baru</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-2xl font-extrabold text-violet-700">{CREDIT_COST[5]} / video</p>
                <p className="mt-1 text-sm text-muted-foreground">Durasi 5 detik</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-2xl font-extrabold text-violet-700">{CREDIT_COST[10]} / video</p>
                <p className="mt-1 text-sm text-muted-foreground">Durasi 10 detik</p>
              </div>
            </div>
            <Button asChild size="lg" className="mt-8 bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
              <Link href={user ? "/beli" : "/daftar"}>
                <RotateCcw className="mr-2 h-5 w-5" /> Kredit kembali otomatis kalau render gagal
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>© 2026 AnimGen — MVP. Dibuat dengan Next.js & Supabase.</p>
          <div className="flex gap-4">
            <Link href="/masuk" className="hover:text-foreground">Masuk</Link>
            <Link href="/daftar" className="hover:text-foreground">Daftar</Link>
            <Link href="/beli" className="hover:text-foreground">Beli Kredit</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
