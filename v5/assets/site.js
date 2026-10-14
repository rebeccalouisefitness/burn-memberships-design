/* BURN website v5 — behaviour + conversion tracking layer.
 *
 * TRACKING: every event is
 *   1) pushed to window.dataLayer (GTM / GA4 can read it as-is)
 *   2) logged to the console as "[BURN track] <event> {...}"
 *   3) counted in localStorage (Notes page counter; ?debug=1 shows a small counter on any page)
 *   4) sent to GA4 + Meta ONLY on the production host with real BURN IDs (see ANALYTICS). On the
 *      GitHub Pages preview nothing leaves the browser.
 * Events:
 *   join_now_click        {location, tier?, billing}
 *   pricing_view          {source}
 *   quiz_start            {entry}
 *   quiz_complete         {tier, billing, goal}
 *   quiz_result_join_click{tier, billing}
 *   account_created       {tier, billing, method}      (join.html, once per page view)
 *   account_signed_in     {tier, billing}
 *   registration_complete {tier, billing, value}       (thank-you, once per session_id) -> GA4 purchase
 * Billing (monthly | annual) is one shared state: URL ?billing= wins, then sessionStorage, then monthly.
 * It is carried tier + billing through join.html -> checkout -> thank-you.html in the URL.
 */
(function () {
  'use strict';
  var PAGE = document.body.getAttribute('data-page') || 'home';
  var LS = 'burn_v5_mock_events';
  var QS = new URLSearchParams(location.search);
  window.dataLayer = window.dataLayer || [];

  /* ---------------- prices: source of truth = burn-membership-tiers-oct8 page (8 Oct 2026) ---------------- */
  var PRICES = {
    burn:         { name: 'BURN',          monthly: 7.99,  annual: 83.99,  save: 12 },
    burnplus:     { name: 'BURN+',         monthly: 17.99, annual: 167.99, save: 22 },
    burncomplete: { name: 'BURN COMPLETE', monthly: 27.99, annual: 224.99, save: 33 }
  };
  /* Annual is SHOWN as a monthly equivalent (Rebecca, 14 Oct: "just put the monthly one"):
     annual / 12, rounded to cents. BURN 83.99 -> 7.00, BURN+ 167.99 -> 14.00, COMPLETE 224.99 -> 18.75.
     The amount actually charged (and sent to analytics) is still the annual price. */
  var r2 = function (v) { return Math.round((v + 1e-9) * 100) / 100; };
  Object.keys(PRICES).forEach(function (k) { PRICES[k].annualMonthly = r2(PRICES[k].annual / 12); });
  window.BURN_PRICES = PRICES;
  var money = function (v) { return '$' + v.toFixed(2); };
  var perTxt = function () { return '/ month'; };
  /* headline per-month figure for the current billing */
  var shownAmt = function (t, b) { return b === 'annual' ? PRICES[t].annualMonthly : PRICES[t].monthly; };
  var priceTxt = function (t, b) { return money(shownAmt(t, b)) + ' / month'; };
  var billedTxt = function (t, b) { return b === 'annual' ? 'Billed ' + money(PRICES[t].annual) + ' yearly' : 'Billed monthly'; };

  /* ---------------- ANALYTICS: GA4 + Meta Pixel, host-gated ----------------
     IDs below are not BURN's real IDs yet. Tags load ONLY on the production host AND only once both IDs
     are real. On github.io nothing is requested from googletagmanager.com / google-analytics.com /
     connect.facebook.net. NEVER use the Luna Bloom pixel here. */
  var BURN_GA4_MEASUREMENT_ID = 'G-BURN_GA4_ID_UNSET';
  var BURN_META_PIXEL_ID = 'BURN_META_PIXEL_ID_UNSET';
  var BURN_PRODUCTION_HOSTS = ['rebecca-louise.com', 'www.rebecca-louise.com'];
  var isProdHost = BURN_PRODUCTION_HOSTS.indexOf(location.hostname) > -1;
  var idsReal = !/_UNSET/.test(BURN_GA4_MEASUREMENT_ID + BURN_META_PIXEL_ID);
  var VENDORS_ON = isProdHost && idsReal;
  window.BURN_ANALYTICS = { mode: VENDORS_ON ? 'live' : 'preview', host: location.hostname, sent: 0 };

  if (VENDORS_ON) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(BURN_GA4_MEASUREMENT_ID);
    document.head.appendChild(g);
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', BURN_GA4_MEASUREMENT_ID);
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', BURN_META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function newEventId(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10); }

  function vendorCalls(event, p) {
    var calls = [], tier = p.tier, billing = p.billing || 'monthly';
    var price = tier && PRICES[tier] ? PRICES[tier][billing] : undefined;
    var itemId = tier ? tier + '_' + billing : '';
    if (event === 'join_now_click') {
      calls.push(['gtag', 'event', 'join_now_click', { location: p.location, tier: tier || '', billing: billing }]);
      var ic = { tier: tier || '', billing: billing, content_category: 'membership' };
      if (price !== undefined) { ic.value = price; ic.currency = 'USD'; ic.content_name = PRICES[tier].name; ic.content_ids = [itemId]; }
      calls.push(['fbq', 'track', 'InitiateCheckout', ic, { eventID: p.event_id }]);
    } else if (event === 'pricing_view') {
      calls.push(['gtag', 'event', 'view_item_list', { item_list_id: 'burn_memberships', item_list_name: 'BURN memberships', source: p.source,
        items: Object.keys(PRICES).map(function (k) { return { item_id: k + '_' + billing, item_name: PRICES[k].name, price: PRICES[k][billing] }; }) }]);
      calls.push(['fbq', 'trackCustom', 'ViewPricing', { source: p.source, billing: billing }, { eventID: p.event_id }]);
    } else if (event === 'quiz_start' || event === 'quiz_complete' || event === 'quiz_result_join_click') {
      var qp = {}; ['entry', 'tier', 'billing', 'goal'].forEach(function (k) { if (p[k]) qp[k] = p[k]; });
      calls.push(['gtag', 'event', event, qp]);                       // GA4 custom event
      calls.push(['fbq', 'trackCustom', event, qp, { eventID: p.event_id }]); // Meta custom event
    } else if (event === 'account_created') {
      calls.push(['gtag', 'event', 'sign_up', { method: 'email_password', tier: tier || '', billing: billing }]);
      var lead = { content_name: tier ? PRICES[tier].name : '', tier: tier || '', billing: billing, content_category: 'membership' };
      if (price !== undefined) { lead.value = price; lead.currency = 'USD'; }
      calls.push(['fbq', 'track', 'Lead', lead, { eventID: p.event_id }]);
    } else if (event === 'account_signed_in') {
      calls.push(['gtag', 'event', 'login', { method: 'email_password', tier: tier || '', billing: billing }]);
    } else if (event === 'registration_complete') {
      calls.push(['gtag', 'event', 'purchase', { transaction_id: p.event_id, value: price, currency: 'USD', tier: tier, billing: billing,
        items: [{ item_id: itemId, item_name: PRICES[tier].name, item_variant: billing, price: price, quantity: 1 }] }]);
      calls.push(['fbq', 'track', 'CompleteRegistration', { value: price, currency: 'USD', tier: tier, billing: billing }, { eventID: 'reg_' + p.event_id }]);
      calls.push(['fbq', 'track', 'Subscribe', { value: price, currency: 'USD', tier: tier, billing: billing,
        predicted_ltv: billing === 'annual' ? price : Math.round(price * 12 * 100) / 100 }, { eventID: 'sub_' + p.event_id }]);
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
    window.dataLayer.push(Object.assign({ event: event }, params));
    sendToVendors(event, params);
    try { console.log('[BURN track] ' + event, JSON.stringify(params)); } catch (e) {}
    try {
      var s = JSON.parse(localStorage.getItem(LS) || '{"counts":{},"log":[]}');
      s.counts[event] = (s.counts[event] || 0) + 1;
      s.log.unshift(new Date().toLocaleTimeString() + '  ' + event + '  ' + JSON.stringify(params));
      s.log = s.log.slice(0, 80);
      localStorage.setItem(LS, JSON.stringify(s));
    } catch (e) {}
    document.dispatchEvent(new CustomEvent('burn:track'));
  }
  window.burnTrack = track;

  /* ---------------- shared billing state ---------------- */
  var BKEY = 'burn_v5_billing';
  var billing = (function () {
    var q = QS.get('billing');
    if (q === 'annual' || q === 'monthly') return q;
    try { var s = sessionStorage.getItem(BKEY); if (s === 'annual' || s === 'monthly') return s; } catch (e) {}
    return 'monthly';
  })();
  function renderBilling() {
    document.documentElement.setAttribute('data-billing', billing);
    document.querySelectorAll('[data-bill]').forEach(function (b) {
      var on = b.getAttribute('data-bill') === billing;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-amt]').forEach(function (el) { var t = el.getAttribute('data-amt'); if (PRICES[t]) el.textContent = money(shownAmt(t, billing)); });
    document.querySelectorAll('[data-per]').forEach(function (el) { el.textContent = perTxt(billing); });
    document.querySelectorAll('[data-pricetxt]').forEach(function (el) { var t = el.getAttribute('data-pricetxt'); if (PRICES[t]) el.textContent = priceTxt(t, billing); });
    document.querySelectorAll('[data-billedtxt]').forEach(function (el) { var t = el.getAttribute('data-billedtxt'); if (PRICES[t]) el.textContent = billing === 'annual' ? 'billed ' + money(PRICES[t].annual) + ' yearly' : ''; });
    document.querySelectorAll('[data-save]').forEach(function (el) {
      var t = el.getAttribute('data-save'); el.textContent = 'Save ' + PRICES[t].save + '%'; el.hidden = billing !== 'annual';
    });
    document.querySelectorAll('[data-alt]').forEach(function (el) {
      var t = el.getAttribute('data-alt'), P = PRICES[t];
      el.textContent = billing === 'annual' ? 'Billed ' + money(P.annual) + ' yearly' : 'or ' + money(P.annualMonthly) + ' / month billed yearly (save ' + P.save + '%)';
    });
    document.querySelectorAll('[data-from]').forEach(function (el) {
      el.textContent = billing === 'annual' ? 'From ' + money(PRICES.burn.annualMonthly) + ' a month, billed yearly' : 'From ' + money(PRICES.burn.monthly) + ' a month';
    });
    document.querySelectorAll('[data-sticky-from]').forEach(function (el) {
      el.textContent = billing === 'annual' ? 'from ' + money(PRICES.burn.annualMonthly) + ' a month, billed yearly.' : 'from ' + money(PRICES.burn.monthly) + ' a month.';
    });
  }
  function setBilling(b) {
    billing = b === 'annual' ? 'annual' : 'monthly';
    try { sessionStorage.setItem(BKEY, billing); } catch (e) {}
    renderBilling();
    document.dispatchEvent(new CustomEvent('burn:billing'));
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bill]');
    if (b) { e.preventDefault(); setBilling(b.getAttribute('data-bill')); }
  });

  function joinUrl(tier, src) {
    return 'join.html?tier=' + encodeURIComponent(tier) + '&billing=' + encodeURIComponent(billing) + (src ? '&src=' + encodeURIComponent(src) : '');
  }

  /* ---------------- Join Now clicks (any [data-join]) ---------------- */
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-join]');
    if (!j) return;
    var p = { location: j.getAttribute('data-join'), billing: billing };
    if (j.getAttribute('data-tier')) p.tier = j.getAttribute('data-tier');
    track('join_now_click', p);
  }, true);

  /* tier buttons -> account step first (desktop purchase unlocks the app) */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-checkout]');
    if (!btn) return;
    e.preventDefault();
    location.href = joinUrl(btn.getAttribute('data-tier'), btn.getAttribute('data-join'));
  });

  /* ---------------- mobile menu ---------------- */
  var hdr = document.querySelector('header.site');
  var burger = document.querySelector('.burger');
  if (burger) burger.addEventListener('click', function () { var open = hdr.classList.toggle('open'); burger.setAttribute('aria-expanded', open); });
  document.querySelectorAll('.mnav a').forEach(function (a) { a.addEventListener('click', function () { hdr.classList.remove('open'); }); });

  /* ---------------- sticky Join Now ---------------- */
  var sticky = document.querySelector('.sticky-join');
  if (sticky && 'IntersectionObserver' in window) {
    var heroCta = document.querySelector('[data-sticky-after]');
    var hideOn = document.querySelectorAll('[data-sticky-hide]');
    var pastHero = !heroCta, hiddenN = 0;
    var upd = function () { sticky.classList.toggle('show', pastHero && hiddenN === 0); };
    if (heroCta) new IntersectionObserver(function (en) { en.forEach(function (x) { pastHero = !x.isIntersecting && x.boundingClientRect.top < 0; }); upd(); }).observe(heroCta);
    var vis = new Set();
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) vis.add(x.target); else vis.delete(x.target); }); hiddenN = vis.size; upd(); }, { threshold: 0 });
    hideOn.forEach(function (el) { io.observe(el); });
    upd();
  }

  /* ---------------- pricing_view ---------------- */
  var pricing = document.querySelector('[data-pricing]');
  if (PAGE === 'membership') track('pricing_view', { source: 'membership_page', billing: billing });
  else if (pricing && 'IntersectionObserver' in window) {
    var seen = false;
    var po = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting && !seen) { seen = true; track('pricing_view', { source: 'home_pricing_section', billing: billing }); po.disconnect(); } });
    }, { threshold: 0, rootMargin: '0px 0px -35% 0px' });
    po.observe(pricing);
  }

  /* ---------------- reviews: show 3, "Read more reviews" reveals 3 more ---------------- */
  document.querySelectorAll('[data-more-reviews]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = target.hidden;
      target.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Show fewer reviews' : 'Read more reviews';
    });
  });

  /* ---------------- workout filters ---------------- */
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var grid = document.querySelector(group.getAttribute('data-target'));
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]');
      if (!b) return;
      group.querySelectorAll('button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var f = b.getAttribute('data-f');
      grid.querySelectorAll('.wcard').forEach(function (c) {
        c.hidden = !(f === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') > -1);
      });
    });
  });

  /* ---------------- Build & schedule preview (BURN+): pick workouts, a day, a time or a live class ---------------- */
  var planner = document.querySelector('[data-planner]');
  if (planner) {
    var out = planner.querySelector('[data-plan-out]');
    var render = function () {
      var ws = Array.prototype.slice.call(planner.querySelectorAll('[data-pw].on'));
      var day = planner.querySelector('[data-day].on');
      var tm = planner.querySelector('[data-time].on');
      var mins = ws.reduce(function (n, w) { return n + (+w.getAttribute('data-min') || 0); }, 0);
      var names = ws.map(function (w) { return w.firstChild.textContent.trim(); });
      var d = day ? day.getAttribute('data-day') : 'Pick a day';
      if (tm && tm.getAttribute('data-time') === 'class') { out.textContent = d + ' · Live class with Rebecca'; return; }
      out.textContent = d + ' · ' + (tm ? tm.getAttribute('data-time') : '') + ' · ' + (names.length ? names.join(' + ') + ' · ' + mins + ' min' : 'Pick a workout');
    };
    planner.addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (!c) return;
      if (c.hasAttribute('data-pw')) { c.classList.toggle('on'); c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false'); }
      else {
        var attr = c.hasAttribute('data-day') ? 'data-day' : 'data-time';
        planner.querySelectorAll('[' + attr + ']').forEach(function (x) { var on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      }
      render();
    });
    render();
  }

  /* =====================================================================
     FIND YOUR BURN quiz (dialog). Logic mirrors Rebecca's tier list (B):
       pregnant / postpartum, or wants My BURN plan  -> BURN COMPLETE
       wants to build own workouts / schedule / live classes, daily practice, stats -> BURN+
       otherwise -> BURN
     ===================================================================== */
  var QUIZ = [
    { id: 'goal', q: 'What’s your main goal right now?', opts: [
      { v: 'stronger', t: 'Get stronger' }, { v: 'tone', t: 'Tone and sculpt' }, { v: 'weight', t: 'Lose weight' },
      { v: 'energy', t: 'Feel more energised' }, { v: 'habit', t: 'Build a habit that sticks' }] },
    { id: 'guide', q: 'How much guidance do you want?', opts: [
      { v: 'self', t: 'I’ll pick my own workouts', s: 'Programs, challenges and the full library' },
      { v: 'schedule', t: 'I want to build my own workouts and schedule my week', s: 'Create your own workout, schedule it or join a live class', w: 'plus' },
      { v: 'personal', t: 'My BURN plan, which I can adjust', s: 'Plus AI support chat', w: 'complete' }] },
    { id: 'daily', q: 'Would a daily practice help you?', sub: 'Daily Read, a gratitude journal and cycle-aware training.', opts: [
      { v: 'yes', t: 'Yes, I’d use it most days', w: 'plus' }, { v: 'no', t: 'Not right now' }] },
    { id: 'stats', q: 'Do you like to see your numbers?', sub: 'Activity stats, progress and achievements.', opts: [
      { v: 'yes', t: 'Yes, it keeps me going', w: 'plus' }, { v: 'no', t: 'Just the workouts is fine' }] },
    { id: 'stage', q: 'Are you pregnant, or have you had a baby in the last year?', opts: [
      { v: 'pregnant', t: 'Yes, I’m pregnant', w: 'complete' }, { v: 'postpartum', t: 'Yes, I’m postpartum', w: 'complete' }, { v: 'no', t: 'No' }] }
  ];
  var GOAL_TXT = { stronger: 'getting stronger', tone: 'toning and sculpting', weight: 'losing weight', energy: 'feeling more energised', habit: 'building a habit that sticks' };
  function quizResult(a) {
    if (a.stage === 'pregnant' || a.stage === 'postpartum' || a.guide === 'personal') return 'burncomplete';
    if (a.guide === 'schedule' || a.daily === 'yes' || a.stats === 'yes') return 'burnplus';
    return 'burn';
  }
  window.burnQuizResult = quizResult; // exposed for testing all paths
  function quizWhy(tier, a) {
    var g = GOAL_TXT[a.goal] ? 'For ' + GOAL_TXT[a.goal] + ': ' : '';
    if (tier === 'burncomplete') {
      if (a.stage === 'pregnant' || a.stage === 'postpartum') return g + 'Rebecca’s Luna Bloom pregnancy and postpartum programs are part of BURN COMPLETE, together with everything in BURN+.';
      return g + 'BURN COMPLETE is your most personalised BURN experience: My BURN plan, AI support chat and points for the store, plus everything in BURN+.';
    }
    if (tier === 'burnplus') return g + 'BURN+ makes BURN yours: build your own workouts, schedule your week or join a live class, with the Daily Read, your gratitude journal and your stats.';
    return g + 'BURN gives you 40+ programs, a new challenge every month, recipes and the community. Everything you need to start.';
  }
  var QUIZ_FEATS = {
    burn: [['Monthly challenges', ''], ['40+ workout programs', ''], ['Recipes and the Thrive library', ''], ['Favourites', 'new'], ['Community chat', 'new'], ['Daily quote', 'new'], ['Progress photos', 'new']],
    burnplus: [['Everything in BURN', ''], ['Your own playlists', ''], ['Schedule your workout & join a live class', ''], ['Daily Read', ''], ['Gratitude journal', '']],
    burncomplete: [['Everything in BURN+', ''], ['My BURN plan', ''], ['AI support chat', ''], ['Luna Bloom pregnancy & postpartum', '']]
  };
  var dlg = null, step = 0, answers = {}, quizEntry = 'unknown', resultTier = null;
  function el(tag, attrs, html) { var x = document.createElement(tag); if (attrs) Object.keys(attrs).forEach(function (k) { x.setAttribute(k, attrs[k]); }); if (html != null) x.innerHTML = html; return x; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function tagHtml(t) { return t === 'new' ? ' <span class="tag new">New</span>' : ''; }
  function buildDialog() {
    dlg = el('dialog', { 'class': 'quiz', id: 'find-your-burn', 'aria-labelledby': 'qz-title' });
    dlg.innerHTML = '<div class="qz"><div class="qz-top"><div class="kick" id="qz-title">Find your BURN</div>' +
      '<button type="button" class="qz-close" data-qz-close aria-label="Close the quiz">&times;</button></div>' +
      '<div class="qz-bar" aria-hidden="true"><i></i></div><div data-qz-body aria-live="polite"></div></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { closeQuiz(); return; }               // backdrop click
      if (e.target.closest('[data-qz-close]')) { closeQuiz(); return; }
      var o = e.target.closest('[data-qz-opt]');
      if (o) { answers[QUIZ[step].id] = o.getAttribute('data-qz-opt'); step++; renderStep(); return; }
      if (e.target.closest('[data-qz-back]')) { if (step > 0) { step--; renderStep(); } return; }
      if (e.target.closest('[data-qz-restart]')) { answers = {}; step = 0; resultTier = null; renderStep(); return; }
      var j = e.target.closest('[data-qz-join]');
      if (j) {
        e.preventDefault();
        track('quiz_result_join_click', { tier: resultTier, billing: billing });
        location.href = joinUrl(resultTier, 'quiz_result');
      }
    });
    dlg.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    document.addEventListener('burn:billing', function () { if (resultTier && dlg.open) renderStep(true); });
  }
  function renderStep(keepFocus) {
    var body = dlg.querySelector('[data-qz-body]');
    var bar = dlg.querySelector('.qz-bar i');
    if (step < QUIZ.length) {
      var Q = QUIZ[step];
      bar.style.width = Math.round((step / QUIZ.length) * 100) + '%';
      var h = '<div class="muted" style="font-size:13px">Question ' + (step + 1) + ' of ' + QUIZ.length + '</div>' +
        '<h2 tabindex="-1" data-qz-h>' + esc(Q.q) + '</h2>' + (Q.sub ? '<p class="sub">' + esc(Q.sub) + '</p>' : '') +
        '<div class="qz-opts" role="group" aria-label="' + esc(Q.q) + '">';
      Q.opts.forEach(function (o) {
        h += '<button type="button" class="qz-opt" data-qz-opt="' + o.v + '" aria-pressed="' + (answers[Q.id] === o.v ? 'true' : 'false') + '">' + esc(o.t) + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</button>';
      });
      h += '</div><div class="qz-nav">' + (step > 0 ? '<button type="button" class="textbtn" data-qz-back>&larr; Back</button>' : '<span></span>') +
        '<span class="muted" style="font-size:13px">About 30 seconds</span></div>';
      body.innerHTML = h;
    } else {
      bar.style.width = '100%';
      var first = resultTier === null;
      resultTier = quizResult(answers);
      var P = PRICES[resultTier];
      var lis = QUIZ_FEATS[resultTier].map(function (f) { return '<li>' + esc(f[0]) + tagHtml(f[1]) + '</li>'; }).join('');
      body.innerHTML = '<div class="muted" style="font-size:13px">Your result</div><h2 tabindex="-1" data-qz-h>Your BURN is ' + esc(P.name) + '</h2>' +
        '<div class="qz-res">' +
        '<div class="price"><span class="amt">' + money(shownAmt(resultTier, billing)) + '</span><span class="per">' + perTxt(billing) + '</span>' +
        (billing === 'annual' ? '<span class="save">Save ' + P.save + '%</span>' : '') + '</div>' +
        '<div class="muted" style="font-size:13px" data-qz-billed>' + (billing === 'annual' ? 'Billed ' + money(P.annual) + ' yearly' : 'or ' + money(P.annualMonthly) + ' / month billed yearly (save ' + P.save + '%)') + '</div>' +
        '<div class="billing" role="group" aria-label="Billing period"><button type="button" data-bill="monthly">Monthly</button><button type="button" data-bill="annual">Annual</button></div>' +
        '<p class="why">' + esc(quizWhy(resultTier, answers)) + '</p><ul>' + lis + '</ul>' +
        '<a class="btn block" href="' + joinUrl(resultTier, 'quiz_result') + '" data-qz-join data-join="quiz_result" data-tier="' + resultTier + '">Join ' + esc(P.name) + '</a></div>' +
        '<div class="qz-nav"><button type="button" class="textbtn" data-qz-back>&larr; Back</button><button type="button" class="textbtn" data-qz-restart>Start again</button></div>' +
        '<p style="text-align:center;margin-top:10px;font-size:14px"><a class="link" href="membership.html#compare">Compare all memberships</a></p>';
      renderBilling();
      if (first) track('quiz_complete', { tier: resultTier, billing: billing, goal: answers.goal || '' });
    }
    if (!keepFocus) { var hh = body.querySelector('[data-qz-h]'); if (hh) hh.focus(); }
  }
  var lastFocus = null;
  function openQuiz(entry) {
    if (!dlg) buildDialog();
    lastFocus = document.activeElement;
    answers = {}; step = 0; resultTier = null; quizEntry = entry || 'unknown';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    track('quiz_start', { entry: quizEntry });
    renderStep();
  }
  function closeQuiz() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  window.burnOpenQuiz = openQuiz;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-quiz-open]');
    if (!t) return;
    e.preventDefault();
    openQuiz(t.getAttribute('data-quiz-open'));
  });
  if (location.hash === '#find-your-burn' && document.querySelector('[data-quiz-open]')) setTimeout(function () { openQuiz('link'); }, 300);

  /* ---------------- join page: account -> checkout -> thank-you ----------------
     DESIGN ONLY. Real site: supabase.auth.signUp / signInWithPassword (same login as the app), then a server
     function creates the Stripe Checkout Session for the price with lookup key <tier>_<billing>, with
     client_reference_id = metadata.app_user_id = the Supabase uid and customer_email = the account email. */
  var TIER_OK = function (k) { return PRICES[k] ? k : 'burnplus'; };
  var pageTierKey = TIER_OK((QS.get('tier') || 'burnplus').toLowerCase());
  function paintTier() {
    document.querySelectorAll('[data-ty-tier]').forEach(function (x) { x.textContent = PRICES[pageTierKey].name; });
    var P = PRICES[pageTierKey];
    document.querySelectorAll('[data-ty-price]').forEach(function (x) { x.textContent = priceTxt(pageTierKey, billing); });
    document.querySelectorAll('[data-ty-billed]').forEach(function (x) { x.textContent = billedTxt(pageTierKey, billing); });
    document.querySelectorAll('[data-ty-due]').forEach(function (x) { x.textContent = money(P[billing]); });
    document.querySelectorAll('[data-ty-then]').forEach(function (x) { x.textContent = billing === 'annual' ? money(P.annual) + ' every year (' + money(P.annualMonthly) + ' / month)' : money(P.monthly) + ' every month'; });
    document.querySelectorAll('[data-ty-paidnote]').forEach(function (x) { x.textContent = billing === 'annual' ? 'Billed yearly (' + money(P.annualMonthly) + ' / month)' : 'Billed monthly'; });
    document.querySelectorAll('[data-ty-bill-m]').forEach(function (x) { x.textContent = priceTxt(pageTierKey, 'monthly'); });
    document.querySelectorAll('[data-ty-bill-a]').forEach(function (x) { x.textContent = priceTxt(pageTierKey, 'annual') + ' · billed ' + money(P.annual) + ' yearly · save ' + P.save + '%'; });
  }
  document.addEventListener('burn:billing', paintTier);
  function showEmail(email) {
    if (!email) return;
    document.querySelectorAll('[data-ty-email]').forEach(function (x) { x.textContent = email; });
    var w = document.querySelector('[data-dl-email-wrap]'); if (w) w.hidden = false;
  }

  if (PAGE === 'join') {
    paintTier();
    var form = document.querySelector('[data-account-form]');
    var errEl = document.querySelector('[data-form-err]');
    var mode = 'create', acct = null, accountEventSent = false;
    var setMode = function (m) {
      mode = m;
      document.querySelectorAll('[data-create-only]').forEach(function (x) {
        x.hidden = m !== 'create';
        x.querySelectorAll('input').forEach(function (i) { i.disabled = m !== 'create'; });
      });
      form.querySelector('[name=password]').setAttribute('autocomplete', m === 'create' ? 'new-password' : 'current-password');
      document.querySelector('[data-mode-title]').textContent = m === 'create' ? 'Create your account' : 'Sign in to BURN';
      document.querySelector('[data-mode-lede]').textContent = m === 'create'
        ? 'This is your BURN app login. You’ll use it on your phone, so your membership is waiting for you there.'
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
      else if (mode === 'create' && pw !== f.password2.value) err = 'The two passwords don’t match.';
      errEl.textContent = err;
      if (err) return;
      acct = { email: email };
      if (!accountEventSent) {
        accountEventSent = true;
        track(mode === 'create' ? 'account_created' : 'account_signed_in', { tier: pageTierKey, billing: billing, method: 'email_password' });
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
      var b = this; b.setAttribute('data-state', 'loading'); b.textContent = 'Processing…';
      var sid = 'cs_demo_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      setTimeout(function () {
        location.href = 'thank-you.html?tier=' + encodeURIComponent(pageTierKey) + '&billing=' + encodeURIComponent(billing) +
          '&email=' + encodeURIComponent(acct.email) + '&session_id=' + encodeURIComponent(sid);
      }, 700);
    });
  }

  /* ---------------- download page = where the QR lands ---------------- */
  var STORE_LINKS = { ios: null, testflight: null, android: null }; // fill at launch; nothing else changes
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
  }

  /* ---------------- thank-you page ---------------- */
  if (PAGE === 'thank-you') {
    paintTier();
    showEmail(QS.get('email'));
    var dl = document.querySelectorAll('[data-dl-link]');
    var em = QS.get('email');
    dl.forEach(function (a) { if (em) a.href = 'download.html?email=' + encodeURIComponent(em); });
    var sid = QS.get('session_id');
    var DONE = 'burn_v5_reg_done', done = [];
    try { done = JSON.parse(localStorage.getItem(DONE) || '[]'); } catch (e) {}
    if (sid && done.indexOf(sid) > -1) {
      try { console.log('[BURN track] registration_complete skipped: already recorded for session ' + sid); } catch (e) {}
    } else {
      track('registration_complete', { tier: pageTierKey, billing: billing, value: PRICES[pageTierKey][billing], currency: 'USD', event_id: sid || newEventId('demo_checkout') });
      if (sid) { done.push(sid); try { localStorage.setItem(DONE, JSON.stringify(done.slice(-20))); } catch (e) {} }
    }
  }

  /* ---------------- debug counters ---------------- */
  var EVENTS = ['join_now_click', 'pricing_view', 'quiz_start', 'quiz_complete', 'quiz_result_join_click', 'account_created', 'registration_complete'];
  function readLog() { try { return JSON.parse(localStorage.getItem(LS) || '{"counts":{},"log":[]}'); } catch (e) { return { counts: {}, log: [] }; } }
  var counter = document.querySelector('[data-debug]');
  if (counter) {
    var draw = function () {
      var s = readLog();
      EVENTS.forEach(function (k) { var x = counter.querySelector('[data-count="' + k + '"]'); if (x) x.textContent = s.counts[k] || 0; });
      var log = document.querySelector('[data-evlog]');
      if (log) log.textContent = s.log.length ? s.log.join('\n') : 'No events yet.';
    };
    draw();
    document.addEventListener('burn:track', draw);
    window.addEventListener('storage', draw);
    var rs = document.querySelector('[data-reset]');
    if (rs) rs.addEventListener('click', function () { localStorage.removeItem(LS); draw(); });
  }
  if (!VENDORS_ON && (QS.get('debug') === '1' || (function () { try { return sessionStorage.getItem('burn_v5_debug') === '1'; } catch (e) { return false; } })())) {
    try { sessionStorage.setItem('burn_v5_debug', '1'); } catch (e) {}
    var d = el('div', { 'class': 'dbg', 'aria-hidden': 'true' });
    document.body.appendChild(d);
    var drawD = function () { var s = readLog(); d.textContent = 'events: ' + EVENTS.map(function (k) { return k + ' ' + (s.counts[k] || 0); }).join(' · '); };
    drawD(); document.addEventListener('burn:track', drawD);
  }

  renderBilling();
})();

