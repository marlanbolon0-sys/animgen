"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "animgen-install-dismissed";

/** Mendaftarkan service worker sekali saat aplikasi dimuat. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW opsional — kegagalan tidak boleh mengganggu aplikasi */
      });
    }
  }, []);
  return null;
}

/**
 * Banner "Pasang aplikasi" untuk Android/Chrome/Edge (beforeinstallprompt)
 * dan panduan singkat untuk iPhone/iPad Safari (Add to Home Screen).
 * Hilang otomatis jika sudah berjalan sebagai aplikasi terpasang (standalone).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Deteksi lingkungan pasca-render (setState di callback timer, bukan sinkron di effect).
    const detect = () => {
      if (cancelled) return;
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (dismissed || standalone) return;

      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setIsIos(ios);
      // Safari iOS tidak pernah memicu beforeinstallprompt → tampilkan panduan.
      if (ios) setHidden(false);
    };
    const timer = setTimeout(detect, 0);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  async function install() {
    if (!deferred || typeof deferred.prompt !== "function") return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.removeItem(DISMISS_KEY);
    }
    setDeferred(null);
    setHidden(true);
  }

  function dismiss() {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (hidden) return null;

  return (
    <div
      role="dialog"
      aria-label="Pasang aplikasi AnimGen"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl"
    >
      <button
        onClick={dismiss}
        aria-label="Tutup"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-xl text-white">
          ▶
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Pasang aplikasi AnimGen</p>
          {isIos ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Di Safari iPhone/iPad: ketuk ikon <strong>Bagikan</strong> ⬆️ lalu pilih{" "}
              <strong>“Tambahkan ke Layar Utama”</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Buka seperti aplikasi biasa — tanpa address bar, ada di layar utama.
            </p>
          )}
          {!isIos && (
            <Button
              onClick={install}
              size="sm"
              className="mt-2 w-full bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90"
            >
              📲 Pasang Sekarang
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
