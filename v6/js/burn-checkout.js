/* BURN website checkout — PLUMBING (web checkout, 15 Oct). ⚠️ Change only with a developer.
 *
 * Loaded BEFORE assets/site.js on join.html and thank-you.html, after js/burn-config.js.
 * When BURN_CHECKOUT_CONFIG.mode is 'test' or 'live':
 *   join.html      the checkout form ([data-checkout-form]: fields name, email, password)
 *                  and the wallet buttons ([data-wallet]) post to the web-checkout
 *                  server function, which creates the app account + a Stripe Checkout
 *                  Session, then the browser goes to Stripe's secure payment page.
 *                  Tier = ?tier= (burn | burnplus | burncomplete), billing = the
 *                  Monthly/Annual switch (html[data-billing]).
 *   thank-you.html reads ?session_id=, asks session-status, fills [data-ty-email],
 *                  [data-ty-first], [data-ty-tier] and sets html[data-checkout-state].
 * When mode is 'off' (or config missing) this file does nothing and the design's
 * demo checkout in site.js runs as before.
 *
 * Hooks the design can style (no logic needed in design files):
 *   html[data-burn-checkout="stripe"]      real checkout is on
 *   [data-mock-payment]                    hidden when real checkout is on (demo card fields)
 *   [data-live-only] (put `hidden` on it)  un-hidden only when real checkout is on
 *   html[data-checkout-state="confirming|ready|pending|not-paid|error"]  (thank-you)
 *   [data-ty-status]                       thank-you status line (text set here)
 */
