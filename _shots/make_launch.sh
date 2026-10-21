#!/bin/bash
# Build the 'launch' branch in burn-web-checkout: server = member-promo (go-live-index + cancel-two-weeks + BURNFAMILY + promo report),
# public = the approved redesign draft (brief-C-feedback). NOT deployed to production. Then a DRAFT deploy of exactly this branch.
set -e
cd ~/burn-web-checkout
git checkout -q member-promo
git branch -f launch member-promo
git checkout -q launch
P=web-netlify/public
cp $P/404.html /tmp/launch-404.html
rsync -a --delete --exclude '404.html' --exclude '_headers' --exclude '_redirects' --exclude 'copy-changes.html' --exclude 'membership-designs.html' ~/burn-C-draft/public/ $P/
cp /tmp/launch-404.html $P/404.html
git add -A $P
git commit -qm "LAUNCH branch (not deployed to production): approved redesign from brief-C-feedback ($(git -C ~/burn-brief-wt rev-parse --short HEAD)) on top of member-promo = go-live-index (indexable pages, sitemap, robots, RevenueCat->Stripe fallback unlock) + cancel-two-weeks + BURNFAMILY + promo report. Deploying this to production = publish + noindex removal: needs Rebecca's 'publish'." || echo "nothing to commit"
git log --oneline -1
ls $P | head -50 | tr '\n' ' '; echo
cat $P/_headers 2>/dev/null | head -20
grep -n "X-Robots\|noindex" web-netlify/netlify.toml | head
cd web-netlify
netlify deploy --no-build --dir public --functions netlify/functions --site 902256a0-f982-474e-9f23-36f4fd504105 --message "DRAFT launch branch (TEST, not live)" --json > /tmp/launch_dep.json 2>/tmp/launch_dep.err
python3 -c "import json;print('draft:',json.load(open('/tmp/launch_dep.json')).get('deploy_url'))"
git -C ~/burn-web-checkout push -q origin launch 2>&1 | tail -1
git -C ~/burn-web-checkout checkout -q member-promo
echo DONE
