#!/bin/bash
# Deploy a DRAFT with the promo report and test it against Stripe TEST. Key read from file, never printed.
cd ~/burn-web-checkout/web-netlify
netlify deploy --no-build --dir ~/burn-C-draft/public --functions netlify/functions --site 902256a0-f982-474e-9f23-36f4fd504105 --message "DRAFT promo report (TEST)" --json > /tmp/pr_dep.json 2>/tmp/pr_dep.err
U=$(python3 -c "import json;print(json.load(open('/tmp/pr_dep.json')).get('deploy_url',''))")
echo "draft: $U"
K=$(tr -d '\n' < ~/.burn-secrets/burn-promo-report-key.txt)
echo "no key   -> $(curl -s -o /dev/null -w '%{http_code}' "$U/api/admin/promo-report")"
echo "bad key  -> $(curl -s -o /dev/null -w '%{http_code}' -H 'x-admin-key: wrongwrongwrongwrongwrongwrong' "$U/api/admin/promo-report")"
curl -s -H "x-admin-key: $K" "$U/api/admin/promo-report" -o /tmp/pr.html -w "html     -> %{http_code}\n"
python3 - <<'PY'
import re
h=open('/tmp/pr.html').read()
print('mode:', re.findall(r'class="mode">([^<]+)<',h))
print('kpis:', re.findall(r'<div><b>(\d+)</b><span>([^<]+)</span></div>',h))
t=h.split('<b>Per membership</b>')[1].split('</table>')[0]
for row in re.findall(r'<tr><td>([^<]+)</td>(.*?)</tr>',t): print(' ',row[0], re.findall(r'class="n">(\d+)',row[1]))
rows=h.split('Everyone who used it')[1].count('<tr>')-1
print('people rows:', rows)
PY
curl -s -H "x-admin-key: $K" "$U/api/admin/promo-report?format=csv" -D /tmp/pr.h -o /tmp/pr.csv -w "csv      -> %{http_code}\n"
grep -i "content-type\|content-disposition\|x-robots" /tmp/pr.h
head -1 /tmp/pr.csv; echo "csv data rows: $(($(wc -l < /tmp/pr.csv)-1))"
python3 -c "
import csv;r=list(csv.DictReader(open('/tmp/pr.csv')))
print('emails (masked):',sorted({x['email'].split('@')[0][:6]+'…@'+x['email'].split('@')[-1] for x in r})[:8])
print('livemode:',{x['livemode'] for x in r})"
rm -f /tmp/pr.html /tmp/pr.csv /tmp/pr.h
echo DONE