(function () {
  var C = window.BURN_CHECKOUT_CONFIG || {};
  var MODE = C.mode === 'test' || C.mode === 'live' ? C.mode : 'off';
  var BASE = String(C.functionsUrl || '').replace(/\/+$/, '');
  if (MODE === 'off' || !BASE) return;

  var root = document.documentElement;
  /* NB: not "data-checkout" — site.js uses [data-checkout] for tier buttons. */
  root.setAttribute('data-burn-checkout', 'stripe');
  root.setAttribute('data-burn-checkout-mode', MODE);
  var css = document.createElement('style');
  /* Keep the Apple Pay / Google Pay / Link buttons and the Pay button exactly as designed; Stripe's secure page takes the card, so only the demo card fields and demo fine print go. */
  css.textContent = 'html[data-burn-checkout="stripe"] [data-mock-payment] .card-el,html[data-burn-checkout="stripe"] [data-mock-payment] .or-line,html[data-burn-checkout="stripe"] p[data-mock-payment]{display:none!important}';
  document.head.appendChild(css);
  var showLive = function () {
    document.querySelectorAll('[data-live-only]').forEach(function (x) { x.hidden = false; });
    if (MODE === 'test') document.querySelectorAll('[data-test-only]').forEach(function (x) { x.hidden = false; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showLive); else showLive();

  var QS = new URLSearchParams(location.search);
  var TIERS = { burn: 'BURN', burnplus: 'BURN+', burncomplete: 'BURN COMPLETE' };
  var page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');

  function here(file) { return new URL(file, location.href); }
  function tierNow() { var t = (new URLSearchParams(location.search).get('tier') || 'burnplus').toLowerCase(); return TIERS[t] ? t : 'burnplus'; }
  function billingNow() {
    var b = root.getAttribute('data-billing') || new URLSearchParams(location.search).get('billing');
    return b === 'annual' ? 'annual' : 'monthly';
  }

  /* ---------------- join page ---------------- */
  if (page === 'join') {
    var busy = false;
    var errEl = function () { return document.querySelector('[data-form-err]'); };
    var say = function (m) { var e = errEl(); if (e) e.textContent = m || ''; };
    if (QS.get('cancelled') === '1') {
      document.addEventListener('DOMContentLoaded', function () { say('Payment cancelled. Nothing was charged. You can try again whenever you like.'); });
    }
    var start = function (form, btn) {
      if (busy) return;
      var f = form.elements;
      var name = (f.name.value || '').trim(), email = (f.email.value || '').trim(), pw = f.password.value || '';
      if (!name) { say('Please add your name.'); f.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Please enter a valid email address.'); f.email.focus(); return; }
      if (pw.length < 8) { say('Your password needs at least 8 characters.'); f.password.focus(); return; }
      busy = true; say('');
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.setAttribute('data-state', 'loading'); btn.disabled = true; if (btn.matches('[data-pay-submit]')) btn.textContent = 'Opening secure payment…'; }
      var tier = tierNow(), billing = billingNow();
      var success = here('thank-you.html'); success.search = '?tier=' + tier + '&billing=' + billing;
      var cancel = here('join.html'); cancel.search = '?tier=' + tier + '&billing=' + billing + '&cancelled=1';
      fetch(BASE + '/web-checkout/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: pw, tier: tier, billing: billing,
          success_url: success.href, cancel_url: cancel.href })
      }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (j) {
        if (j && j.ok && j.url) { location.href = j.url; return; }
        busy = false;
        if (btn) { btn.removeAttribute('data-state'); btn.disabled = false; btn.innerHTML = label; }
        say((j && j.message) || 'Something went wrong. Please try again.');
        if (j && j.error === 'wrong_password') try { f.password.focus(); } catch (x) {}
      }).catch(function () {
        busy = false;
        if (btn) { btn.removeAttribute('data-state'); btn.disabled = false; btn.innerHTML = label; }
        say('We could not reach the checkout. Please check your connection and try again.');
      });
    };
    /* capture phase: runs before the design's demo handlers in site.js and stops them */
    document.addEventListener('submit', function (e) {
      var form = e.target.closest && e.target.closest('[data-checkout-form]');
      if (!form) return;
      e.preventDefault(); e.stopImmediatePropagation();
      start(form, form.querySelector('[data-pay-submit]'));
    }, true);
    document.addEventListener('click', function (e) {
      var w = e.target.closest && e.target.closest('[data-wallet]');
      if (!w) return;
      var form = w.closest('[data-checkout-form]') || document.querySelector('[data-checkout-form]');
      if (!form) return;
      e.preventDefault(); e.stopImmediatePropagation();
      start(form, w);   // Apple Pay / Google Pay / Link are offered on Stripe's page
    }, true);
  }

  /* ---------------- thank-you page ---------------- */
  if (page === 'thank-you') {
    var sid = QS.get('session_id') || '';
    if (!/^cs_(test|live)_/.test(sid)) return;
    root.setAttribute('data-checkout-state', 'confirming');
    var tries = 0;
    var set = function (sel, v) { if (v) document.querySelectorAll(sel).forEach(function (x) { x.textContent = v; }); };
    var status = function (m) { document.querySelectorAll('[data-ty-status]').forEach(function (x) { x.textContent = m; x.hidden = !m; }); };
    var poll = function () {
      tries++;
      fetch(BASE + '/web-checkout/session-status?session_id=' + encodeURIComponent(sid))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) { root.setAttribute('data-checkout-state', 'error'); status('We could not find this checkout. If you paid, email customerservice@rebecca-louise.com.'); return; }
          set('[data-ty-email]', j.email); set('[data-ty-first]', j.first_name); set('[data-ty-tier]', j.tier_name);
          if (j.email) document.querySelectorAll('[data-dl-link]').forEach(function (a) { a.href = 'download.html?email=' + encodeURIComponent(j.email); });
          var w = document.querySelector('[data-dl-email-wrap]'); if (w && j.email) w.hidden = false;
          if (j.status !== 'complete' || !j.paid) { root.setAttribute('data-checkout-state', 'not-paid'); status('This payment has not gone through. Nothing was charged.'); return; }
          if (j.account_ready) { root.setAttribute('data-checkout-state', 'ready'); status(''); return; }
          root.setAttribute('data-checkout-state', 'pending');
          if (tries < 15) setTimeout(poll, 2000);
          else status('Payment received. Your membership is being switched on. It can take a minute.');
        })
        .catch(function () { if (tries < 15) setTimeout(poll, 2000); else root.setAttribute('data-checkout-state', 'error'); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poll); else poll();
  }
})();
