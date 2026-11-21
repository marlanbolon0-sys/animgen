// Membuat ikon PWA AnimGen dari satu desain SVG (konsisten dengan animgen-icon.svg).
// Output: public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
// Jalankan: bun scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>`;

// Ikon reguler: kotak membulat transparan di sudut + segitiga putih
function roundedIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  ${GRADIENT}
  <rect width="512" height="512" rx="128" fill="url(#g)"/>
  <path d="M208 160 L368 256 L208 352 Z" fill="#fff"/>
</svg>`;
}

// Ikon maskable: penuh tanpa transparansi, konten di zona aman (±80% tengah)
function maskableIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  ${GRADIENT}
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="256" cy="256" r="170" fill="#ffffff" opacity="0.08"/>
  <path d="M224 186 L330 256 L224 326 Z" fill="#fff"/>
</svg>`;
}

const jobs = [
  ["icon-192.png", roundedIcon(192)],
  ["icon-512.png", roundedIcon(512)],
  ["maskable-512.png", maskableIcon(512)],
  ["apple-touch-icon.png", maskableIcon(180)], // iOS: penuh tanpa transparansi
];

for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(`public/icons/${name}`);
  console.log("OK public/icons/" + name);
}
