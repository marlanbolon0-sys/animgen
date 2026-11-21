# AnimGen — MVP

**Aplikasi AI untuk membuat video animasi pendek dari teks dan/atau gambar.**
Dibuat untuk content creator TikTok/Reels, pemilik UMKM, guru/pelajar, dan freelancer desain.
Bahasa UI: Indonesia · Mobile-first · Warna: ungu, biru elektrik, hitam.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui**, **Supabase** (auth, PostgreSQL, storage), **antrean job sederhana** (database-backed worker), dan **adapter `animationProvider`** (Runway Dev API / Meshy / Mock).

---

## Ringkasan Fitur MVP (semua sesuai PRD)

| Fitur | Status | Lokasi kode |
| --- | --- | --- |
| Registrasi & login email | ✅ | `src/lib/auth.ts`, `src/app/api/auth/*`, `src/app/{masuk,daftar}` |
| Dashboard | ✅ | `src/app/(app)/dashboard/page.tsx` |
| Form generator (prompt, upload gambar opsional, 6 gaya, 3 rasio, 2 durasi) | ✅ | `src/components/generator/generator-form.tsx`, `src/app/(app)/buat` |
| Estimasi biaya kredit sebelum Generate | ✅ | `generator-form.tsx` (kartu "Perkiraan biaya") |
| Riwayat/galeri + status queued/processing/completed/failed | ✅ | `src/app/(app)/galeri`, `src/components/gallery/*` |
| Preview & download MP4 | ✅ | `video-detail.tsx`, `src/app/api/jobs/[id]/download` |
| Sistem kredit (3 gratis, 5s=1, 10s=2, gagal=refund) | ✅ | `src/lib/pricing.ts`, `src/lib/store/*`, fungsi SQL `use_credits/refund_credits` |
| Halaman Beli Kredit (pembayaran placeholder) | ✅ | `src/app/(app)/beli`, `src/app/api/credits/beli` |
| Filter prompt NSFW / kekerasan ekstrem / ilegal | ✅ | `src/lib/prompt-filter.ts` (dipanggil di `animation-service.ts`) |
| Antrean (generation TIDAK di dalam request HTTP) | ✅ | `src/lib/queue/worker.ts`, `src/app/api/worker/tick` |
| Adapter provider: Runway (text & image-to-video) + Meshy (karakter 3D, tahap 2) + Mock | ✅ | `src/lib/providers/*` |
| Kepemilikan video (user hanya akses miliknya) | ✅ | cek `userId` di service + RLS Supabase |
| **PWA — dipasang di Android / iPhone / laptop** | ✅ | `src/app/manifest.ts`, `public/sw.js`, `src/components/pwa/pwa.tsx`, `public/icons/*` |

Di luar batasan MVP (tidak dibuat, sesuai PRD): editing video lanjutan, dubbing/lip-sync, avatar talking, render 4K, template premium, kolaborasi tim, integrasi sosmed otomatis. Storyboard animation disiapkan sebagai mode **tahap 2**.

---

## 1. Arsitektur Aplikasi

```mermaid
flowchart TB
    subgraph Client["Browser (mobile-first)"]
        UI["Halaman Next.js<br/>(Landing, Auth, Dashboard,<br/>Form Generator, Galeri, Beli Kredit)"]
    end

    subgraph Next["Next.js Server (API Routes)"]
        AUTH["/api/auth/*<br/>daftar · masuk · keluar"]
        GEN["/api/generate<br/>validasi + filter prompt + potong kredit"]
        JOBS["/api/jobs · /api/jobs/:id<br/>polling status (milik user)"]
        UPL["/api/upload/image<br/>Supabase Storage / folder public"]
        BUY["/api/credits/beli<br/>placeholder payment"]
        WH["/api/webhooks/runway<br/>(opsional)"]
        TICK["/api/worker/tick<br/>(cron produksi)"]
        SVC["animation-service.ts<br/>createTextAnimationJob · createImageAnimationJob<br/>getJobStatus · getVideoUrl"]
        STORE["store (abstraksi data)<br/>local: Prisma/SQLite (demo)<br/>supabase: PostgreSQL + RLS (produksi)"]
    end

    subgraph BG["Antrean & Worker (di luar request HTTP)"]
        W["queue/worker.ts<br/>queued → processing → completed/failed<br/>gagal = refund kredit otomatis"]
    end

    subgraph Providers["animationProvider (adapter)"]
        RW["RunwayDevProvider<br/>api.dev.runwayml.com/v1<br/>gen3a_turbo / gen4_turbo"]
        MY["MeshyProvider<br/>karakter 3D (tahap 2)"]
        MK["MockProvider<br/>contoh MP4 /samples"]
    end

    UI -->|fetch JSON| AUTH & GEN & JOBS & UPL & BUY
    GEN --> SVC --> STORE
    SVC -->|kickWorker (fire-and-forget)| W
    TICK --> W
    WH --> W
    W --> STORE
    W --> RW & MY & MK
    JOBS --> SVC
```

