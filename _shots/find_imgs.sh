#!/bin/bash
# Find candidate images: postpartum programme art, and group workout photos. Output to /tmp/find_imgs.txt
{
echo "== postpartum/rebuild/luna images =="
mdfind -onlyin ~ 'kMDItemFSName == "*postpartum*"c || kMDItemFSName == "*rebuild*"c || kMDItemFSName == "*luna*bloom*"c' 2>/dev/null | grep -iE "\.(jpe?g|png|webp)$" | grep -v -E "node_modules|/dist|Library/Caches|\.Trash" | head -60
echo "== group / community images =="
mdfind -onlyin ~ 'kMDItemFSName == "*group*"c || kMDItemFSName == "*community*"c || kMDItemFSName == "*retreat*"c || kMDItemFSName == "*class*"c || kMDItemFSName == "*together*"c || kMDItemFSName == "*event*"c' 2>/dev/null | grep -iE "\.(jpe?g|png|webp|heic)$" | grep -v -E "node_modules|/dist|Library/Caches|\.Trash|icon" | head -60
echo DONE
} > /tmp/find_imgs.txt 2>&1
