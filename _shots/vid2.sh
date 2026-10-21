#!/bin/bash
cd ~/burn-shots
EX=~/burn-brief-wt/v6/img/exercises/c2.png
PAD="crop=390:785:0:0,pad=390:844:0:59:color=0xfaf9f7"
ffmpeg -y -loglevel error \
 -loop 1 -t 5 -i today-tall.png -loop 1 -t 3 -i challenge.png -loop 1 -t 3.2 -i "$EX" -loop 1 -t 5 -i move-tall.png \
 -filter_complex "[0:v]crop=780:1688:0:'if(lt(t,0.9),0,min(1900,(t-0.9)/3.6*1900))',scale=390:844,$PAD,fps=30,format=yuv420p,setsar=1[a];[1:v]scale=390:844,$PAD,fps=30,format=yuv420p,setsar=1[b];[2:v]scale=390:-2,crop=390:844:0:0,fps=30,format=yuv420p,setsar=1[c];[3:v]crop=780:1688:0:'if(lt(t,0.9),0,min(1700,(t-0.9)/3.6*1700))',scale=390:844,$PAD,fps=30,format=yuv420p,setsar=1[d];[a][b]xfade=transition=fade:duration=0.5:offset=4.5[ab];[ab][c]xfade=transition=slideleft:duration=0.5:offset=7[abc];[abc][d]xfade=transition=fade:duration=0.5:offset=9.7[v]" \
 -map "[v]" -c:v libx264 -preset medium -crf 30 -pix_fmt yuv420p -movflags +faststart -an out/burn-app-tour.mp4
ffmpeg -y -loglevel error -i out/burn-app-tour.mp4 -frames:v 1 -q:v 4 out/burn-app-tour-poster.jpg
for f in today challenge; do ffmpeg -y -loglevel error -i $f.png -vf "crop=780:1570:0:0,pad=780:1688:0:118:color=0xfaf9f7,scale=900:1948" -q:v 3 out/$f.jpg; done
cp out/burn-app-tour.mp4 out/burn-app-tour-poster.jpg out/today.jpg out/challenge.jpg ~/burn-brief-wt/v6/img/app/
cp out/burn-app-tour.mp4 out/burn-app-tour-poster.jpg out/today.jpg out/challenge.jpg ~/burn-B-draft/public/img/app/
ffmpeg -y -loglevel error -ss 1 -i out/burn-app-tour.mp4 -frames:v 1 ~/burn-brief-wt/_shots/f1.jpg
ls -la out | awk '{print $5,$9}'; echo DONE
