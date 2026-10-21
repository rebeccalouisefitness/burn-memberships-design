#!/bin/bash
cp ~/burn-brief-wt/v6/js/burn-checkout.js ~/burn-brief-wt/v6/js/burn-config.js ~/burn-C-draft/public/js/; cp ~/burn-brief-wt/v6/assets/site.css ~/burn-brief-wt/v6/assets/life.js ~/burn-brief-wt/v6/assets/site.js ~/burn-brief-wt/v6/assets/plan-workouts.json ~/burn-C-draft/public/assets/
cp ~/burn-brief-wt/v6/*.html ~/burn-C-draft/public/ 2>/dev/null
rsync -a ~/burn-brief-wt/v6/img/ ~/burn-C-draft/public/img/
cd ~/burn-C-draft/public && for f in *.html; do case " 404 about app-screens build-your-own coming-soon download index join journey membership-designs membership thank-you upgrade-done upgrade workouts terms privacy copy-changes " in *" ${f%.html} "*) ;; *) rm -f "$f";; esac; done
python3 - <<'PY'
import re,os
for f in os.listdir('.'):
    if not f.endswith('.html') or f in ('journey.html','copy-changes.html'): continue
    s=open(f).read(); o=s
    s=re.sub(r'<div class="preview-bar">.*?</div>\s*','',s,flags=re.S)
    s=re.sub(r'<a[^>]*href="journey(\.html)?[^"]*"[^>]*>.*?</a>','',s,flags=re.S)
    if s!=o: open(f,'w').write(s)
PY
cp ~/burn-web-checkout/web-netlify/public/404.html ~/burn-C-draft/public/404.html
cd ~/burn-web-checkout/web-netlify
netlify deploy --no-build --dir ~/burn-C-draft/public --functions netlify/functions --site 902256a0-f982-474e-9f23-36f4fd504105 --message "DRAFT feedback + promo (TEST, not live)" --json > ~/burn-C-draft/deployR.json 2> ~/burn-C-draft/deployR.err
python3 -c "import json;print(json.load(open('/Users/auracoo/burn-C-draft/deployR.json')).get('deploy_url'))"
echo DONE