**Prinsip penting:**

1. **Generasi tidak pernah berjalan di dalam request HTTP.** `/api/generate` hanya: validasi input → filter konten → potong kredit secara atomik → simpan job berstatus `queued` → memicu `kickWorker()` (fire-and-forget). Render berjalan di worker yang dipicu oleh tick (cron `/api/worker/tick` di produksi; polling on-read di detail job juga mendorong progres).
2. **Kredit atomik + audit.** Pemotongan memakai `use_credits()` (SQL: `update ... where credits >= amount`, lalu insert ledger) sehingga tidak bisa minus. Job gagal → `refund_credits()` otomatis. Setiap pergerakan kredit tercatat di `credit_ledger` dengan alasan (`signup_bonus | generation | refund | purchase`).
3. **Transisi status atomik.** Worker melakukan *claim* (`claimVideo(from, to)`) sebelum memproses/refund agar dua proses bersamaan tidak double-render atau double-refund.
4. **Kepemilikan data.** Semua query video difilter `userId` dari sesi; di Supabase ditambah Row Level Security (policies `*_select_own`), dan service role hanya dipakai di server.
5. **Adapter provider.** Satu interface `AnimationProvider` (`src/lib/providers/types.ts`). Vendor dipilih lewat env `ANIMATION_PROVIDER` (`runway | meshy | mock`) atau otomatis: ada `RUNWAY_API_KEY` → Runway, selain itu Mock. Ganti/tambah vendor = tulis class baru, tanpa menyentuh service/UI.
6. **Dua backend data dengan kode aplikasi yang sama.** Jika env Supabase terisi lengkap → `SupabaseStore` (PostgreSQL + RLS + Storage). Jika tidak → `LocalStore` (Prisma/SQLite, mode demo) sehingga aplikasi bisa dijalankan & diuji end-to-end tanpa akun Supabase.

---

## 2. Struktur Folder

```
animgen (root proyek)
├── prisma/
│   └── schema.prisma              # schema mode DEMO (SQLite) — identik dengan skema Supabase
├── supabase/
│   └── migrations/
│       └── 0001_init.sql          # SKEMA POSTGRESQL untuk Supabase (tabel, trigger, RPC, RLS, storage)
├── scripts/
│   └── make-samples.sh            # membuat MP4 contoh provider mock (ffmpeg)
├── public/
│   ├── samples/                   # animgen-9x16/1x1/16x9.mp4 + sample-karakter.png
│   └── uploads/                   # hasil upload gambar (mode demo)
├── src/
│   ├── middleware.ts              # proteksi rute member (dashboard/buat/galeri/beli)
│   ├── app/
│   │   ├── layout.tsx             # root layout (lang=id, tema, Toaster)
│   │   ├── globals.css            # tema Tailwind 4: ungu/biru elektrik/hitam + utilitas
│   │   ├── page.tsx               # LANDING (hero, cara kerja, mode, gaya, kredit)
│   │   ├── masuk/ · daftar/       # halaman auth
│   │   ├── (app)/                 # grup member (butuh sesi)
│   │   │   ├── layout.tsx         # guard sesi + AppShell (navbar, credit chip, footer)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── buat/page.tsx      # form generator
│   │   │   ├── galeri/page.tsx    # daftar video + filter status + polling
│   │   │   ├── galeri/[id]/page.tsx # progres, player MP4, unduh, refund info
│   │   │   └── beli/page.tsx      # paket kredit (placeholder payment)
│   │   └── api/
│   │       ├── auth/{daftar,masuk,keluar}/route.ts
│   │       ├── me/route.ts        # profil + saldo + mode aktif
│   │       ├── generate/route.ts  # buat job (validasi, filter, kredit)
│   │       ├── jobs/route.ts      # daftar job milik user (?status=&limit=)
│   │       ├── jobs/[id]/route.ts # detail job + sinkronisasi status
│   │       ├── jobs/[id]/download/route.ts # proxy unduh MP4 (cek kepemilikan)
│   │       ├── upload/image/route.ts       # unggah gambar first frame
│   │       ├── credits/beli/route.ts       # tambah kredit (PLACEHOLDER)
│   │       ├── webhooks/runway/route.ts    # pemicu sinkronisasi (secret header)
│   │       └── worker/tick/route.ts        # cron worker
│   ├── components/
│   │   ├── auth/auth-forms.tsx
│   │   ├── shell/{app-shell,credit-chip}.tsx
│   │   ├── generator/generator-form.tsx
│   │   ├── gallery/{gallery-grid,job-progress,video-detail}.tsx
│   │   ├── billing/buy-credits.tsx
│   │   └── shared/{status-badge,video-card}.tsx
│   └── lib/
│       ├── env.ts                 # baca env (API key hanya server-side)
│       ├── pricing.ts             # kredit (5s=1, 10s=2), gaya, rasio, paket harga
│       ├── prompt-filter.ts       # filter NSFW/kekerasan/ilegal
│       ├── examples.ts            # contoh prompt klik-able + trigger uji gagal
│       ├── auth.ts                # sesi: Supabase Auth / cookie HMAC (demo)
│       ├── api.ts                 # AppError + pesan error Indonesia
│       ├── animation-service.ts   # KONTRAK PRD: create…Job, getJobStatus, getVideoUrl
│       ├── dto.ts                 # DTO JSON + estimasi progres
│       ├── queue/worker.ts        # antrean sederhana + refund otomatis
│       ├── providers/
│       │   ├── types.ts           # interface AnimationProvider
│       │   ├── runway.ts          # Runway Dev API (text & image-to-video)
│       │   ├── meshy.ts           # Meshy Animation API (karakter 3D, tahap 2)
│       │   ├── mock.ts            # simulasi penuh untuk demo/uji
│       │   └── index.ts           # factory getAnimationProvider()
│       ├── store/                 # abstraksi data: local.ts | supabase.ts | index.ts
│       └── supabase/server.ts     # client @supabase/ssr (cookie sesi)
├── .env.example
└── README.md
```

