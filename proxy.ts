import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Proteksi halaman member (Next.js 16: konvensi "proxy" menggantikan "middleware").
//  - Mode Supabase: validasi sesi via @supabase/ssr (cookie diperbarui di sini).
//  - Mode demo: cukup cek keberadaan cookie sesi (verifikasi penuh tetap
//    dilakukan di server pada setiap halaman/route).
const PROTECTED = ["/dashboard", "/buat", "/galeri", "/beli"];
const AUTH_PAGES = ["/masuk", "/daftar"];

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let authed = false;
  if (supabaseConfigured) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    authed = Boolean(data?.user);
  } else {
    authed = Boolean(req.cookies.get("animgen_session")?.value);
  }

  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/masuk";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthPage && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/buat/:path*", "/galeri/:path*", "/beli/:path*", "/masuk", "/daftar"],
};
