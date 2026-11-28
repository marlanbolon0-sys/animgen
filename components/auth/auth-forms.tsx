"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { NEW_USER_CREDITS } from "@/lib/pricing";

interface AuthFormProps {
  demoMode: boolean;
}

function DemoBanner({ demoMode }: AuthFormProps) {
  if (!demoMode) return null;
  return (
    <Alert className="mt-4 border-amber-300 bg-amber-50 text-amber-900">
      <AlertDescription>
        <strong>Mode demo aktif</strong> (tanpa Supabase) — akun & data tersimpan lokal di server ini.
        Untuk produksi, isi variabel lingkungan Supabase di file <code>.env</code>.
      </AlertDescription>
    </Alert>
  );
}

function useAuthSubmit(endpoint: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: Record<string, string>) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return false;
      }
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      router.replace(next);
      router.refresh();
      return true;
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}

export function MasukForm({ demoMode }: AuthFormProps) {
  const { submit, loading, error } = useAuthSubmit("/api/auth/masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submit({ email, password });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" aria-label="Formulir masuk">
      <DemoBanner demoMode={demoMode} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}

export function DaftarForm({ demoMode }: AuthFormProps) {
  const { submit, loading, error } = useAuthSubmit("/api/auth/daftar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      return; // validasi HTML minlength juga menahan submit
    }
    await submit({ name, email, password });
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" aria-label="Formulir pendaftaran">
      <DemoBanner demoMode={demoMode} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nama panggilan (opsional)</Label>
        <Input
          id="name"
          placeholder="Misal: Rina"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "Membuat akun…" : `Daftar & Dapat ${NEW_USER_CREDITS} Kredit Gratis`}
      </Button>
    </form>
  );
}
