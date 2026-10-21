#!/bin/bash
cd ~/burn-plus-preview
U=$(cat .env .env.local .env.production 2>/dev/null | grep -o -E "EXPO_PUBLIC_SUPABASE_URL=https://[a-z0-9]+\.supabase\.co" | head -1 | cut -d= -f2)
[ -z "$U" ] && U=$(grep -rho -E "https://[a-z0-9]{20}\.supabase\.co" eas.json app.json app.config.* 2>/dev/null | head -1)
echo "url found: ${U:0:12}…"
mkdir -p ~/burn-brief-wt/v6/img/recipes
cd ~/burn-brief-wt/v6/img/recipes
for k in blue-majik buddha wrap green-smoothie oats energy-balls tuna-bean mackerel-beet prawn-stirfry sardine-toast choc-oats berry-shake protein-pancakes dhal apple-almond chickpea-pitta; do
  if curl -s -f --max-time 20 -o /tmp/r.jpg "$U/storage/v1/object/public/recipe-images/r-$k.jpg"; then
    sips -Z 600 -s format jpeg -s formatOptions 78 /tmp/r.jpg --out $k.jpg >/dev/null && echo "ok $k"
  else echo "miss $k"; fi
done
rm -f /tmp/r.jpg
du -sh . ; echo DONE
