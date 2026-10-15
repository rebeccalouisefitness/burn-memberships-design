/* BURN website checkout — CONFIG. ⚠️ PLUMBING: change only with a developer.
 *
 * mode:
 *   'off'  = design preview. The join page keeps the demo checkout (no card is
 *            charged, nothing is created). SAFE DEFAULT for the public preview.
 *   'test' = real Stripe TEST checkout against a TEST backend (test cards only).
 *            Only ever set in a local copy, never published.
 *   'live' = real payments. Only at go-live, on the real domain.
 * functionsUrl: the Supabase Edge Functions base, e.g.
 *   local test:  'http://127.0.0.1:54321/functions/v1'
 *   live:        'https://<project-ref>.supabase.co/functions/v1'
 */
window.BURN_CHECKOUT_CONFIG = {
  mode: 'off',
  functionsUrl: ''
};
