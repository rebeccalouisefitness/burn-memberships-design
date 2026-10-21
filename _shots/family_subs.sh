#!/bin/bash
# Inspect + cancel the two BURNFAMILY 4242 test subscriptions (TEST mode only). Key never printed.
K=$(head -1 ~/.burn-secrets/stripe-burn-test.txt | tr -d '\n ')
case "$K" in sk_test_*|rk_test_*) ;; *) echo "NOT A TEST KEY - stop"; exit 1;; esac
export SK="$K" CANCEL="${1:-no}"
python3 - <<'PY'
import os, json, urllib.request, urllib.parse, datetime
K=os.environ['SK']
def call(m,p,data=None):
    r=urllib.request.Request('https://api.stripe.com/v1'+p,data=urllib.parse.urlencode(data).encode() if data else None,method=m,
        headers={'Authorization':'Bearer '+K,'Stripe-Version':'2024-06-20'})
    return json.loads(urllib.request.urlopen(r,timeout=30).read())
for email in ['rebecca+family-annual@rebecca-louise.com','rebecca+family-monthly@rebecca-louise.com']:
    for c in call('GET','/customers?'+urllib.parse.urlencode({'email':email,'limit':5}))['data']:
        assert c['livemode'] is False
        for s in call('GET','/subscriptions?'+urllib.parse.urlencode({'customer':c['id'],'status':'all','limit':5}))['data']:
            pr=s['items']['data'][0]['price']; d=s.get('discount') or {}
            te=datetime.datetime.utcfromtimestamp(s['trial_end']).date() if s.get('trial_end') else None
            up=None
            if s['status'] in ('trialing','active'):
                try:
                    inv=call('GET','/invoices/upcoming?'+urllib.parse.urlencode({'subscription':s['id']}))
                    up=(inv['amount_due']/100, inv['total_discount_amounts'][0]['amount']/100 if inv.get('total_discount_amounts') else 0)
                except Exception as e: up=str(e)[:80]
            print(f"{email.split('+')[1].split('@')[0]}: {s['status']} {pr['unit_amount']/100:.2f}/{pr['recurring']['interval']} code={s['metadata'].get('promo_code')} coupon={(d.get('coupon') or {}).get('id')} {(d.get('coupon') or {}).get('percent_off')}% {(d.get('coupon') or {}).get('duration')} trial_end={te} card={'yes' if s.get('default_payment_method') else 'no'} next_invoice(amount_due, discount)={up}")
            if os.environ['CANCEL']=='cancel' and s['status'] not in ('canceled','incomplete_expired'):
                r=call('DELETE','/subscriptions/'+s['id']); print('   -> cancelled', r['status'], 'livemode', r['livemode'])
PY
