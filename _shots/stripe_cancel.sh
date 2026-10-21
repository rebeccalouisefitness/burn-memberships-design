#!/bin/bash
# Cancel the website TEST subscription(s) for rebecca+webtest22@rebecca-louise.com. Test mode only. Never prints the key.
cd ~/burn-web-checkout/web-netlify
SITE=902256a0-f982-474e-9f23-36f4fd504105
NETLIFY_SITE_ID=$SITE netlify env:list --context deploy-preview --json > /tmp/sc_env.json 2>/tmp/sc_env.err
python3 - <<'PY'
import json, urllib.request, urllib.parse, sys
try:
    env = json.load(open('/tmp/sc_env.json'))
except Exception as e:
    print('ENV READ FAILED', open('/tmp/sc_env.err').read()[:300]); sys.exit(1)
names = [k for k in env if 'STRIPE' in k]
print('stripe vars:', names)
key = None
for k in ('STRIPE_SECRET_KEY_TEST', 'STRIPE_TEST_SECRET_KEY', 'STRIPE_SECRET_KEY'):
    v = env.get(k) or ''
    if v.startswith('sk_test_') or v.startswith('rk_test_'):
        key = v; print('using', k, '(test key)'); break
if not key:
    print('NO TEST KEY FOUND (refusing to use anything that is not sk_test_/rk_test_)'); sys.exit(1)
def call(method, path, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    r = urllib.request.Request('https://api.stripe.com/v1' + path, data=body, method=method, headers={'Authorization': 'Bearer ' + key})
    return json.loads(urllib.request.urlopen(r, timeout=30).read())
email = 'rebecca+webtest22@rebecca-louise.com'
cs = call('GET', '/customers?' + urllib.parse.urlencode({'email': email, 'limit': 10}))
print('livemode customers:', [c['livemode'] for c in cs['data']])
for c in cs['data']:
    assert c['livemode'] is False
    subs = call('GET', '/subscriptions?' + urllib.parse.urlencode({'customer': c['id'], 'status': 'all', 'limit': 20}))
    for s in subs['data']:
        print('sub', s['id'][-8:], s['status'], 'created', s['created'], s['items']['data'][0]['price'].get('lookup_key'))
        if s['status'] not in ('canceled', 'incomplete_expired'):
            r = call('DELETE', '/subscriptions/' + s['id'])
            print('  -> cancelled:', r['status'], 'livemode', r['livemode'])
PY
rm -f /tmp/sc_env.json /tmp/sc_env.err
echo DONE
