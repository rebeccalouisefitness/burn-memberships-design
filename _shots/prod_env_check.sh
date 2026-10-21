#!/bin/bash
# What does PRODUCTION have? Prints only key NAMES and key TYPES (prefixes), never values.
cd ~/burn-web-checkout/web-netlify
NETLIFY_SITE_ID=902256a0-f982-474e-9f23-36f4fd504105 netlify env:list --context production --json > /tmp/pe.json 2>/tmp/pe.err
python3 - <<'PY'
import json
try: e=json.load(open('/tmp/pe.json'))
except Exception: print('READ FAIL', open('/tmp/pe.err').read()[:200]); raise SystemExit
def kind(v):
    for p in ('sk_live_','sk_test_','rk_live_','rk_test_','pk_live_','pk_test_','whsec_'):
        if v.startswith(p): return p+'…'
    return ('set, len %d'%len(v)) if v else 'EMPTY'
for k in sorted(e): print(k, '=', kind(e[k]))
PY
rm -f /tmp/pe.json /tmp/pe.err
