import { NextResponse } from "next/server";
import { AppError, jsonError, readJson, requireUser } from "@/lib/api";
import { CREDIT_PACKAGES } from "@/lib/pricing";
import { getStore } from "@/lib/store";

interface Body {
  packageId?: string;
}

/**
 * PEMBAYARAN PLACEHOLDER (MVP).
 * Tidak ada transaksi nyata: kredit langsung ditambahkan setelah tombol ditekan.
 * Integrasi payment gateway (Midtrans/Xendit) + webhook pembayaran
 * direncanakan pada tahap berikutnya — lihat README bagian roadmap.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<Body>(req);
    const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId);
    if (!pkg) {
      throw new AppError(400, "Paket kredit tidak dikenal.");
    }
    const store = getStore();
    const credits = await store.addCredits(user.id, pkg.credits, "purchase");
    return NextResponse.json({
      credits,
      packageId: pkg.id,
      added: pkg.credits,
      placeholder: true,
    });
  } catch (e) {
    return jsonError(e);
  }
}
