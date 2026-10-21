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
      document.addEventListener('DOMContentLoaded', function () { say('Payment cancelled. Nothing was charged. You can try again whenever you like.'); if (window.burnTrack) window.burnTrack('payment_cancelled', { tier: tierNow(), billing: billingNow() }); });
    }
    /* Brief item 5: save first name + email + plan BEFORE payment (server: /api/checkout-lead, Netlify Blobs,
       not the member database). Fire-and-forget: never blocks her. The lead id goes on the Stripe session. */
    var LKEY = 'burn_v5_lead_id';
    var leadId = function () { try { return sessionStorage.getItem(LKEY) || ''; } catch (e) { return ''; } };
    document.addEventListener('burn:details', function (e) {
      var d = (e && e.detail) || {};
      fetch(BASE + '/checkout-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first: d.first, email: d.email, tier: d.tier, billing: d.billing,
          marketing_opt_in: !!d.marketing_opt_in, lead_id: leadId() })
      }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (j) {
        if (j && j.ok && j.lead_id) try { sessionStorage.setItem(LKEY, j.lead_id); } catch (x) {}
      }).catch(function () {});
    });
    /* Brief item 11: card, Apple Pay and Google Pay ON this page (Stripe Elements), so "Complete My Membership"
       is the last tap. The server still creates the account the same way and access is still switched on only
       by the webhook once Stripe says it is paid. If the server has no publishable key yet, nothing mounts and
       the hosted Stripe page (start() below) is used exactly as before. */
    var EL = null, lastSub = null, PROMO = null;   /* PROMO = {code, trial_days, today_cents, then_cents, interval} once applied */
    var isDraftTest = /[?&]checkout=test\b/.test(location.search);
    var cents = function () {
      var P = window.BURN_PRICES && window.BURN_PRICES[tierNow()];
      return P ? Math.round(P[billingNow()] * 100) : 0;
    };
    var loadStripe = function () {
      return new Promise(function (res, rej) {
        if (window.Stripe) return res();
        var s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    };
    var formEl = function () { return document.querySelector('[data-checkout-form]'); };
    var details = function (f) {
      var name = (f.name.value || '').trim(), email = (f.email.value || '').trim(), pw = f.password.value || '';
      if (!name) { say('Please add your first name.'); return null; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Please enter a valid email address.'); return null; }
      if (pw.length < 8) { say('Your password needs at least 8 characters.'); try { f.password.focus(); } catch (x) {} return null; }
      return { name: name, email: email, pw: pw };
    };
    var mountInline = function () {
      var host = document.querySelector('[data-pay-element]');
      if (!host) return;
      fetch(BASE + '/web-checkout/config').then(function (r) { return r.json(); }).then(function (c) {
        if (!c || !c.ok || !c.publishable_key) return;
        return loadStripe().then(function () {
          var st = window.Stripe(c.publishable_key);
          var els = st.elements({ mode: 'subscription', amount: cents() || 100, currency: 'usd', paymentMethodTypes: ['card'],
            appearance: { theme: 'stripe', variables: { colorPrimary: '#6f4c5b', borderRadius: '12px' } } });
          els.create('payment', { layout: 'tabs', fields: { billingDetails: { email: 'never' } }, terms: { card: 'never' } }).mount(host);
          var xh = document.querySelector('[data-express-element]');
          if (xh) {
            var xe = els.create('expressCheckout', { buttonType: { applePay: 'subscribe', googlePay: 'subscribe' } });
            xe.on('click', function (ev) { if (details(formEl())) ev.resolve(); });
            xe.on('confirm', function () { payInline(formEl(), document.querySelector('[data-pay-submit]')); });
            xe.mount(xh);
          }
          EL = { stripe: st, elements: els };
          root.setAttribute('data-pay-inline', 'on');
          document.addEventListener('burn:billing', function () { if (!PROMO) { var a = cents(); if (a) els.update({ amount: a }); } });
          setupPromo();
        });
      }).catch(function () {});
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountInline); else mountInline();
    /* Promo code (Rebecca 21 Oct): small "Have a promo code?" link. A valid code shows today / then; a free
       trial switches the card form to "save card" (nothing charged today). Wording only appears after Apply. */
    var money = function (c) { return '$' + (c / 100).toFixed(2); };
    var setupPromo = function () {
      var box = document.querySelector('[data-promo-box]'), tog = document.querySelector('[data-promo-toggle]');
      var msg = document.querySelector('[data-promo-msg]'), applyB = document.querySelector('[data-promo-apply]');
      if (!box || !tog || !applyB) return;
      var input = box.querySelector('input');
      tog.addEventListener('click', function () { box.hidden = !box.hidden; tog.setAttribute('aria-expanded', box.hidden ? 'false' : 'true'); if (!box.hidden) input.focus(); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyB.click(); } });
      applyB.addEventListener('click', function () {
        var code = (input.value || '').trim();
        if (!code) { msg.className = 'promo-msg'; msg.textContent = 'Pop your code in first.'; return; }
        applyB.disabled = true;
        fetch(BASE + '/web-checkout/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code, tier: tierNow(), billing: billingNow() }) })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (j) {
            applyB.disabled = false; lastSub = null;
            if (!j || !j.ok) { PROMO = null; msg.className = 'promo-msg'; msg.textContent = (j && j.message) || 'That code didn’t work. Please check it and try again.'; restoreAmount(); return; }
            PROMO = j;
            var then = money(j.then_cents) + ' a ' + j.interval;
            var d = new Date(); d.setDate(d.getDate() + (j.trial_days || 0));
            var when = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            msg.className = 'promo-msg ok';
            msg.innerHTML = '';
            var b1 = document.createElement('b'); b1.textContent = 'Code applied!'; msg.appendChild(b1);
            msg.appendChild(document.createTextNode(j.trial_days ? ' Today $0.00, then ' + then + ' from ' + when + '.' : ' ' + money(j.today_cents) + ' today, then ' + then + '.'));
            if (EL) {
              if (j.trial_days) EL.elements.update({ mode: 'setup', currency: 'usd' });
              else EL.elements.update({ mode: 'subscription', amount: j.today_cents || 100, currency: 'usd' });
            }
          })
          .catch(function () { applyB.disabled = false; msg.className = 'promo-msg'; msg.textContent = 'That didn’t work. Please try again.'; });
      });
      function restoreAmount() { if (EL) EL.elements.update({ mode: 'subscription', amount: cents() || 100, currency: 'usd' }); }
    };
    var payInline = function (form, btn) {
      if (busy) return;
      var f = form.elements, d = details(f);
      if (!d) return;
      busy = true; say('');
      var tier = tierNow(), billing = billingNow();
      if (window.burnTrack) window.burnTrack('payment_started', { tier: tier, billing: billing, flow: 'inline' });
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.setAttribute('data-state', 'loading'); btn.disabled = true; btn.textContent = 'Processing…'; }
      var key = [tier, billing, d.email, PROMO ? PROMO.code : ''].join('|');
      if (!PROMO) { var a = cents(); if (a) EL.elements.update({ amount: a }); }
      EL.elements.submit().then(function (r) {
        if (r && r.error) throw { msg: r.error.message };
        if (lastSub && lastSub.key === key) return lastSub;   // retry after a declined card: same subscription
        return fetch(BASE + '/web-checkout/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: d.name, email: d.email, password: d.pw, tier: tier, billing: billing, lead_id: leadId(), promo_code: PROMO ? PROMO.code : '' })
        }).then(function (x) { return x.json().catch(function () { return {}; }); }).then(function (j) {
          if (!j || !j.ok) throw { msg: (j && j.message) || 'Something went wrong. Please try again.', code: j && j.error };
          lastSub = { key: key, id: j.subscription_id, secret: j.client_secret, type: j.type || 'payment' };
          return lastSub;
        });
      }).then(function (s) {
        var ret = here('thank-you.html');
        ret.search = '?tier=' + tier + '&billing=' + billing + '&sub=' + encodeURIComponent(s.id) + (isDraftTest ? '&checkout=test' : '');
        var confirm = s.type === 'setup' ? EL.stripe.confirmSetup : EL.stripe.confirmPayment;   /* free trial: save the card, charge nothing today */
        return confirm.call(EL.stripe, { elements: EL.elements, clientSecret: s.secret, redirect: 'if_required',
          confirmParams: { return_url: ret.href, payment_method_data: { billing_details: { email: d.email, name: d.name } } }
        }).then(function (res) {
          if (res && res.error) throw { msg: res.error.message, declined: true };
          location.href = ret.href;
        });
      }).catch(function (e) {
        busy = false;
        if (btn) { btn.removeAttribute('data-state'); btn.disabled = false; btn.innerHTML = label; }
        say((e && e.msg ? e.msg + ' ' : '') + (e && e.declined ? 'Nothing was charged. You can try again.' : (e && e.msg ? '' : 'Your payment did not go through. Nothing was charged. Please try again.')));
        if (window.burnTrack) window.burnTrack('payment_failed', { tier: tier, billing: billing, flow: 'inline' });
        if (e && e.code === 'wrong_password') try { f.password.focus(); } catch (x) {}
      });
    };
    var start = function (form, btn) {
      if (EL) return payInline(form, btn);
      if (busy) return;
      var f = form.elements;
      var name = (f.name.value || '').trim(), email = (f.email.value || '').trim(), pw = f.password.value || '';
      if (!name) { say('Please add your name.'); f.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Please enter a valid email address.'); f.email.focus(); return; }
      if (pw.length < 8) { say('Your password needs at least 8 characters.'); f.password.focus(); return; }
      busy = true; say('');
      if (window.burnTrack) window.burnTrack('payment_started', { tier: tierNow(), billing: billingNow() });
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.setAttribute('data-state', 'loading'); btn.disabled = true; if (btn.matches('[data-pay-submit]')) btn.textContent = 'Opening secure payment…'; }
      var tier = tierNow(), billing = billingNow();
      var success = here('thank-you.html'); success.search = '?tier=' + tier + '&billing=' + billing;
      var cancel = here('join.html'); cancel.search = '?tier=' + tier + '&billing=' + billing + '&cancelled=1';
      fetch(BASE + '/web-checkout/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: pw, tier: tier, billing: billing,
          success_url: success.href, cancel_url: cancel.href, lead_id: leadId() })
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
    var subId = QS.get('sub') || '';   /* brief item 11: in-page payment returns ?sub=sub_… instead of a session */
    if (!/^cs_(test|live)_/.test(sid) && !/^sub_[A-Za-z0-9]{8,}$/.test(subId)) return;
    var statusUrl = /^cs_/.test(sid)
      ? BASE + '/web-checkout/session-status?session_id=' + encodeURIComponent(sid)
      : BASE + '/web-checkout/sub-status?sub=' + encodeURIComponent(subId);
    root.setAttribute('data-checkout-state', 'confirming');
    var tries = 0;
    var set = function (sel, v) { if (v) document.querySelectorAll(sel).forEach(function (x) { x.textContent = v; }); };
    var status = function (m) { document.querySelectorAll('[data-ty-status]').forEach(function (x) { x.textContent = m; x.hidden = !m; }); };
    var poll = function () {
      tries++;
      fetch(statusUrl)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok) { root.setAttribute('data-checkout-state', 'error'); status('We could not find this checkout. If you paid, email customerservice@rebecca-louise.com.'); return; }
          set('[data-ty-email]', j.email); set('[data-ty-first]', j.first_name); set('[data-ty-tier]', j.tier_name);
          if (j.email) document.querySelectorAll('[data-dl-link]').forEach(function (a) { a.href = 'download.html?email=' + encodeURIComponent(j.email); });
          var w = document.querySelector('[data-dl-email-wrap]'); if (w && j.email) w.hidden = false;
          if (subId && !j.paid && j.status === 'incomplete' && tries < 8) { setTimeout(poll, 1500); return; }   // Stripe is still finishing the first invoice
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