---

## 3. Skema Database PostgreSQL (Supabase)

File migrasi lengkap: **`supabase/migrations/0001_init.sql`** — jalankan sekali di SQL Editor Supabase. Ringkasannya:

### `profiles` — satu baris per pengguna (dibuat otomatis dari `auth.users`)
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id` |
| `email` | text | email terdaftar |
| `credits` | integer, default **3** | saldo kredit, check `>= 0` |
| `created_at` / `updated_at` | timestamptz | otomatis |

### `videos` — job generasi (riwayat/galeri)
| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid PK | ID job |
| `user_id` | uuid FK→auth.users | pemilik (RLS: hanya bisa lihat milik sendiri) |
| `mode` | text | `text` \| `image` |
| `prompt` | text | 3–1000 karakter |
| `image_url` | text | first frame (mode image) |
| `style` | text | `anime-2d, pixar-3d, kartun, pixel-art, realistis, whiteboard` |
| `ratio` | text | `9:16` \| `1:1` \| `16:9` |
| `duration_seconds` | integer | `5` \| `10` |
| `status` | text | `queued` \| `processing` \| `completed` \| `failed` |
| `provider` / `provider_job_id` | text | jejak vendor (Runway/Meshy/Mock) |
| `video_url` | text | hasil MP4 |
| `error_message` | text | pesan gagal yang ramah |
| `credits_charged` | integer | kredit yang dipotong (1 atau 2) |

### `credit_ledger` — audit kredit
`user_id`, `video_id`, `delta` (±), `reason` (`signup_bonus | generation | refund | purchase`), `created_at`.

### Fungsi SQL (dipanggil server via service role)
- `use_credits(user, amount, video) → boolean` — potong kredit **hanya jika saldo cukup** (atomik) + tulis ledger.
- `refund_credits(user, amount, video)` — kembalikan kredit (job gagal) + ledger.
- `add_credits(user, delta, reason, video?) → integer` — tambah kredit (pembelian/bonus) + ledger.
- Trigger `handle_new_user` — profil baru otomatis + **3 kredit gratis** (ledger `signup_bonus`).

### RLS & Storage
`profiles`, `videos`, `credit_ledger` → RLS aktif; kebijakan `select` hanya untuk baris milik sendiri; insert `videos` dengan `user_id = auth.uid()`; update status **hanya** lewat service role (worker). Bucket storage publik `animgen-uploads` (folder per `user_id`).

> **Mode demo:** `prisma/schema.prisma` memuat struktur identik untuk SQLite (`db/custom.db`) sehingga aplikasi tetap jalan penuh tanpa Supabase. Logika kredit atomik memakai transaksi Prisma yang setara.

---

## 4. API Endpoints

Semua response JSON; error memakai bentuk `{ "error": "pesan Indonesia", "code": "OPSIONAL" }`.

| Method & Path | Auth | Fungsi |
| --- | --- | --- |
| `POST /api/auth/daftar` | – | Registrasi email+kata sandi (min 8 karakter). Body: `{name?, email, password}`. Berhasil → sesi cookie + profil 3 kredit. |
| `POST /api/auth/masuk` | – | Login. Body: `{email, password}`. |
| `POST /api/auth/keluar` | ✔ | Hapus sesi. |
| `GET /api/me` | – | `{user: {id,email,credits} \| null, demoMode, provider}` — untuk credit chip & badge demo. |
| `POST /api/generate` | ✔ | Buat job. Body: `{mode:"text"|"image", prompt, style, ratio, durationSeconds:5|10, imageUrl?}`. Validasi + filter prompt + potong kredit. 201 → `{video}`; 402 saldo kurang; 400 prompt ditolak. |
| `GET /api/jobs?status=&limit=` | ✔ | Daftar video milik pengguna (terbaru dulu). |
| `GET /api/jobs/:id` | ✔ | Detail video + sinkronisasi status dengan provider. 404 jika bukan miliknya. |
| `GET /api/jobs/:id/download` | ✔ | Proxy unduh MP4 (`Content-Disposition: attachment`). |
| `POST /api/upload/image` | ✔ | Multipart `file` (PNG/JPG/WebP ≤8MB). → `{url}` (Supabase Storage atau `/uploads/...` di demo). |
| `POST /api/credits/beli` | ✔ | **Placeholder payment.** Body: `{packageId:"starter"|"creator"|"pro"}` → kredit langsung ditambah. |
| `POST /api/webhooks/runway` | secret | Header `x-animgen-secret` = `RUNWAY_WEBHOOK_SECRET`. Memicu sinkronisasi status task. |
| `POST /api/worker/tick` | optional | Header `x-worker-secret` = `WORKER_SECRET` (jika diset). Cron produksi: proses antrean. |

Contoh membuat job:

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"mode":"text","prompt":"Kucing oranye kartun berjalan di taman sakura","style":"anime-2d","ratio":"9:16","durationSeconds":5}'
```

