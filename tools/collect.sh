#!/bin/bash
# usage: collect.sh <id> <kind: char|scene> [height]  — takes only a Gemini download newer than 4 minutes
id=$1; kind=$2; h=${3:-600}
S="C:/Users/DZHAFER/Documents/magna-atlantis"; D="/c/Users/DZHAFER/Downloads"
for i in $(seq 1 55); do f=$(find "$D" -maxdepth 1 \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) -mmin -4 ! -name "*.crdownload" -newer "$S/tools/keyout.py" | head -1); [ -n "$f" ] && break; sleep 2; done
[ -z "$f" ] && { echo "NO FILE for $id"; exit 1; }
ext="${f##*.}"
if [ "$kind" = char ]; then
  mv "$f" "$S/art-src/${id}_sheet.$ext"; python -I "$S/tools/keyout.py" "$S/art-src/${id}_sheet.$ext" "$S/art-staging/characters" "$id" idle,talk "$h"
else
  mkdir -p "$S/art-staging/scenes"; mv "$f" "$S/art-src/${id}.$ext"
  python -I -c "
from PIL import Image; im=Image.open('$S/art-src/${id}.$ext').convert('RGB'); im=im.resize((1280,720),Image.LANCZOS); im.save('$S/art-staging/scenes/${id}.jpg',quality=88,optimize=True); print('$id',im.size)"
fi
