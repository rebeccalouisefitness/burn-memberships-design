/* BURN website checkout — CONFIG. ⚠️ PLUMBING: change only with a developer.
 *
 * mode:
 *   'off'  = design preview (GitHub Pages etc.). Demo checkout, nothing is created.
 *   'test' = real Stripe TEST checkout (test cards only, no real charges).
 *   'live' = real payments. Only at go-live, on the real domain.
 * functionsUrl: where the checkout server functions live.
 *
 * On the real domain (burnrebeccalouise.com) the site runs in TEST mode against the
 * Netlify functions at /api until Rebecca says go-live. Everywhere else: 'off'.
 */
(function () {
  var h = location.hostname.replace(/^www\./, '');
  /* Journey preview frames (?preview=…) always show the design exactly as it will look live, with no test-mode line. */
  if (/[?&]preview=/.test(location.search)) h = '';
  /* Brief item 11: a Netlify DRAFT of this site can run the real Stripe TEST checkout with ?checkout=test.
     Draft servers never create accounts (Stripe test objects only), so nothing reaches the member database. */
  var draftTest = /^[0-9a-f]{24}--burn-rebecca-louise\.netlify\.app$/.test(h);   /* 22 Oct: drafts always run the TEST checkout (no ?checkout=test needed) */
  /* 22 Oct: LIVE payments on the real domain (Rebecca's go-ahead); drafts stay on TEST. */
  window.BURN_CHECKOUT_CONFIG = h === 'burnrebeccalouise.com'
    ? { mode: 'live', functionsUrl: '/api' }
    : draftTest
    ? { mode: 'test', functionsUrl: '/api' }
    : { mode: 'off', functionsUrl: '' };
})();
