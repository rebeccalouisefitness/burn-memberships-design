#!/bin/bash
# usage: pageshot.sh URL name width height
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
timeout 60 "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/burn-ps-$2 --force-device-scale-factor=1 --window-size=$3,$4 --virtual-time-budget=15000 --screenshot=$HOME/burn-brief-wt/_shots/$2.png "$1" >/dev/null 2>&1
rm -rf /tmp/burn-ps-$2
echo "$2 done"
