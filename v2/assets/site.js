/* BURN website v2 — mockup behaviour + conversion tracking layer.
 *
 * TRACKING (design mockup): every event is
 *   1) pushed to window.dataLayer  -> Google Tag Manager / GA4 can read it as-is
 *   2) logged to the console as "[BURN track] <event> {...}"
 *   3) counted in localStorage so the Notes page can show a debug counter
 * Events: join_now_click {location: nav|hero|sticky|final|tier|page_cta, tier?: burn|burnplus|burncomplete, billing: monthly|annual, page}
 *         (tier buttons are disabled in annual mode until Rebecca sends annual prices, so they fire nothing there)
 *         pricing_view   {source: home_pricing_section|membership_page, page}
 *         account_created {tier, billing, method: email_password, page}   (join.html account step, once per submit)
 *         account_signed_in {tier, billing, page}   (join.html "Already have a BURN app account? Sign in" path)
 *         registration_complete {tier: burn|burnplus|burncomplete, page}   (thank-you page only, once per session_id)
 * Flow (BRN-058 hard requirement "desktop purchase unlocks the app"):
 *   tier button -> join.html (create the BURN app account FIRST, same Supabase email+password login the app uses)
 *   -> mock Stripe Checkout (email locked to the account) -> thank-you.html?tier&email&session_id
 *   Mockup only: no account is created, nothing is stored server-side; the email travels in the query string.
 * Vendors: GA4 + Meta Pixel (decision B). They load and send ONLY on the production host with real
 * BURN IDs; on the GitHub Pages preview nothing leaves the browser (see the ANALYTICS block).
 */
