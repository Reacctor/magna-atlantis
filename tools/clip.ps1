param([string]$id, [string]$kind = "char", [int]$h = 600, [int]$cols = 4, [int]$rows = 3, [string]$ids = "")
# Save the clipboard image as art-src/<id>..., clear the clipboard, then process:
#   char  -> key out two poses into art-staging/characters/<id>_{idle,talk}.png (height $h)
#   scene -> art-staging/scenes/<id>.jpg 1280x720 (centre-cropped to 16:9)
#   ui    -> art-staging/ui/<id>.jpg 1280x720
#   grid  -> split a cols x rows green-screen grid into art-staging/items/<ids...>.png
Add-Type -AssemblyName System.Windows.Forms
$S = "C:\Users\DZHAFER\Documents\magna-atlantis"
$img = [System.Windows.Forms.Clipboard]::GetImage()
if (-not $img) { "NO IMAGE on clipboard for $id"; exit 1 }
switch ($kind) {
  "char" { $p = "$S\art-src\${id}_sheet.png" }
  "grid" { $p = "$S\art-src\items_${id}.png" }
  default { $p = "$S\art-src\${id}.png" }
}
$img.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
[System.Windows.Forms.Clipboard]::Clear()
"$id $($img.Width)x$($img.Height)"
$fit = "from PIL import Image; import sys; p,o=sys.argv[1],sys.argv[2]; im=Image.open(p).convert('RGB'); w,h=im.size; th=round(w*9/16); im=im.crop((0,(h-th)//2,w,(h-th)//2+th)) if h>th else im; im=im.resize((1280,720),Image.LANCZOS); im.save(o,quality=90,optimize=True); print(o, im.size)"
switch ($kind) {
  "char" { python -I "$S\tools\keyout.py" $p "$S\art-staging\characters" $id "idle,talk" $h }
  "scene" { New-Item -ItemType Directory -Force "$S\art-staging\scenes" | Out-Null; python -I -c $fit $p "$S\art-staging\scenes\$id.jpg" }
  "ui" { New-Item -ItemType Directory -Force "$S\art-staging\ui" | Out-Null; python -I -c $fit $p "$S\art-staging\ui\$id.jpg" }
  "grid" { New-Item -ItemType Directory -Force "$S\art-staging\items" | Out-Null; python -I "$S\tools\grid.py" $p "$S\art-staging\items" $cols $rows $ids }
}