---

## 5. Halaman & Komponen UI

| Route | Isi |
| --- | --- |
| `/` | Landing: hero gelap (hitam + aura ungu/biru), 4 langkah cara kerja, 3 mode generasi (Storyboard ditandai “Tahap 2”), 6 chip gaya, contoh prompt, target pengguna, aturan kredit, CTA daftar. |
| `/daftar` · `/masuk` | Form email + kata sandi; banner “Mode demo” bila Supabase belum dikonfigurasi; redirect otomatis bila sudah masuk. |
| `/dashboard` | Sapaan, kartu saldo kredit (gradien), statistik status, 3 video terbaru, empty state, info mode demo. |
| `/buat` | GeneratorForm: tab **Teks→Animasi / Gambar→Animasi**, textarea + penghitung karakter, **contoh prompt yang bisa diklik**, pemilih gaya (6), rasio (9:16/1:1/16:9 dengan ikon bentuk), durasi (5s/10s + biaya), **estimasi biaya vs saldo**, pesan kredit kurang + tautan Beli Kredit, upload gambar dengan pratinjau & hapus. |
| `/galeri` | Grid kartu video (thumbnail rasio sesuai pilihan), filter Semua/Diproses/Selesai/Gagal, polling otomatis saat ada job aktif. |
| `/galeri/[id]` | Saat aktif: JobProgress (3 langkah + progress bar + tips animasi). Selesai: player `<video>` + **Unduh MP4** + Buat Lagi. Gagal: pesan ramah + “kredit dikembalikan otomatis”. Metadata lengkap (prompt, gaya, rasio, durasi, biaya, provider). |
| `/beli` | 3 paket kredit (Rp29rb/75rb/199rb, badge “Paling Laris”), banner **pembayaran placeholder**, aturan kredit. |

Komponen kunci: `AppShell` (navbar sticky + credit chip reaktif via event `animgen:credits` + footer sticky bottom), `StatusBadge`, `VideoCard`, `JobProgress`, `GeneratorForm`, `GalleryGrid`, `VideoDetail`, `BuyCredits`.

---

## 6. Alur Pengguna: dari Prompt sampai Video Selesai

1. **Daftar** di `/daftar` (email + kata sandi ≥8) → langsung masuk, saldo **3 kredit** (ledger `signup_bonus`).
2. **Buka `/buat`**, pilih tab *Teks → Animasi* (atau *Gambar → Animasi* + unggah gambar ≤8MB → jadi first frame).
3. Tulis deskripsi (atau **klik contoh prompt**), pilih **gaya** (mis. 2D Anime), **rasio 9:16**, **durasi 5 detik**.
4. UI menampilkan **“Perkiraan biaya: 1 kredit — Saldo kamu: 3 kredit”**. Tombol *Generate Animasi* menampilkan biaya yang sama.
5. Tekan **Generate** → `POST /api/generate`: filter prompt (ditolak? → pesan ramah, **kredit tidak terpotong**), kredit dipotong atomik, job tersimpan `queued`, pengguna diarahkan ke `/galeri/[id]`.
6. Worker (fire-and-forget + tick) mengambil job → status `processing` → kirim ke provider (`animationProvider.createTextToVideo`/`createImageToVideo`), simpan `provider_job_id`.
7. Halaman detail **polling tiap 4 detik**: progress bar + 3 langkah (Di antrean → Dirender → Selesai) + tips berjalan. Pengguna boleh menutup halaman; Galeri juga memperbarui otomatis.
8. Provider selesai → `poll()` mengembalikan URL video → status `completed`, URL tersimpan → player MP4 muncul + tombol **Unduh** (`/api/jobs/:id/download`, cek kepemilikan).
9. Bila provider **gagal** → status `failed` + `refund_credits()` otomatis + pesan jelas di UI (“N kredit dikembalikan”).
10. Butuh lebih banyak? **`/beli`** → pilih paket → (placeholder) kredit bertambah, credit chip di navbar ikut terbarui real-time.