/* ---------------- Hero photo review switcher (BRN-058) ----------------
   Review tool only. Rendered only when build.py has HERO_SWITCHER = True (it emits #hero-options).
   ?hero=a|b|c|d picks an option so each one can be shared. No [data-join] here, so no tracking fires. */
(function () {
  var sec = document.querySelector('.hero[data-hero]');
  var data = document.getElementById('hero-options');
  if (!sec || !data) return;
  var opts; try { opts = JSON.parse(data.textContent); } catch (e) { return; }
  var img = sec.querySelector('.hero-img'), source = sec.querySelector('picture source');
  var keys = Object.keys(opts);
  var bar = document.createElement('div');
  bar.className = 'hero-switch'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Hero photo options');
  bar.innerHTML = '<span class="hs-t">Hero:</span>' + keys.map(function (k) {
    return '<button type="button" data-hero-pick="' + k + '" aria-pressed="false"><b>' + k.toUpperCase() + '</b> ' + opts[k].label + '</button>';
  }).join('');
  function apply(k, push) {
    var o = opts[k]; if (!o) return;
    if (sec.getAttribute('data-hero') !== k) {
      if (source) source.srcset = o.m;
      img.srcset = o.d; img.src = o.src; img.alt = o.alt;
      sec.setAttribute('data-hero', k);
    }
    bar.querySelectorAll('[data-hero-pick]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-hero-pick') === k ? 'true' : 'false'); });
    if (push) {
      try { var u = new URL(location.href); u.searchParams.set('hero', k); history.replaceState(null, '', u.toString()); } catch (e) {}
    }
  }
  var q = '';
  try { q = (new URLSearchParams(location.search).get('hero') || '').toLowerCase(); } catch (e) {}
  apply(opts[q] ? q : sec.getAttribute('data-hero'), false);
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hero-pick]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    apply(b.getAttribute('data-hero-pick'), true);
  });
  document.body.appendChild(bar);
})();
