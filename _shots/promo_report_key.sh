#!/bin/bash
# Create the BURNFAMILY promo report password, keep it in ~/.burn-secrets, set it on Netlify DEPLOY PREVIEWS only. Never printed.
set -e
F=~/.burn-secrets/burn-promo-report-key.txt
if [ ! -s "$F" ]; then
  python3 -c "import secrets;print(secrets.token_urlsafe(30))" > "$F"
  chmod 600 "$F"
fi
grep -q "burn-promo-report-key.txt" ~/.burn-secrets/README.txt || echo "2026-10-22: burn-promo-report-key.txt = password for /api/admin/promo-report (BURNFAMILY report; header x-admin-key or ?key=). Netlify env PROMO_REPORT_KEY, deploy-preview context only until go-live. Never print." >> ~/.burn-secrets/README.txt
cd ~/burn-web-checkout/web-netlify
NETLIFY_SITE_ID=902256a0-f982-474e-9f23-36f4fd504105 netlify env:set PROMO_REPORT_KEY "$(cat "$F")" --context deploy-preview --secret > /tmp/prk.out 2>&1 || NETLIFY_SITE_ID=902256a0-f982-474e-9f23-36f4fd504105 netlify env:set PROMO_REPORT_KEY "$(cat "$F")" --context deploy-preview > /tmp/prk.out 2>&1
sed 's/[A-Za-z0-9_-]\{30,\}/[hidden]/g' /tmp/prk.out | tail -3; rm -f /tmp/prk.out
echo KEYLEN $(tr -d '\n' < "$F" | wc -c)