Durasi provider: **mock ≈ 15–25 detik** (bisa langsung dicoba), **Runway nyata ±1–3 menit** (estimasi progres menyesuaikan).

---

## 7. Kode Awal yang Sudah Tersedia (sesuai PRD #7)

- **Auth**: `src/lib/auth.ts` (Supabase Auth + cookie sesi demo), `src/app/api/auth/*`, `src/middleware.ts`.
- **Form**: `src/components/generator/generator-form.tsx` + `src/app/(app)/buat/page.tsx`.
- **Database**: `supabase/migrations/0001_init.sql` (produksi) + `prisma/schema.prisma` (demo) + `src/lib/store/*`.
- **Runway adapter**: `src/lib/providers/runway.ts` (text_to_video `gen3a_turbo`, image_to_video `gen4_turbo` dengan first frame; 10s otomatis turun ke `gen3a_turbo`; rasio dipetakan ke `720:1280 / 960:960 / 1280:720`) — plus `meshy.ts` (karakter 3D, tahap 2) dan `mock.ts`.
- **Galeri**: `src/components/gallery/*` + `src/app/(app)/galeri/**`.

Service API sesuai kontrak PRD ada di `src/lib/animation-service.ts`:
`createTextAnimationJob(prompt, style, ratio, duration)` · `createImageAnimationJob(prompt, imageUrl, ratio, duration)` · `getJobStatus(jobId)` · `getVideoUrl(jobId)` (semua menerima `userId` dari sesi untuk penjagaan kepemilikan).

---

## 8. Acceptance Criteria (Given / When / Then)

**Registrasi & kredit awal**
```gherkin
Scenario: Pengguna baru mendapat 3 kredit
  Given saya berada di halaman /daftar
  When saya mendaftar dengan email dan kata sandi (min. 8 karakter)
  Then akun saya dibuat, saya langsung masuk, dan saldo kredit saya 3
  And di credit_ledger tercatat baris reason "signup_bonus" delta +3

Scenario: Validasi pendaftaran
  Given saya berada di halaman /daftar
  When saya mendaftar dengan kata sandi kurang dari 8 karakter
  Then saya melihat pesan "Kata sandi minimal 8 karakter" dan akun tidak dibuat

Scenario: Email duplikat
  Given email "a@b.com" sudah terdaftar
  When saya mendaftar ulang dengan email yang sama
  Then saya melihat pesan "Email sudah terdaftar" (HTTP 409)
```

**Generator & biaya**
```gherkin
Scenario: Estimasi biaya tampil sebelum generate
  Given saya di halaman /buat dengan saldo 3 kredit
  When saya memilih durasi 10 detik
  Then kartu estimasi menampilkan "Perkiraan biaya: 2 kredit" sebelum tombol ditekan

Scenario: Video 5 detik memotong 1 kredit
  Given saldo saya 3 kredit
  When saya membuat job text-to-animasi 5 detik
  Then saldo berubah menjadi 2, job tercatat status "queued" credits_charged=1
  And saya diarahkan ke halaman detail video dengan progres terlihat

Scenario: Video 10 detik memotong 2 kredit
  Given saldo saya 3 kredit
  When saya membuat job 10 detik
  Then saldo berubah menjadi 1 dan credits_charged=2

Scenario: Saldo tidak cukup
  Given saldo saya 0 kredit
  When saya mencoba generate
  Then tombol Generate dinonaktifkan dan muncul tautan ke halaman Beli Kredit
  And permintaan API mengembalikan HTTP 402 dengan pesan yang mudah dipahami

Scenario: Mode gambar tanpa gambar
  Given saya memilih tab "Gambar → Animasi"
  When saya menekan Generate tanpa mengunggah gambar
  Then tombol tidak aktif dan API menolak dengan pesan "Gambar wajib diunggah…"
```

