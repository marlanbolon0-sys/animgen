#!/usr/bin/env bash
# Smoke test end-to-end API AnimGen (mode demo/mock) — jalankan saat dev server hidup.
set -uo pipefail
BASE=http://localhost:3000
JAR=/tmp/animgen-test-cookies.txt
rm -f "$JAR"
EMAIL="test$(date +%s)@animgen.test"
PASS="sandirahasia123"

say() { echo; echo "== $1"; }
credits() { curl -s -b "$JAR" $BASE/api/me | python3 -c 'import sys,json;print(json.load(sys.stdin)["user"]["credits"])'; }
status_of() { curl -s -b "$JAR" $BASE/api/jobs/$1 | python3 -c 'import sys,json;print(json.load(sys.stdin)["video"]["status"])'; }

say "1) Daftar akun $EMAIL"
curl -s -c "$JAR" -X POST $BASE/api/auth/daftar -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Tester\"}"; echo

say "2) Saldo awal (harus 3): $(credits)"

say "3) Generate text-to-animasi 5 detik"
VID=$(curl -s -b "$JAR" -X POST $BASE/api/generate -H 'Content-Type: application/json' \
  -d '{"mode":"text","prompt":"Kucing oranye kartun berjalan di taman sakura","style":"anime-2d","ratio":"9:16","durationSeconds":5}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["video"]["id"])')
echo "  video id: $VID"

say "4) Polling sampai selesai (maks 60s)"
ST=""
for i in $(seq 1 30); do
  sleep 2
  ST=$(status_of "$VID")
  echo "  t=$((i*2))s status=$ST"
  if [ "$ST" = "completed" ] || [ "$ST" = "failed" ]; then break; fi
done
curl -s -b "$JAR" $BASE/api/jobs/$VID | python3 -c 'import sys,json;v=json.load(sys.stdin)["video"];print("  url:",v["videoUrl"],"| provider:",v["provider"])'

say "5) Unduh MP4"
curl -s -b "$JAR" -o /tmp/animgen-dl.mp4 -w "  http=%{http_code} bytes=%{size_download}\n" $BASE/api/jobs/$VID/download
file /tmp/animgen-dl.mp4 | sed 's/^/  /'

say "6) Saldo setelah 1 video 5s (harus 2): $(credits)"

say "7) Prompt NSFW ditolak"
curl -s -b "$JAR" -X POST $BASE/api/generate -H 'Content-Type: application/json' \
  -d '{"mode":"text","prompt":"wanita telanjang di pantai","style":"realistis","ratio":"9:16","durationSeconds":5}'; echo
echo "  saldo (harus tetap 2): $(credits)"

say "8) Simulasi gagal provider + refund otomatis"
VID2=$(curl -s -b "$JAR" -X POST $BASE/api/generate -H 'Content-Type: application/json' \
  -d '{"mode":"text","prompt":"naga terbang gagal-simulasi di atas kota","style":"pixar-3d","ratio":"16:9","durationSeconds":10}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["video"]["id"])')
for i in $(seq 1 20); do
  sleep 2
  ST=$(status_of "$VID2")
  if [ "$ST" = "failed" ]; then break; fi
done
echo "  status akhir: $ST"
echo "  saldo setelah refund (harus 2 lagi): $(credits)"

say "9) Beli kredit placeholder (Creator +30)"
curl -s -b "$JAR" -X POST $BASE/api/credits/beli -H 'Content-Type: application/json' \
  -d '{"packageId":"creator"}'; echo
echo "  saldo sekarang: $(credits)"

say "10) Upload gambar first frame"
UP=$(curl -s -b "$JAR" -X POST $BASE/api/upload/image -F "file=@/home/z/my-project/public/samples/sample-karakter.png")
echo "  $UP"
IMGURL=$(echo "$UP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["url"])')

say "11) Generate image-to-animasi 10 detik"
VID3=$(curl -s -b "$JAR" -X POST $BASE/api/generate -H 'Content-Type: application/json' \
  -d "{\"mode\":\"image\",\"prompt\":\"Karakter ini melambaikan tangan dan tersenyum\",\"imageUrl\":\"$IMGURL\",\"style\":\"kartun\",\"ratio\":\"1:1\",\"durationSeconds\":10}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["video"]["id"])')
echo "  video id: $VID3"

say "12) Kepemilikan: pengguna lain tidak boleh melihat video"
JAR2=/tmp/animgen-test-cookies2.txt; rm -f "$JAR2"
curl -s -c "$JAR2" -X POST $BASE/api/auth/daftar -H 'Content-Type: application/json' \
  -d "{\"email\":\"other$(date +%s)@animgen.test\",\"password\":\"sandirahasia123\"}" > /dev/null
CODE=$(curl -s -b "$JAR2" -o /dev/null -w "%{http_code}" $BASE/api/jobs/$VID)
echo "  GET /api/jobs/$VID sebagai user lain -> HTTP $CODE (harus 404)"

say "13) Halaman member tanpa sesi -> redirect"
curl -s -o /dev/null -w "  /galeri -> %{http_code}\n" $BASE/galeri

echo; echo "== SMOKE TEST SELESAI =="
