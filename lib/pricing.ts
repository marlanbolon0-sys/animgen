// Aturan kredit & parameter generator AnimGen.

export const NEW_USER_CREDITS = 3;

/** Biaya kredit per durasi video (detik). */
export const CREDIT_COST: Record<number, number> = {
  5: 1,
  10: 2,
  15: 3,
};

export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 1000;

export const STYLE_IDS = ["anime-2d", "pixar-3d", "kartun", "pixel-art", "realistis", "whiteboard"] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export interface StyleDef {
  id: StyleId;
  label: string;
  emoji: string;
  /** Frasa yang digabung ke prompt sebelum dikirim ke provider. */
  promptPhrase: string;
}

export const STYLES: StyleDef[] = [
  {
    id: "anime-2d",
    label: "2D Anime",
    emoji: "🌸",
    promptPhrase: "gaya anime 2D Jepang, garis bersih, warna cerah",
  },
  {
    id: "pixar-3d",
    label: "3D Pixar-like",
    emoji: "🎬",
    promptPhrase: "gaya animasi 3D seperti Pixar, pencahayaan sinematik, karakter menggemaskan",
  },
  {
    id: "kartun",
    label: "Kartun",
    emoji: "🖍️",
    promptPhrase: "gaya kartun flat 2D, warna cerah, garis tegas",
  },
  {
    id: "pixel-art",
    label: "Pixel Art",
    emoji: "👾",
    promptPhrase: "gaya pixel art retro 16-bit",
  },
  {
    id: "realistis",
    label: "Realistis",
    emoji: "📷",
    promptPhrase: "gaya realistis, pencahayaan natural, detail tinggi",
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    emoji: "📝",
    promptPhrase: "gaya whiteboard explainer, garis hitam sederhana di latar putih",
  },
];

export const RATIO_IDS = ["9:16", "1:1", "16:9"] as const;
export type RatioId = (typeof RATIO_IDS)[number];

export const RATIOS: { id: RatioId; label: string; desc: string }[] = [
  { id: "9:16", label: "9:16", desc: "Vertikal — TikTok, Reels, Shorts" },
  { id: "1:1", label: "1:1", desc: "Persegi — feed Instagram" },
  { id: "16:9", label: "16:9", desc: "Landscape — YouTube, web" },
];

export const DURATION_OPTIONS = [5, 10, 15] as const;
export type DurationId = (typeof DURATION_OPTIONS)[number];

export interface CreditPackage {
  id: string;
  label: string;
  credits: number;
  price: number; // IDR
  note: string;
  popular?: boolean;
}

/** Paket kredit — pembayaran masih placeholder untuk MVP. */
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", label: "Starter", credits: 10, price: 29000, note: "±10 video 5 detik" },
  { id: "creator", label: "Creator", credits: 30, price: 75000, note: "±30 video 5 detik", popular: true },
  { id: "pro", label: "Pro", credits: 100, price: 199000, note: "±100 video 5 detik" },
];

export function creditCostFor(durationSeconds: number): number {
  return CREDIT_COST[durationSeconds] ?? 0;
}

export function rupiah(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

export function styleById(id: string): StyleDef | undefined {
  return STYLES.find((s) => s.id === id);
}

export function isValidStyle(id: string): id is StyleId {
  return STYLE_IDS.includes(id as StyleId);
}

export function isValidRatio(id: string): id is RatioId {
  return RATIO_IDS.includes(id as RatioId);
}

export function isValidDuration(d: number): d is DurationId {
  return d === 5 || d === 10 || d === 15;
}

/** Gabungkan prompt pengguna dengan frasa gaya untuk dikirim ke provider. */
export function styledPrompt(prompt: string, styleId: string): string {
  const style = styleById(styleId);
  return style ? `${prompt.trim()}. Gaya visual: ${style.promptPhrase}.` : prompt.trim();
}