**Filter konten**
```gherkin
Scenario: Prompt NSFW ditolak tanpa pemotongan kredit
  Given saldo saya 3 kredit
  When saya membuat job dengan prompt yang mengandung kata NSFW
  Then saya melihat pesan "Prompt ditolak… konten dewasa/NSFW…"
  And saldo tetap 3 kredit dan tidak ada job tersimpan

Scenario: Prompt kekerasan ekstrem / materi ilegal ditolak
  Given saya membuat job dengan prompt berindikasi kekerasan ekstrem atau ilegal
  Then prompt ditolak dengan pesan kategori yang sesuai dan kredit tidak terpotong

Scenario: Prompt normal lolos
  Given prompt "Kucing oranye kartun berjalan di taman sakura"
  When saya generate
  Then job dibuat dan masuk antrean
```

**Siklus job & antrean**
```gherkin
Scenario: Generasi tidak memblokir request HTTP
  Given saya menekan Generate
  When POST /api/generate selesai
  Then respons datang < 2 detik dengan status job "queued"
  And proses render berjalan di worker di luar request

Scenario: Job berubah queued → processing → completed
  Given job saya sudah dibuat
  When worker memproses job hingga provider selesai
  Then status berurutan menjadi "processing" lalu "completed"
  And video_url tersimpan dan player MP4 tampil di halaman detail

Scenario: Kegagalan provider mengembalikan kredit
  Given saya membuat job dengan prompt yang memuat trigger uji "gagal-simulasi" (provider mock)
  When provider melaporkan kegagalan
  Then status menjadi "failed" dengan pesan yang mudah dipahami
  And kredit yang dipotong dikembalikan otomatis (ledger reason "refund")
  And refund tidak terjadi dua kali walau worker berjalan paralel (claim atomik)

Scenario: Progres jelas bagi pengguna
  Given job saya berstatus processing
  When saya membuka halaman detail
  Then saya melihat progress bar, 3 langkah status, dan tips animasi
  And halaman memperbarui otomatis tanpa saya perlu refresh
```

**Kepemilikan & keamanan**
```gherkin
Scenario: Pengguna tidak bisa mengakses video milik orang lain
  Given pengguna B sudah masuk
  When B membuka /galeri/{id milik A} atau GET /api/jobs/{id milik A}
  Then ia mendapat 404 dan tidak melihat video A
  And di Supabase, RLS mencegah SELECT videos milik pengguna lain

Scenario: Unduhan hanya untuk pemilik
  Given saya belum masuk atau bukan pemilik video
  When saya memanggil GET /api/jobs/{id}/download
  Then saya mendapat 401/404, bukan file MP4

Scenario: API key tidak pernah terekspos ke browser
  Given aplikasi berjalan
  When saya memeriksa kode yang dikirim ke browser
  Then RUNWAY_API_KEY / SUPABASE_SERVICE_ROLE_KEY / MESHY_API_KEY hanya dibaca di modul server
```

**Beli kredit (placeholder)**
```gherkin
Scenario: Pembelian placeholder menambah kredit
  Given saya di halaman /beli dengan saldo 1
  When saya menekan "Beli (placeholder)" pada paket Creator (30 kredit)
  Then saldo berubah menjadi 31, credit chip navbar ikut berubah
  And ledger tercatat reason "purchase" delta +30
  And halaman menampilkan banner bahwa pembayaran masih placeholder
```

**Galeri**
```gherkin
Scenario: Riwayat dengan filter status
  Given saya punya video berstatus completed dan failed
  When saya membuka /galeri dan memilih filter "Gagal"
  Then hanya video gagal yang tampil, masing-masing dengan status badge

Scenario: Galeri memperbarui otomatis
  Given ada video berstatus processing di galeri
  When saya menunggu di halaman galeri
  Then daftar diperbarui otomatis tanpa refresh hingga status selesai
```

---

## Memasang AnimGen di HP & Laptop (PWA)

AnimGen adalah **Progressive Web App (PWA)**: aplikasi web yang bisa **di-install langsung dari browser** ke layar utama Android/iPhone dan ke desktop laptop — tanpa Play Store, tanpa App Store, tanpa file APK. Ikonnya muncul di layar utama, dibuka dalam jendela sendiri (tanpa address bar), dan aset statisnya tersimpan cache untuk buka cepat.

> **Syarat penting:** PWA terpasang dari **URL publik bertanda HTTPS**. Jadi terbitkan dulu aplikasinya (contoh gratis: deploy ke **Vercel** — `vercel deploy`, atau Netlify/Cloudflare Pages). Di mode preview/localhost Chrome juga mengizinkan instalasi.

### 📱 Android (Chrome / Edge / Samsung Internet)
1. Buka URL AnimGen di Chrome.
2. Tunggu banner **“📲 Pasang aplikasi AnimGen”** di bawah layar → ketuk **Pasang Sekarang**.
3. Jika banner tidak muncul: menu **⋮** → **“Install app”** / **“Tambahkan ke layar utama”**.
4. Ikon AnimGen muncul di home screen — buka seperti aplikasi biasa.