(function () {
  'use strict';
  var PAGE = document.body.getAttribute('data-page') || 'home';
  var LS = 'burn_v2_mock_events';
  window.dataLayer = window.dataLayer || [];

  /* ===========================================================================
     ANALYTICS: GA4 + Meta Pixel (BRN-058 decision B, 14 Oct 2026)
     ---------------------------------------------------------------------------
     IDs: BURN's own GA4 measurement ID and Meta Pixel ID were NOT found on file
     as clearly belonging to BURN, so these are placeholders. Replace them only
     with IDs confirmed in BURN's own GA4 property / Meta Events Manager.
     NEVER use the Luna Bloom pixel here.

     HOST GATE: tags load and send ONLY on the production host(s) below AND
     only once both IDs are real. On the GitHub Pages preview (or any other
     host) nothing is loaded from googletagmanager.com / google-analytics.com /
     connect.facebook.net and nothing is sent; events still go to the console,
     dataLayer and the Notes debug counter.
     =========================================================================== */
  var BURN_GA4_MEASUREMENT_ID = 'G-BURN_GA4_ID_PLACEHOLDER';
  var BURN_META_PIXEL_ID = 'BURN_META_PIXEL_ID_PLACEHOLDER';
  var BURN_PRODUCTION_HOSTS = ['rebecca-louise.com', 'www.rebecca-louise.com'];
  var TIER_PRICE_USD = { burn: 7.99, burnplus: 17.99, burncomplete: 27.99 }; // monthly
  var TIER_NAME = { burn: 'BURN', burnplus: 'BURN+', burncomplete: 'BURN COMPLETE' };

  var isProdHost = BURN_PRODUCTION_HOSTS.indexOf(location.hostname) > -1;
  var idsReal = !/PLACEHOLDER/.test(BURN_GA4_MEASUREMENT_ID + BURN_META_PIXEL_ID);
  var VENDORS_ON = isProdHost && idsReal;
  window.BURN_ANALYTICS = { mode: VENDORS_ON ? 'live' : 'preview', host: location.hostname, sent: 0 };

  if (VENDORS_ON) {
    // GA4 (gtag.js)
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(BURN_GA4_MEASUREMENT_ID);
    document.head.appendChild(g);
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', BURN_GA4_MEASUREMENT_ID);
    // Meta Pixel (standard base code)
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', BURN_META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function newEventId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  /* Translate one site event into GA4 + Meta calls. Returns the list of calls
     so the preview can show exactly what WOULD be sent. */
  function vendorCalls(event, params) {
    var calls = [];
    var tier = params.tier, billing = params.billing || 'monthly';
    var price = tier && billing === 'monthly' ? TIER_PRICE_USD[tier] : undefined;
    if (event === 'join_now_click') {
      calls.push(['gtag', 'event', 'join_now_click', { location: params.location, tier: tier || '', billing: billing }]);
      var ic = { tier: tier || '', billing: billing, content_category: 'membership' };
      if (price !== undefined) { ic.value = price; ic.currency = 'USD'; ic.content_name = TIER_NAME[tier]; }
      calls.push(['fbq', 'track', 'InitiateCheckout', ic, { eventID: params.event_id }]);
    } else if (event === 'pricing_view') {
      calls.push(['gtag', 'event', 'view_item_list', {
        item_list_id: 'burn_memberships', item_list_name: 'BURN memberships', source: params.source,
        items: ['burn', 'burnplus', 'burncomplete'].map(function (k) { return { item_id: k + '_monthly', item_name: TIER_NAME[k], price: TIER_PRICE_USD[k] }; })
      }]);
      calls.push(['fbq', 'trackCustom', 'ViewPricing', { source: params.source }, { eventID: params.event_id }]);
    } else if (event === 'account_created') {
      // GA4 sign_up moved HERE from registration_complete (14 Oct): the account is now made before checkout.
      calls.push(['gtag', 'event', 'sign_up', { method: 'email_password', tier: tier || '', billing: billing }]);
      var lead = { content_name: TIER_NAME[tier] || '', tier: tier || '', content_category: 'membership' };
      if (price !== undefined) { lead.value = price; lead.currency = 'USD'; }
      calls.push(['fbq', 'track', 'Lead', lead, { eventID: params.event_id }]);
    } else if (event === 'account_signed_in') {
      calls.push(['gtag', 'event', 'login', { method: 'email_password', tier: tier || '' }]);
    } else if (event === 'registration_complete') {
      var v = TIER_PRICE_USD[tier];
      calls.push(['gtag', 'event', 'purchase', { transaction_id: params.event_id, value: v, currency: 'USD', tier: tier,
        items: [{ item_id: tier + '_monthly', item_name: TIER_NAME[tier], price: v, quantity: 1 }] }]);
      calls.push(['fbq', 'track', 'CompleteRegistration', { value: v, currency: 'USD', tier: tier }, { eventID: 'reg_' + params.event_id }]);
      calls.push(['fbq', 'track', 'Subscribe', { value: v, currency: 'USD', tier: tier, predicted_ltv: v * 12 }, { eventID: 'sub_' + params.event_id }]);
    }
    return calls;
  }

  function sendToVendors(event, params) {
    var calls = vendorCalls(event, params);
    if (!VENDORS_ON) {
      try { console.log('[BURN track] preview (' + location.hostname + '): NOT sent to GA4/Meta. Would send:', JSON.stringify(calls)); } catch (e) {}
      return;
    }
    calls.forEach(function (c) {
      try {
        if (c[0] === 'gtag' && window.gtag) { window.gtag(c[1], c[2], c[3]); window.BURN_ANALYTICS.sent++; }
        if (c[0] === 'fbq' && window.fbq) { window.fbq(c[1], c[2], c[3], c[4]); window.BURN_ANALYTICS.sent++; }
      } catch (e) {}
    });
  }

  function track(event, params) {
    params = params || {};
    params.page = PAGE;
    if (!params.event_id) params.event_id = newEventId(event);
    var payload = Object.assign({ event: event }, params);
    window.dataLayer.push(payload);
    sendToVendors(event, params);
    try { console.log('[BURN track] ' + event, JSON.stringify(params)); } catch (e) {}
    try {
      var s = JSON.parse(localStorage.getItem(LS) || '{"counts":{},"log":[]}');
      s.counts[event] = (s.counts[event] || 0) + 1;
      s.log.unshift(new Date().toLocaleTimeString() + '  ' + event + '  ' + JSON.stringify(params));
      s.log = s.log.slice(0, 60);
      localStorage.setItem(LS, JSON.stringify(s));
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('burn:track'));
  }
  window.burnTrack = track;

  /* ---- Monthly / Annual toggle. Annual prices are NOT set yet (Rebecca is sending them):
          annual mode shows a placeholder and disables the tier Join buttons. ---- */
  function billingOf(el) {
    var sec = el && el.closest('[data-billing]');
    if (!sec) sec = document.querySelector('[data-billing]');
    return (sec && sec.getAttribute('data-billing')) || 'monthly';
  }
  document.querySelectorAll('[data-billing-toggle]').forEach(function (tg) {
    var sec = tg.closest('section') || document.body;
    sec.setAttribute('data-billing', 'monthly');
    tg.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-bill]');
      if (!b) return;
      var mode = b.getAttribute('data-bill');
      sec.setAttribute('data-billing', mode);
      tg.querySelectorAll('button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      var msg = sec.querySelector('[data-annual-msg]'); if (msg) msg.hidden = mode !== 'annual';
      sec.querySelectorAll('.annual-ph').forEach(function (ph) { ph.hidden = mode !== 'annual'; });
      sec.querySelectorAll('[data-checkout]').forEach(function (btn) {
        if (!btn.hasAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
        if (mode === 'annual') { btn.textContent = 'Coming soon'; btn.setAttribute('aria-disabled', 'true'); btn.setAttribute('tabindex', '-1'); }
        else { btn.textContent = btn.getAttribute('data-label'); btn.removeAttribute('aria-disabled'); btn.removeAttribute('tabindex'); }
      });
    });
  });

  /* ---- Join Now clicks (any element with data-join) ---- */
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-join]');
    if (!j) return;
    var p = { location: j.getAttribute('data-join') };
    if (j.getAttribute('aria-disabled') === 'true') return; // annual "Coming soon": no fake checkout, no event
    if (j.getAttribute('data-tier')) p.tier = j.getAttribute('data-tier');
    p.billing = billingOf(j);
    track('join_now_click', p);
  }, true);

  /* ---- mobile menu ---- */
  var hdr = document.querySelector('header.site');
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = hdr.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.mnav a').forEach(function (a) {
    a.addEventListener('click', function () { hdr.classList.remove('open'); });
  });

  /* ---- sticky Join Now: shows once the hero CTA has scrolled away,
          hides while pricing or the final CTA is on screen ---- */
  var sticky = document.querySelector('.sticky-join');
  if (sticky && 'IntersectionObserver' in window) {
    var heroCta = document.querySelector('[data-sticky-after]') || document.querySelector('.tier.feat [data-checkout]');
    var hideOn = document.querySelectorAll('[data-sticky-hide]');
    var pastHero = !heroCta, hidden = 0;
    var upd = function () { sticky.classList.toggle('show', pastHero && hidden === 0); };
    if (heroCta) new IntersectionObserver(function (en) {
      en.forEach(function (x) { pastHero = !x.isIntersecting && x.boundingClientRect.top < 0; });
      upd();
    }).observe(heroCta);
    var vis = new Set();
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) vis.add(x.target); else vis.delete(x.target); });
      hidden = vis.size; upd();
    }, { threshold: 0 });
    hideOn.forEach(function (el) { io.observe(el); });
    upd();
  }

  /* ---- pricing_view ---- */
  var pricing = document.querySelector('[data-pricing]');
  if (PAGE === 'membership') track('pricing_view', { source: 'membership_page' });
  else if (pricing && 'IntersectionObserver' in window) {
    var seen = false;
    var po = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (x.isIntersecting && !seen) { seen = true; track('pricing_view', { source: 'home_pricing_section' }); po.disconnect(); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -35% 0px' }); // threshold-on-height never fired on phones: the stacked tiers are taller than the screen
    po.observe(pricing);
  }

  /* ---- tier buttons: go to the account step first (BRN-058 hard requirement) ---- */
  document.querySelectorAll('[data-checkout]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (btn.getAttribute('aria-disabled') === 'true') return;
      var tier = btn.getAttribute('data-tier');
      location.href = 'join.html?tier=' + encodeURIComponent(tier) + '&billing=' + encodeURIComponent(billingOf(btn));
    });
  });

  var QS = new URLSearchParams(location.search);
  var TIERS = { burn: ['BURN', '$7.99 / month'], burnplus: ['BURN+', '$17.99 / month'], burncomplete: ['BURN COMPLETE', '$27.99 / month'] };
  function pageTier() {
    var k = (QS.get('tier') || 'burnplus').toLowerCase();
    if (!TIERS[k]) k = 'burnplus';
    document.querySelectorAll('[data-ty-tier]').forEach(function (el) { el.textContent = TIERS[k][0]; });
    document.querySelectorAll('[data-ty-price]').forEach(function (el) { el.textContent = TIERS[k][1]; });
    return k;
  }
  function showEmail(email) {
    if (!email) return;
    document.querySelectorAll('[data-ty-email]').forEach(function (el) { el.textContent = email; }); // textContent: never parsed as HTML
    var w = document.querySelector('[data-dl-email-wrap]'); if (w) w.hidden = false;
  }

  /* ---- join page: create account (or sign in) -> mock Stripe Checkout -> thank-you ----
     MOCKUP ONLY. Real site: supabase.auth.signUp({email,password,options:{data:{full_name}}}) (the same call the
     app makes in src/lib/supabase.ts) or signInWithPassword, then a server function creates the Stripe Checkout
     Session with metadata.app_user_id = subscription_data.metadata.app_user_id = client_reference_id = the
     Supabase uid, and customer_email = the account email. Nothing here talks to Supabase or Stripe. */
  if (PAGE === 'join') {
    var jt = pageTier();
    var jbill = QS.get('billing') === 'annual' ? 'annual' : 'monthly';
    var form = document.querySelector('[data-account-form]');
    var errEl = document.querySelector('[data-form-err]');
    var mode = 'create', acct = null, accountEventSent = false;
    var setMode = function (m) {
      mode = m;
      document.querySelectorAll('[data-create-only]').forEach(function (el) {
        el.hidden = m !== 'create';
        el.querySelectorAll('input').forEach(function (i) { i.disabled = m !== 'create'; });
      });
      form.querySelector('[name=password]').setAttribute('autocomplete', m === 'create' ? 'new-password' : 'current-password');
      document.querySelector('[data-mode-title]').textContent = m === 'create' ? 'Create your account' : 'Sign in to BURN';
      document.querySelector('[data-mode-lede]').textContent = m === 'create'
        ? 'This is your BURN app login. You\u2019ll use it on your phone, so your membership is waiting for you there.'
        : 'Use the email and password you already use in the BURN app. Your membership goes on that account.';
      document.querySelector('[data-account-submit]').textContent = m === 'create' ? 'Create account & continue' : 'Sign in & continue';
      document.querySelector('[data-switch-q]').textContent = m === 'create' ? 'Already have a BURN app account?' : 'New to BURN?';
      document.querySelector('[data-switch-mode]').textContent = m === 'create' ? 'Sign in' : 'Create an account';
      errEl.textContent = '';
    };
    document.querySelector('[data-switch-mode]').addEventListener('click', function () { setMode(mode === 'create' ? 'signin' : 'create'); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, email = (f.email.value || '').trim(), pw = f.password.value || '';
      var err = '';
      if (mode === 'create' && !(f.first_name.value || '').trim()) err = 'Please add your first name.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err = 'Please enter a valid email address.';
      else if (pw.length < 8) err = 'Your password needs at least 8 characters.';
      else if (mode === 'create' && pw !== f.confirm.value) err = 'The two passwords don\u2019t match.';
      errEl.textContent = err;
      if (err) return;
      acct = { email: email };
      if (!accountEventSent) { // once per page view, even on double-submit
        accountEventSent = true;
        track(mode === 'create' ? 'account_created' : 'account_signed_in', { tier: jt, billing: jbill, method: 'email_password' });
      }
      document.querySelector('[data-join-step=account]').hidden = true;
      document.querySelector('[data-join-step=pay]').hidden = false;
      document.querySelector('[data-pay-email]').value = email;
      var a = document.querySelector('[data-step-ind=account]'), p = document.querySelector('[data-step-ind=pay]');
      a.classList.remove('on'); a.classList.add('done'); p.classList.add('on');
      window.scrollTo(0, 0);
    });
    document.querySelector('[data-mock-pay]').addEventListener('click', function () {
      if (!acct) return;
      var b = this; b.setAttribute('data-state', 'loading'); b.textContent = 'Processing (pretend)\u2026';
      // mock Stripe success URL: real one is thank-you?tier=..&session_id={CHECKOUT_SESSION_ID}
      var sid = 'cs_mock_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      setTimeout(function () {
        location.href = 'thank-you.html?tier=' + encodeURIComponent(jt) + '&email=' + encodeURIComponent(acct.email) + '&session_id=' + encodeURIComponent(sid);
      }, 900);
    });
  }

  /* ---- download page = the smart link the QR code points at ----
     iOS -> App Store (or TestFlight public link), Android -> Google Play, once those links exist.
     Until then everyone just sees this page. Fill these in at launch; nothing else changes. */
  var STORE_LINKS = { ios: null, testflight: null, android: null };
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  var iosLink = STORE_LINKS.ios || STORE_LINKS.testflight;
  document.querySelectorAll('[data-store=ios]').forEach(function (a) { if (iosLink) a.href = iosLink; });
  document.querySelectorAll('[data-store=android]').forEach(function (a) { if (STORE_LINKS.android) a.href = STORE_LINKS.android; });
  if (PAGE === 'download') {
    showEmail(QS.get('email'));
    var target = isIOS ? iosLink : isAndroid ? STORE_LINKS.android : null;
    if (QS.get('src') === 'qr' && target) location.replace(target);
    else if (QS.get('src') === 'qr') {
      var sm = document.querySelector('[data-smart-msg]');
      if (sm) { sm.hidden = false; sm.textContent = 'Store links are coming soon. Until then, this page is where the QR code lands.'; }
    }
  }

  /* ---- thank-you page ---- */
  if (PAGE === 'thank-you') {
    var q = pageTier();
    showEmail(QS.get('email'));
    // Fire once per checkout. On the real site the success URL carries Stripe's {CHECKOUT_SESSION_ID}
    // as ?session_id=..., used as the event_id (GA4 transaction_id, Meta eventID) so a refresh of this
    // page cannot double count, and so a server-side copy (Meta Conversions API / RevenueCat or Stripe
    // webhook) with the same id is deduplicated by Meta.
    var sid = new URLSearchParams(location.search).get('session_id');
    var DONE = 'burn_v2_reg_done';
    var done = []; try { done = JSON.parse(localStorage.getItem(DONE) || '[]'); } catch (e) {}
    if (sid && done.indexOf(sid) > -1) {
      try { console.log('[BURN track] registration_complete skipped: already recorded for session ' + sid); } catch (e) {}
    } else {
      track('registration_complete', { tier: q, event_id: sid || newEventId('mock_checkout') });
      if (sid) { done.push(sid); try { localStorage.setItem(DONE, JSON.stringify(done.slice(-20))); } catch (e) {} }
    }
  }

  /* ---- workout discovery filters (Workouts page + home) ---- */
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var grid = document.querySelector(group.getAttribute('data-target'));
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      group.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      var f = b.getAttribute('data-f');
      grid.querySelectorAll('[data-tags]').forEach(function (c) {
        c.hidden = !(f === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') > -1);
      });
    });
  });

  /* ---- "Your goals. Your schedule. Your plan." planner ---- */
  var planner = document.querySelector('[data-planner]');
  if (planner) {
    var out = planner.querySelector('[data-plan-out]');
    var render = function () {
      var goal = planner.querySelector('[data-goal].on');
      var days = planner.querySelectorAll('[data-day].on').length;
      var len = planner.querySelector('[data-len].on');
      out.textContent = (goal ? goal.textContent : 'Your goal') + ' · ' + days + ' day' + (days === 1 ? '' : 's') + ' a week · ' + (len ? len.textContent : '30 min');
    };
    planner.addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (!c) return;
      if (c.hasAttribute('data-day')) c.classList.toggle('on');
      else {
        var attr = c.hasAttribute('data-goal') ? 'data-goal' : 'data-len';
        planner.querySelectorAll('[' + attr + ']').forEach(function (x) { x.classList.toggle('on', x === c); });
      }
      render();
    });
    render();
  }

  /* ---- notes page debug counter ---- */
  var counter = document.querySelector('[data-debug]');
  if (counter) {
    var draw = function () {
      var s = JSON.parse(localStorage.getItem(LS) || '{"counts":{},"log":[]}');
      ['join_now_click', 'pricing_view', 'account_created', 'registration_complete'].forEach(function (k) {
        var el = counter.querySelector('[data-count="' + k + '"]'); if (el) el.textContent = s.counts[k] || 0;
      });
      var log = document.querySelector('[data-evlog]');
      if (log) log.textContent = s.log.length ? s.log.join('\n') : 'No events yet. Click any Join button, scroll to pricing, or finish a mock checkout.';
    };
    draw();
    document.addEventListener('burn:track', draw);
    window.addEventListener('storage', draw);
    var rs = document.querySelector('[data-reset]');
    if (rs) rs.addEventListener('click', function () { localStorage.removeItem(LS); draw(); });
  }
})();
