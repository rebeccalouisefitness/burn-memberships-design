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
  window.BURN_CHECKOUT_CONFIG = h === 'burnrebeccalouise.com'
    ? { mode: 'test', functionsUrl: '/api' }
    : { mode: 'off', functionsUrl: '' };
})();
