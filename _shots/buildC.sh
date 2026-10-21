#!/bin/bash
set -e


true
P=~/burn-C-draft; rm -rf $P; mkdir -p $P; cp -R ~/burn-brief-wt/v6 $P/public; cd $P/public
KEEP=" 404 about app-screens build-your-own coming-soon download index join journey membership-designs membership thank-you upgrade-done upgrade workouts terms privacy "
for f in *.html; do b=${f%.html}; case "$KEEP" in *" $b "*) ;; *) rm -f "$f";; esac; done
rm -rf burnplus-scheduling
X=~/burn-web-checkout/web-netlify; cp $X/public/404.html .; cp $X/extra/coming-soon.html .; cp $X/extra/cs-hero-d.jpg $X/extra/cs-hero-m.jpg img/
cp ~/burn-brief-wt/_shots/copy-changes.html copy-changes.html
python3 - <<'PY'
import re,os
for f in os.listdir('.'):
    if not f.endswith('.html') or f in ('journey.html','copy-changes.html'): continue
    s=open(f).read(); o=s
    s=re.sub(r'<div class="preview-bar">.*?</div>\s*','',s,flags=re.S)
    s=re.sub(r'<a[^>]*href="journey(\.html)?[^"]*"[^>]*>.*?</a>','',s,flags=re.S)
    if s!=o: open(f,'w').write(s)
PY
cd ~/burn-web-checkout/web-netlify
netlify deploy --no-build --dir $P/public --functions netlify/functions --site 902256a0-f982-474e-9f23-36f4fd504105 --message "DRAFT feedback round + BURNFAMILY promo (TEST, not live)" --json > $P/deploy.json 2> $P/deploy.err
python3 -c "import json;print(json.load(open('$P/deploy.json')).get('deploy_url'))"
rm -rf /tmp/burn-g3 /tmp/burn-g2.log /tmp/burn-g3.log /tmp/burn-guide.log
echo DONE
