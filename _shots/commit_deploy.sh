#!/bin/bash
cd ~/burn-brief-wt
git add -A v6
git commit -qm "${1:-Website draft update}" || true
git push -q origin brief-C-feedback 2>&1 | tail -1
bash _shots/redeployC.sh > /tmp/burn-redeploy.log 2>&1
echo DONE >> /tmp/burn-redeploy.log