### 🍎 iPhone / iPad (Safari)
1. Buka URL AnimGen di **Safari** (wajib Safari untuk instalasi penuh).
2. Ketuk ikon **Bagikan** ⬆️ (kotak dengan panah ke atas).
3. Gulir lalu pilih **“Tambahkan ke Layar Utama”** → **Tambah**.
4. Di aplikasi terpasang, halaman menampilkan panduan yang sama (banner khusus iOS sudah disiapkan di `InstallPrompt`).

### 💻 Laptop / Desktop
- **Chrome / Edge:** klik ikon **install (⬇ atau ⊕)** di ujung kanan address bar → **Install**. Alternatif: menu ⋮ → **“Install AnimGen”**. Aplikasi terpasang sebagai jendela sendiri + shortcut di Start Menu / Launchpad / Dock.
- **Safari macOS:** belum mendukung PWA install — gunakan di tab biasa, atau pasang via Chrome/Edge.
- **Firefox:** belum mendukung instalasi PWA desktop.

### Yang didapat setelah dipasang
- Ikon AnimGen (ungu-biru) di layar utama / desktop, splash screen warna tema.
- Jendela `standalone` — terasa seperti aplikasi native, bukan tab browser.
- Cache offline untuk shell aplikasi (manifest, ikon, chunk statis, contoh MP4). Generasi video & data kredit tetap butuh internet — `/api/*` sengaja tidak pernah di-cache.

