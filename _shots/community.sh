#!/bin/bash
rm -rf /tmp/burn-shots-dist && cp -R ~/burn-plus-preview/dist /tmp/burn-shots-dist
cat > /tmp/burn-shots-dist/frame.html <<'H'
<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#888}iframe{position:fixed;left:0;top:0;width:390px;height:844px;border:0;background:#fff}</style></head><body><iframe id="f" src="/"></iframe>
<script>localStorage.setItem('burn.firstOpenSignIn.v1','1');const p=new URLSearchParams(location.search).get('p');if(p)document.getElementById('f').src=p;</script></body></html>
H
cat > /tmp/burn-spa.py <<'PY'
import http.server, os
ROOT='/tmp/burn-shots-dist'
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def send_head(self):
        p=self.translate_path(self.path)
        if not os.path.exists(p) and '.' not in os.path.basename(self.path.split('?')[0]): self.path='/index.html'
        return super().send_head()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('127.0.0.1',8788),H).serve_forever()
PY
python3 /tmp/burn-spa.py & SPID=$!
sleep 1
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for pair in "community:/community" "challenge2:/challenge"; do n=${pair%%:*}; p=${pair#*:}
  timeout 45 "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/burn-hl5 --force-device-scale-factor=2 --window-size=390,844 --virtual-time-budget=10000 --screenshot=$HOME/burn-shots/$n.png "http://127.0.0.1:8788/frame.html?p=$p" >/dev/null 2>&1
  cp ~/burn-shots/$n.png ~/burn-brief-wt/_shots/$n.png; echo "$n $(stat -f %z ~/burn-shots/$n.png)"
done
kill $SPID; rm -rf /tmp/burn-shots-dist /tmp/burn-hl5 /tmp/burn-spa.py
echo DONE
