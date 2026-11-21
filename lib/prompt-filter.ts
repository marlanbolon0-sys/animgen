// Filter prompt dasar AnimGen — MVP guardrail.
// Memblokir konten NSFW, kekerasan ekstrem, dan materi ilegal sebelum prompt
// dikirim ke provider. Ini filter kata sederhana, bukan moderasi ML penuh;
// moderasi berbasis model direncanakan pada tahap lanjut.

export type BlockedCategory = "nsfw" | "kekerasan" | "ilegal";

export interface PromptFilterResult {
  allowed: boolean;
  category?: BlockedCategory;
  message?: string;
}

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalize(text: string): string {
  const lowered = text.toLowerCase();
  let out = "";
  for (const ch of lowered) {
    out += LEET_MAP[ch] ?? ch;
  }
  // ganti semua non-alphanumeric dengan spasi lalu rapatkan spasi ganda
  return out.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

// Kata tunggal dicocokkan dengan word boundary; frasa multi-kata dengan includes.
const NSFW_WORDS = [
  "telanjang", "bugil", "porno", "bokep", "nsfw", "orgasme", "masturbasi",
  "genital", "penetrasi", "topless", "nude", "naked", "porn", "xxx", "hentai",
  "erotic", "erotis", "orgasm", "molest", "pemerkosaan", "rape",
];

const NSFW_PHRASES = [
  "anak kecil seks", "anak kecil telanjang", "child sexual", "sexual content",
  "konten dewasa", "video dewasa",
];

const VIOLENCE_WORDS = [
  "gore", "memenggal", "dipenggal", "penggalan", "disembelih", "mutilasi",
  "mutilate", "dismember", "decapitat", "behead", "disembowel", "pembantaian",
  "massacre", "genosida", "genocide", "penyiksaan", "torture",
];

const VIOLENCE_PHRASES = [
  "darah berceceran", "mayat terpotong", "dibakar hidup", "membakar orang",
  "kekerasan ekstrem",
];

const ILLEGAL_WORDS = [
  "narkoba", "sabu", "kokain", "heroin", "ganja", "metamfetamin", "fentanyl",
  "phishing", "malware", "ransomware", "keylogger", "ekstasi",
];

const ILLEGAL_PHRASES = [
  "senjata api", "bom rakitan", "bom peledak", "bahan peledak", "granat",
  "kartu kredit palsu", "kartu kredit curian", "uang palsu", "dokumen palsu",
  "paspor palsu", "pencucian uang", "jual organ", "perdagangan organ",
  "judi online", "slot online", "obat resep palsu",
];

const MESSAGES: Record<BlockedCategory, string> = {
  nsfw:
    "Prompt ditolak karena mengandung indikasi konten dewasa/NSFW. AnimGen hanya menerima konten yang aman untuk semua kalangan. Silakan tulis ulang deskripsi Anda.",
  kekerasan:
    "Prompt ditolak karena mengandung indikasi kekerasan ekstrem atau darah/darah-darahan grafis. Silakan tulis ulang deskripsi Anda.",
  ilegal:
    "Prompt ditolak karena mengandung indikasi aktivitas atau materi ilegal (narkoba, senjata, penipuan, dll). Silakan tulis ulang deskripsi Anda.",
};

function matchWords(normalized: string, words: string[]): boolean {
  return words.some((w) => new RegExp(`\\b${w}\\b`).test(normalized));
}

function matchPhrases(normalized: string, phrases: string[]): boolean {
  return phrases.some((p) => normalized.includes(p));
}

/** Periksa prompt terhadap daftar blokir. Dipanggil di server sebelum job dibuat. */
export function checkPrompt(prompt: string): PromptFilterResult {
  const n = normalize(prompt);

  if (matchWords(n, NSFW_WORDS) || matchPhrases(n, NSFW_PHRASES)) {
    return { allowed: false, category: "nsfw", message: MESSAGES.nsfw };
  }
  if (matchWords(n, VIOLENCE_WORDS) || matchPhrases(n, VIOLENCE_PHRASES)) {
    return { allowed: false, category: "kekerasan", message: MESSAGES.kekerasan };
  }
  if (matchWords(n, ILLEGAL_WORDS) || matchPhrases(n, ILLEGAL_PHRASES)) {
    return { allowed: false, category: "ilegal", message: MESSAGES.ilegal };
  }
  return { allowed: true };
}
