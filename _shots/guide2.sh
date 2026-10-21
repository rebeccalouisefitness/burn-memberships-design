#!/bin/bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd ~/burn-shots
timeout 70 "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/burn-hl3 --force-device-scale-factor=1.5 --window-size=520,1125 --virtual-time-budget=20000 --screenshot=$HOME/burn-shots/guide2.png "https://tone-transform-guide.netlify.app/" >/dev/null 2>&1
ffmpeg -y -loglevel error -i guide2.png -vf "scale=780:1688,crop=780:1570:0:0,pad=780:1688:0:118:color=0xffffff,scale=900:1948" -q:v 3 ~/burn-brief-wt/_shots/guide2.jpg
rm -rf /tmp/burn-hl3
echo DONE
