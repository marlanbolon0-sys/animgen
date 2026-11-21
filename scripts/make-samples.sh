#!/usr/bin/env bash
# Membuat contoh MP4 untuk provider MOCK AnimGen + gambar sampel untuk uji upload.
# Output: public/samples/animgen-{9x16,1x1,16x9}.mp4 dan public/samples/sample-karakter.png
set -euo pipefail
cd /home/z/my-project
mkdir -p public/samples public/uploads

FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CODEC_OPTS=(-c:v libx264 -pix_fmt yuv420p -crf 30 -movflags +faststart)

make_video() {
  local out="$1" size="$2" c0="$3" c1="$4" label="$5"
  ffmpeg -y -loglevel error \
    -f lavfi -i "gradients=s=${size}:d=5:c0=${c0}:c1=${c1}:speed=0.08" \
    -vf "drawtext=fontfile=${FONT}:text='AnimGen Demo':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2-30,drawtext=fontfile=${FONT}:text='${label} · mock provider':fontcolor=white@0.85:fontsize=26:x=(w-text_w)/2:y=(h-text_h)/2+30" \
    "${CODEC_OPTS[@]}" "public/samples/${out}"
  echo "OK  public/samples/${out}"
}

make_video "animgen-9x16.mp4" "720x1280" "0x7C3AED" "0x2563EB" "9x16"
make_video "animgen-1x1.mp4"   "720x720"  "0x8B5CF6" "0x3B82F6" "1x1"
make_video "animgen-16x9.mp4" "1280x720" "0x6D28D9" "0x2563EB" "16x9"

# Gambar sampel untuk menguji alur Gambar → Animasi
ffmpeg -y -loglevel error \
  -f lavfi -i "gradients=s=640x640:d=1:c0=0x7C3AED:c1=0x60A5FA:speed=0.05" \
  -vf "drawtext=fontfile=${FONT}:text='Karakter Sampel':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=(h-text_h)/2" \
  -frames:v 1 "public/samples/sample-karakter.png"
echo "OK  public/samples/sample-karakter.png"

ls -la public/samples
