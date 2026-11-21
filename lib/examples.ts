// Contoh prompt yang bisa diklik di form generator (diterjemahkan ke UI).

export const EXAMPLE_PROMPTS_TEXT: string[] = [
  "Kucing oranye kartun berjalan santai di taman sakura, kelopak bunga berjatuhan, 5 detik.",
  "Robot barista kecil menyeduh kopi di kedai futuristik, uap mengepul, pencahayaan hangat.",
  "Karakter piksel melompati rintangan di kota pixel art saat senja, kamera mengikuti.",
  "Sneaker berputar di atas podium biru elektrik dengan percikan cahaya, untuk iklan produk.",
  "Guru menuliskan rumus fisika di papan tulis putih lalu tersenyum ke kamera.",
  "Astronot mini melayang di antara planet warna-warni, gaya menggemaskan.",
];

export const EXAMPLE_PROMPTS_IMAGE: string[] = [
  "Karakter ini melambaikan tangan, berjalan maju, dan tersenyum.",
  "Produk ini berputar perlahan dengan pencahayaan studio yang elegan.",
  "Karakter ini menari dengan gembira, latar belakang confetti berjatuhan.",
  "Karakter ini mengangguk dan menunjuk ke arah teks promosi.",
];

// Trigger khusus untuk menguji alur gagal + refund kredit di mode mock:
// jika prompt mengandung "gagal-simulasi", provider mock akan mensimulasikan
// kegagalan provider sehingga kredit otomatis dikembalikan.
export const MOCK_FAIL_TRIGGER = "gagal-simulasi";
