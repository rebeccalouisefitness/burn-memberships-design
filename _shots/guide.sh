#!/bin/bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd ~/burn-shots
timeout 60 "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/burn-hl2 --force-device-scale-factor=2 --window-size=390,844 --virtual-time-budget=9000 --screenshot=$HOME/burn-shots/guide.png "https://tone-transform-guide.netlify.app/" >/dev/null 2>&1
ffmpeg -y -loglevel error -i guide.png -vf "crop=780:1570:0:0,pad=780:1688:0:118:color=0xffffff,scale=900:1948" -q:v 3 ~/burn-brief-wt/v6/img/app/guide.jpg
cp guide.png ~/burn-brief-wt/_shots/guide.png
rm -rf /tmp/burn-hl2
echo DONE
