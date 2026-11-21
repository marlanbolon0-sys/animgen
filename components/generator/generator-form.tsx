"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { notifyCredits } from "@/components/shell/credit-chip";
import { EXAMPLE_PROMPTS_IMAGE, EXAMPLE_PROMPTS_TEXT } from "@/lib/examples";
import {
  CREDIT_COST,
  DURATION_OPTIONS,
  MAX_PROMPT_LENGTH,
  RATIOS,
  STYLES,
  creditCostFor,
} from "@/lib/pricing";
import { Loader2, Sparkles, Upload, X } from "lucide-react";

type Mode = "text" | "image";

export function GeneratorForm({ initialCredits }: { initialCredits: number }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("anime-2d");
  const [ratio, setRatio] = useState<string>("9:16");
  const [duration, setDuration] = useState<number>(5);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [saldo, setSaldo] = useState(initialCredits);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = creditCostFor(duration);
  const cukupKredit = saldo >= cost;
  const bisaSubmit =
    prompt.trim().length >= 3 &&
    (mode === "text" || Boolean(imageUrl)) &&
    cukupKredit &&
    !uploading &&
    !submitting;

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Format gambar harus PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 8 MB.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal mengunggah gambar.");
        setPreviewUrl(null);
        return;
      }
      setImageUrl(data.url);
    } catch {
      setError("Tidak dapat menghubungi server saat mengunggah gambar.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearImage() {
    setPreviewUrl(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!bisaSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: prompt.trim(),
          style,
          ratio,
          durationSeconds: duration,
          imageUrl: mode === "image" ? imageUrl : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat animasi. Coba lagi.");
        return;
      }
      // Sinkronkan saldo dari server lalu buka halaman progres video.
      try {
        const me = await fetch("/api/me").then((r) => r.json());
        if (me?.user?.credits != null) {
          setSaldo(me.user.credits);
          notifyCredits(me.user.credits);
        }
      } catch {
        notifyCredits(saldo - cost);
      }
      router.push(`/galeri/${data.video.id}`);
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  const examples = mode === "image" ? EXAMPLE_PROMPTS_IMAGE : EXAMPLE_PROMPTS_TEXT;

  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-label="Formulir generator animasi">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="text">✍️ Teks → Animasi</TabsTrigger>
          <TabsTrigger value="image">🖼️ Gambar → Animasi</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">Deskripsi adegan</Label>
              <span className="text-xs text-muted-foreground">
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            </div>
            <Textarea
              id="prompt"
              placeholder="Misal: Kucing oranye kartun berjalan santai di taman sakura, kelopak bunga berjatuhan."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Tulis subjek + gerakan + suasana. Semakin jelas, hasilnya semakin bagus.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="image" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Gambar frame pertama</Label>
            {previewUrl ? (
              <div className="relative w-fit">
                <img
                  src={previewUrl}
                  alt="Pratinjau gambar yang diunggah"
                  className="max-h-48 rounded-xl border object-contain"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-white"
                  onClick={clearImage}
                  aria-label="Hapus gambar"
                >
                  <X className="h-4 w-4" />
                </Button>
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 text-sm text-white">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah…
                  </span>
                )}
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-6 text-center hover:bg-violet-50"
              >
                <Upload className="h-6 w-6 text-violet-600" />
                <span className="text-sm font-medium">Ketuk untuk unggah gambar</span>
                <span className="text-xs text-muted-foreground">PNG / JPG / WebP · maks 8 MB</span>
                <Input
                  id="image-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Gambar ini dipakai sebagai <strong>frame pertama</strong> video.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt-image">Gerakan yang diinginkan</Label>
              <span className="text-xs text-muted-foreground">
                {prompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            </div>
            <Textarea
              id="prompt-image"
              placeholder="Misal: Karakter ini melambaikan tangan, berjalan maju, dan tersenyum."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              rows={3}
              required
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Contoh prompt yang bisa diklik */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Contoh prompt — ketuk untuk memakai:</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border bg-white px-3 py-1.5 text-left text-xs text-muted-foreground shadow-sm transition-colors hover:border-violet-400 hover:text-violet-800"
            >
              “{ex.length > 70 ? `${ex.slice(0, 70)}…` : ex}”
            </button>
          ))}
        </div>
      </div>

      {/* Gaya visual */}
      <div className="space-y-2">
        <Label>Gaya visual</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyle(s.id)}
              aria-pressed={style === s.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                style === s.id
                  ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-600/30"
                  : "bg-white text-muted-foreground hover:border-violet-300"
              }`}
            >
              <span className="text-lg">{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rasio */}
      <div className="space-y-2">
        <Label>Rasio video</Label>
        <div className="grid grid-cols-3 gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRatio(r.id)}
              aria-pressed={ratio === r.id}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                ratio === r.id
                  ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-600/30"
                  : "bg-white text-muted-foreground hover:border-violet-300"
              }`}
            >
              <span
                className={`rounded-sm border-2 border-current ${
                  r.id === "9:16" ? "h-6 w-3.5" : r.id === "1:1" ? "h-5 w-5" : "h-3.5 w-6"
                }`}
              />
              {r.label}
              <span className="text-[10px] leading-tight text-muted-foreground">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Durasi */}
      <div className="space-y-2">
        <Label>Durasi</Label>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              aria-pressed={duration === d}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all ${
                duration === d
                  ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-600/30"
                  : "bg-white text-muted-foreground hover:border-violet-300"
              }`}
            >
              {d} detik
              <span className="ml-1 text-xs text-amber-600">· {CREDIT_COST[d]} kredit</span>
            </button>
          ))}
        </div>
      </div>

      {/* Estimasi biaya + submit */}
      <Card className="border-violet-100 bg-violet-50/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              Perkiraan biaya: <strong className="text-violet-800">{cost} kredit</strong>
            </span>
            <span className={cukupKredit ? "text-muted-foreground" : "font-semibold text-red-600"}>
              Saldo kamu: {saldo} kredit
            </span>
          </div>
          {!cukupKredit && (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>
                Kredit tidak cukup.{" "}
                <a href="/beli" className="font-semibold underline">
                  Isi kredit dulu di halaman Beli Kredit →
                </a>
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            disabled={!bisaSubmit}
            className="w-full h-12 text-base bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memasukkan ke antrean…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" /> Generate Animasi ({cost} kredit)
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Render biasanya 1–3 menit. Progres bisa dipantau di halaman video —
            kalau gagal, kredit otomatis kembali.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
