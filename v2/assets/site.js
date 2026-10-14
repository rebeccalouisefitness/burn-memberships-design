/* BURN website v2 — mockup behaviour + conversion tracking layer.
 *
 * TRACKING (design mockup): every event is
 *   1) pushed to window.dataLayer  -> Google Tag Manager / GA4 can read it as-is
 *   2) logged to the console as "[BURN track] <event> {...}"
 *   3) counted in localStorage so the Notes page can show a debug counter
 * Events: join_now_click {location: nav|hero|sticky|final|tier|page_cta, tier?, page}
 *         pricing_view   {source: home_pricing_section|membership_page, page}
 *         registration_complete {tier, page}   (thank-you page only)
 * To go live, add ONE of the snippets in sendToVendors() once Rebecca chooses a tool.
 */
(function () {
  'use strict';
  var PAGE = document.body.getAttribute('data-page') || 'home';
  var LS = 'burn_v2_mock_events';
  window.dataLayer = window.dataLayer || [];

  function sendToVendors(event, params) {
    // GA4 (gtag.js), once installed:      if (window.gtag) gtag('event', event, params);
    // Meta Pixel, once installed:         if (window.fbq) fbq('trackCustom', event, params);
    //   (registration_complete -> fbq('track','CompleteRegistration', params) is the standard Meta event)
    // Nothing is sent anywhere in the mockup.
  }

  function track(event, params) {
    params = params || {};
    params.page = PAGE;
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

  /* ---- Join Now clicks (any element with data-join) ---- */
  document.addEventListener('click', function (e) {
    var j = e.target.closest('[data-join]');
    if (!j) return;
    var p = { location: j.getAttribute('data-join') };
    if (j.getAttribute('data-tier')) p.tier = j.getAttribute('data-tier');
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
    }, { threshold: 0.35 });
    po.observe(pricing);
  }

  /* ---- simulated checkout on tier buttons ---- */
  document.querySelectorAll('[data-checkout]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var tier = btn.getAttribute('data-tier');
      var lbl = btn.textContent;
      btn.setAttribute('data-state', 'loading');
      btn.textContent = 'Opening secure checkout…';
      setTimeout(function () {
        btn.removeAttribute('data-state'); btn.textContent = lbl;
        location.href = 'thank-you.html?tier=' + encodeURIComponent(tier);
      }, 1100);
    });
  });

  /* ---- thank-you page ---- */
  if (PAGE === 'thank-you') {
    var tiers = { basic: ['Basic', '$7.99 / month'], plus: ['Plus', '$17.99 / month'], complete: ['Complete', '$27.99 / month'] };
    var q = (new URLSearchParams(location.search).get('tier') || 'plus').toLowerCase();
    var t = tiers[q] || tiers.plus;
    document.querySelectorAll('[data-ty-tier]').forEach(function (el) { el.textContent = t[0]; });
    document.querySelectorAll('[data-ty-price]').forEach(function (el) { el.textContent = t[1]; });
    // Real site: fire once per Stripe checkout session (dedupe on session_id) after payment succeeds.
    track('registration_complete', { tier: q });
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
      ['join_now_click', 'pricing_view', 'registration_complete'].forEach(function (k) {
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
