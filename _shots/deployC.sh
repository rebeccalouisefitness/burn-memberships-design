#!/bin/bash
# 1) production redeploy WITHOUT the draft-only test function, 2) draft WITH it.
cd ~/burn-web-checkout/web-netlify || exit 1
T=netlify/functions/zz-cancel-options-test.mts
mv $T /tmp/zz-cancel-options-test.mts
netlify deploy --prod --no-build --dir ~/burn-publish-B/public --functions netlify/functions --site 902256a0-f982-474e-9f23-36f4fd504105 \
  --message "Cancel offer C ON: CANCEL_SAVE_BURN_OFFER=C (Rebecca approved; app Preview 254). Same content. Stripe TEST + noindex. Rollback: 6ad8c4d416a46858ba501ff9" \
  --json > ~/burn-publish-B/deployCon.json 2> ~/burn-publish-B/deployCon.err
mv /tmp/zz-cancel-options-test.mts $T
netlify deploy --no-build --dir ~/burn-B-draft/public --functions netlify/functions --site 902256a0-f982-474e-9f23-36f4fd504105 \
  --message "DRAFT cancel-options check (TEST, not live)" --json > /tmp/burn-cod.json 2> /tmp/burn-cod.err
rm -f $T
echo DONE
