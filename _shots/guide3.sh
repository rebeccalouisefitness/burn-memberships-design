#!/bin/bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p /tmp/burn-g3 && cd /tmp/burn-g3
curl -s --max-time 20 https://tone-transform-guide.netlify.app/ -o g.html
python3 - <<'PY'
s=open('g.html').read()
inj='<base href="https://tone-transform-guide.netlify.app/"><style>*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}.scale-intro{display:none!important}</style>'
s=s.replace('<head>','<head>'+inj,1)
open('g.html','w').write(s)
PY
timeout 70 "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/burn-hl4 --force-device-scale-factor=1.5 --window-size=520,1125 --virtual-time-budget=12000 --screenshot=/tmp/burn-g3/g.png "file:///tmp/burn-g3/g.html" >/dev/null 2>&1
ffmpeg -y -loglevel error -i g.png -vf "scale=780:1688,crop=780:1570:0:0,pad=780:1688:0:118:color=0xffffff,scale=900:1948" -q:v 3 ~/burn-brief-wt/_shots/guide3.jpg
rm -rf /tmp/burn-hl4
echo DONE
