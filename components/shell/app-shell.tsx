"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  ShoppingBag,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreditChip } from "./credit-chip";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/buat", label: "Buat Animasi", icon: Wand2 },
  { href: "/galeri", label: "Galeri", icon: Images },
  { href: "/beli", label: "Beli Kredit", icon: ShoppingBag },
];

export function AppShell({
  email,
  credits,
  demoMode,
  children,
}: {
  email: string;
  credits: number;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/keluar", { method: "POST" }).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Anim<span className="text-gradient">Gen</span>
            </span>
            {demoMode && (
              <Badge variant="outline" className="hidden border-amber-300 bg-amber-50 text-[10px] text-amber-800 sm:inline-flex">
                Mode Demo
              </Badge>
            )}
          </Link>

          <div className="flex items-center gap-2">
            {/* Navigasi desktop */}
            <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-violet-100 text-violet-800"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <CreditChip initialCredits={credits} />
            {/* Menu akun / mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" aria-label="Menu akun">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Navigasi mobile */}
                <div className="md:hidden">
                  {NAV_ITEMS.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4" /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-auto border-t bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 pb-safe text-center text-xs text-muted-foreground">
          © 2026 AnimGen MVP · ungu · biru elektrik · hitam — dibuat untuk kreator Indonesia 🇮🇩
        </div>
      </footer>
    </div>
  );
}
