import json, urllib.request
U = 'https://6ad91b60647080fb0b0848fa--burn-rebecca-louise.netlify.app/api/web-checkout/promo'
for t in ['burn', 'burnplus', 'burncomplete']:
    for b in ['monthly', 'annual']:
        req = urllib.request.Request(U, data=json.dumps({'code': 'burnfamily', 'tier': t, 'billing': b}).encode(), headers={'Content-Type': 'application/json'})
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=30).read())
        except urllib.error.HTTPError as e:
            d = json.loads(e.read())
        print(t, b, d.get('ok'), d.get('code'), 'trial', d.get('trial_days'), 'today', d.get('today_cents'), 'then', d.get('then_cents'), '/', d.get('interval'), 'full', d.get('full_cents'), d.get('duration'))