### Jika ingin masuk Play Store / App Store (opsional, tahap berikutnya)
Karena AnimGen adalah PWA standar, paket native bisa dibuat tanpa menulis ulang kode:
- **Android (APK/AAB):** [PWABuilder](https://www.pwabuilder.com) atau **Capacitor** (`npx cap add android`).
- **iOS (IPA):** **Capacitor** (`npx cap add ios`) + Xcode untuk publikasi App Store.
Keduanya membungkus URL PWA ini menjadi aplikasi store — direkomendasikan setelah MVP stabil.

### File PWA di kode
| File | Fungsi |
| --- | --- |
| `src/app/manifest.ts` | Manifest (nama, ikon 192/512 + maskable, `display: standalone`, tema ungu) |
| `public/sw.js` | Service worker: network-first untuk halaman, cache-first untuk aset statis, `/api/*` selalu jaringan |
| `src/components/pwa/pwa.tsx` | `PwaRegister` (registrasi SW) + `InstallPrompt` (banner Android + panduan iOS, bisa ditutup) |
| `public/icons/*` | Ikon 192/512, maskable, apple-touch-icon (dibuat `scripts/make-icons.mjs`) |

---

## Panduan Deploy ke Internet (untuk pemula & tanpa terminal)

### Kapan saya perlu mengekstrak `animgen-mvp.zip`?

| Situasi | Perlu ekstrak? |
| --- | --- |
| **Saya hanya ingin memakai aplikasinya** di HP/laptop | ❌ Tidak. Yang dipakai adalah aplikasi yang sudah online (URL hasil deploy). Ekstrak zip hanya dilakukan SATU KALI oleh orang yang men-deploy. |
| **Saya ingin men-deploy sendiri** (menaruh kode ke GitHub + Vercel) | ✅ Ya — dan **tidak perlu terminal**, cukup klik kanan di file manager (lihat Opsi A). |
| **Saya terbiasa dengan terminal** | ✅ Ekstrak lalu ikuti Opsi B (lebih cepat). |

**Cara ekstrak tanpa terminal:** Windows → klik kanan file zip → *Extract All / Ekstrak Semua*; macOS → cukup *double-click*; Linux → klik kanan → *Extract Here*. Hasilnya sebuah folder berisi kode aplikasi.

### Opsi A — Tanpa terminal sama sekali (via browser)

1. **Ekstrak zip** seperti di atas.
2. **Unggah kode ke GitHub** (gratis):
   - Daftar/masuk ke [github.com](https://github.com) → tombol **New repository** → nama `animgen`, pilih *Public* → **Create**.
   - Klik **"uploading an existing file"** → seret file dari folder hasil ekstrak.
   - ⚠️ **Penting:** web GitHub membatasi **100 file per unggahan**. Folder `src/` berisi ±108 file, jadi seret **per subfolder**: `src/app`, lalu `src/components`, lalu `src/lib`, dst. — diikuti folder `public`, `scripts`, `supabase`, `prisma`, dan semua file di root (`package.json`, `next.config.ts`, `README.md`, `.gitignore`, `.env.example`, ...). Ulangi hingga 135 file masuk semua → klik **Commit changes**.
   - Jangan pernah mengunggah file `.env` berisi kunci rahasia — yang diunggah hanya `.env.example`.
3. **Siapkan database Supabase** (semuanya lewat browser): buat project di [supabase.com](https://supabase.com), lalu ikuti langkah "Menjalankan & Konfigurasi" di bawah (SQL Editor + Storage) — salin URL & kunci anon/service ke tempat aman.
4. **Deploy ke Vercel** (gratis):
   - Daftar ke [vercel.com](https://vercel.com) **menggunakan akun GitHub** → **Add New… → Project** → **Import** repository `animgen`.
   - Sebelum menekan Deploy, buka **Environment Variables** dan tambahkan semua variabel dari `.env.example` (URL & kunci Supabase dari langkah 3, `RUNWAY_API_KEY`, `WORKER_SECRET`, dst.).
   - Klik **Deploy** → tunggu ±2 menit → dapat URL seperti `https://animgen-anda.vercel.app`.
5. **Pasang di HP/laptop** — buka URL tersebut lalu ikuti bagian "Memasang AnimGen di HP & Laptop" di atas. Selesai! 🎉

### Opsi B — Dengan terminal (bagi yang terbiasa)

```bash
# 1. Ekstrak & masuk folder
unzip animgen-mvp.zip -d animgen && cd animgen

# 2. Isi .env (salin dari .env.example, isi nilai Supabase + Runway)
cp .env.example .env

# 3. Deploy dengan Vercel CLI (akan diminta login)
bunx vercel        # jawab pertanyaan default → URL produksi keluar di akhir
```

Alternatif: `git init && git add . && git commit -m "AnimGen MVP"` → push ke GitHub → import manual di Vercel seperti Opsi A langkah 4.

### Setelah online
- URL produksi itulah yang dibagikan ke pengguna (untuk di-install PWA di Android/iPhone/laptop).
- Setiap perubahan kode tinggal di-push/diunggah ulang ke GitHub — Vercel otomatis membangun ulang.
- Mode preview/localhost tidak permanen: server mati saat sesi berakhir, jadi untuk dipakai sehari-hari **wajib deploy** seperti di atas.

---

## Menjalankan & Konfigurasi

### A. Mode demo (tanpa akun apa pun — default)
```bash
bun install
bun run db:push     # siapkan SQLite lokal
bash scripts/make-samples.sh   # buat MP4 contoh (sekali saja)
# dev server berjalan di port 3000
```
Provider = **mock** (siklus antre→proses→selesai ±15–25 detik, hasil = contoh MP4).
Uji alur gagal+refund: tulis prompt yang mengandung `gagal-simulasi`.

### B. Produksi dengan Supabase + Runway
1. Buat proyek di [supabase.com](https://supabase.com) → jalankan `supabase/migrations/0001_init.sql` di SQL Editor. Satu skrip ini membuat **semua tabel + bucket Storage publik `animgen-uploads`** (beserta kebijakan aksesnya) — tidak perlu setup Storage manual.
2. Ambil 3 nilai dari **Project Settings → API**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → masukkan sebagai Environment Variables di Vercel.
3. `RUNWAY_API_KEY` opsional: **tanpa kunci ini aplikasi tetap berjalan penuh dengan provider `mock`** (video contoh, gratis) — ideal untuk uji alur dulu. Isi nanti untuk render AI sungguhan.
4. `NEXT_PUBLIC_APP_URL` diisi URL produksi (mis. `https://animgen-anda.vercel.app`) — karena URL baru diketahui setelah deploy pertama, isi lalu **Deploy ulang**.
5. **Antrean tidak butuh cron untuk mulai jalan**: setiap kali pengguna membuka Galeri/detail video (polling klien tiap ±3 detik), server ikut mendorong job berstatus queued/processing (`getJobStatus` → `processVideo`). Cron eksternal `POST /api/worker/tick` (header `x-worker-secret: WORKER_SECRET`) hanya **cadangan** untuk memproses job saat tak ada yang membuka aplikasi — di Vercel pakai Vercel Cron (butuh paksa Pro untuk per menit) atau pg_cron+pg_net di Supabase; atau andalkan webhook Runway.
6. Opsional: aktifkan konfirmasi email di Supabase Auth jika diinginkan (MVP ini langsung mengaktifkan akun agar alur cepat dicoba).

### Catatan teknis & asumsi
- Runway: URL hasil render kedaluwarsa (±1 jam); untuk produksi disarankan mirror ke Supabase Storage/R2 (roadmap). `gen4_turbo` hanya mendukung 5 detik → permintaan 10 detik otomatis memakai `gen3a_turbo`.
- Filter prompt MVP = daftar kata (ID+EN) + normalisasi leetspeak; moderasi berbasis model disarankan pada tahap lanjut.
- Pembayaran di `/beli` **placeholder** — tanpa tagihan nyata; siapkan Midtrans/Xendit + webhook pada tahap berikutnya.
- Mode demo menyimpan upload ke `public/uploads/` (folder per user), bukan storage cloud.
