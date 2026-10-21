#!/bin/bash
# Challenge chat screen for the website. All Supabase calls are stubbed: nothing reaches the live DB.
rm -rf /tmp/burn-shots-dist && cp -R ~/burn-plus-preview/dist /tmp/burn-shots-dist
cat > /tmp/stub.js <<'JS'
(function(){
  var NOW=new Date();function ago(m){return new Date(NOW-m*60000).toISOString();}
  var CH=[{id:'c2',name:'Body Redefined',kind:'challenge',sort:1,starts_on:null,ends_on:null},{id:'c1',name:'BURN Community',kind:'general',sort:2,starts_on:null,ends_on:null}];
  var POSTS=[{id:'p1',channel_id:'c2',body:"Ready to feel stronger, leaner, and more confident in your body? Over the next 30 days, we're combining strength training, Pilates, barre, cardio, and sculpting to help you build muscle, improve definition, and increase your overall fitness. Let's redefine what your body can do! 🔥",photo_path:null,author_id:'rl',author_name:'Rebecca Louise',created_at:ago(42)}];
  var of=window.fetch;
  window.fetch=function(u,o){var s=String(u&&u.url||u);
    if(s.indexOf('supabase.co')<0) return of.apply(this,arguments);
    var body='[]',st=200;
    if(s.indexOf('community_channels')>=0) body=JSON.stringify(CH);
    else if(s.indexOf('rpc/community_feed')>=0) body=JSON.stringify(POSTS);
    else if(s.indexOf('rpc/community_stats')>=0) body=JSON.stringify([{members:1,active_today:1,posts_this_week:1}]);
    else if(s.indexOf('/auth/')>=0){st=400;body='{"error":"offline"}';}
    return Promise.resolve(new Response(body,{status:st,headers:{'Content-Type':'application/json'}}));
  };
})();
JS
python3 - <<'PY'
p='/tmp/burn-shots-dist/index.html';s=open(p).read()
s=s.replace('<head>','<head><script>'+open('/tmp/stub.js').read()+'</script>',1);open(p,'w').write(s)
PY
cat > /tmp/burn-shots-dist/frame.html <<'H'
<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#888}iframe{position:fixed;left:0;top:0;width:390px;height:844px;border:0;background:#fff}</style></head><body><iframe id="f" src="/community"></iframe>
<script>localStorage.setItem('burn.firstOpenSignIn.v1','1');
setInterval(function(){try{var d=document.getElementById('f').contentDocument;var w=d.createTreeWalker(d.body,NodeFilter.SHOW_TEXT);var n;while(n=w.nextNode()){if(/^\s*members\s*$/i.test(n.nodeValue)){var row=n.parentNode.parentNode.parentNode;if(row&&!row.dataset.hid){row.style.display='none';row.dataset.hid=1;}}}}catch(e){}},200);</script></body></html>
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
timeout 45 "$C" --headless=new --disable-gpu --hide-scrollbars --user-data-dir=/tmp/burn-hl6 --force-device-scale-factor=2 --window-size=390,844 --virtual-time-budget=12000 --screenshot=$HOME/burn-shots/chat.png "http://127.0.0.1:8788/frame.html" >/dev/null 2>&1
cp ~/burn-shots/chat.png ~/burn-brief-wt/_shots/chat.png; echo "chat $(stat -f %z ~/burn-shots/chat.png)"
kill $SPID; rm -rf /tmp/burn-shots-dist /tmp/burn-hl6 /tmp/burn-spa.py /tmp/stub.js
echo DONE
