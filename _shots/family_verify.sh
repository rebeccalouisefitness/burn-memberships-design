#!/bin/bash
# BURNFAMILY check in Stripe TEST: each tier's coupon must cover BOTH its monthly and annual product. Key from file, never printed.
K=$(head -1 ~/.burn-secrets/stripe-burn-test.txt | tr -d '\n ')
case "$K" in sk_test_*|rk_test_*) ;; *) echo "NOT A TEST KEY - stop"; exit 1;; esac
export SK="$K"
python3 - <<'PY'
import os, json, urllib.request, urllib.parse
K=os.environ['SK']
def get(p):
    r=urllib.request.Request('https://api.stripe.com/v1'+p,headers={'Authorization':'Bearer '+K,'Stripe-Version':'2024-06-20'})
    return json.loads(urllib.request.urlopen(r,timeout=30).read())
for tier,suf in [('burn','BURN'),('burnplus','PLUS'),('burncomplete','COMPLETE')]:
    pc=get('/promotion_codes?'+urllib.parse.urlencode({'code':'BURNFAMILY-'+suf,'active':'true','limit':1,'expand[]':'data.coupon.applies_to'}))['data']
    if not pc: print(tier,'NO ACTIVE CODE'); continue
    pc=pc[0]; c=pc['coupon']; prods=set((c.get('applies_to') or {}).get('products') or [])
    line=[f"{tier}: code {pc['code']} coupon {c['id']} {c.get('percent_off')}% {c['duration']} trial_days={pc['metadata'].get('trial_days')} livemode={pc['livemode']}"]
    for b in ('monthly','annual'):
        pr=get('/prices?'+urllib.parse.urlencode({'lookup_keys[]':f'{tier}_{b}','active':'true','limit':1}))['data']
        if not pr: line.append(f"  {b}: NO PRICE"); continue
        pr=pr[0]; prod=pr['product']
        line.append(f"  {b}: price {pr['unit_amount']/100:.2f}/{pr['recurring']['interval']} product …{prod[-6:]} covered={'YES' if prod in prods else 'NO'}")
    print('\n'.join(line))
PY
