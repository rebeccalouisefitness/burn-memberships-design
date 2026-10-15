/* BURN membership upgrade page (/upgrade). ⚠️ PLUMBING: change only with a developer.
 *
 * Opened ONLY from inside the BURN app (secure in-app browser sheet) for members
 * who joined on the website, with ?t=<10-minute signed link>. Shows the confirm
 * sheet from membership-designs.html with the REAL prorated amount from Stripe,
 * charges the card already on file by changing the SAME subscription, then
 * sends her back to the app (burn://membership?upgraded=…), which closes the sheet.
 * Nothing here works without a valid link; there is no card form on this page.
 */
(function () {
  var API = '/api/membership';
  var q = new URLSearchParams(location.search);
  var t = q.get('t') || '';
  var $ = function (s) { return document.querySelector('[' + s + ']'); };
  var state = { pd: null, busy: false, back: 'burn://membership' };

  function money(cents, cur) {
    var v = (Number(cents) || 0) / 100;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(v); }
    catch (e) { return '$' + v.toFixed(2); }
  }
  function show(name) {
    ['data-up-loading', 'data-up-confirm', 'data-up-done', 'data-up-gone'].forEach(function (s) { $(s).hidden = s !== name; });
  }
  function gone(msg) { if (msg) $('data-up-gone-msg').textContent = msg; show('data-up-gone'); }
  function err(msg) { var e = $('data-up-err'); e.textContent = msg; e.hidden = !msg; }
  function done(plan, back) {
    $('data-up-plan-done').textContent = plan;
    if (back) { state.back = back; $('data-up-back').setAttribute('href', back); }
    show('data-up-done');
    /* Back to the app: the in-app sheet closes on this redirect; the app refreshes the tier. */
    setTimeout(function () { location.href = state.back; }, 900);
  }

  if (!t) { gone(); return; }

  fetch(API + '/preview?t=' + encodeURIComponent(t), { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok) { gone(d && d.message); return; }
      if (d.already) { done(d.plan_name, d.return_url); return; }
      state.pd = d.proration_date;
      var per = d.interval === 'year' ? '/year' : '/month';
      $('data-up-plan').textContent = d.plan_name;
      $('data-up-price').textContent = money(d.price_cents, d.currency) + per;
      var period = d.current_billing === 'annual' ? 'year' : 'month';
      var diff = $('data-up-diff');
      diff.textContent = 'You’ll only pay the difference for the rest of this ' + period + ': ';
      var b = document.createElement('b'); b.textContent = money(d.amount_due_cents, d.currency) + ' today.'; diff.appendChild(b);
      if (d.card && d.card.last4) {
        $('data-up-brand').textContent = d.card.wallet === 'apple_pay' ? 'Apple Pay' : d.card.wallet === 'google_pay' ? 'G Pay' : (d.card.brand || 'card');
        $('data-up-last4').textContent = d.card.last4;
      } else {
        $('data-up-card').hidden = true;
      }
      $('data-up-submit').textContent = 'Upgrade to ' + d.plan_name;
      $('data-up-test').hidden = d.mode !== 'test';
      show('data-up-confirm');
    })
    .catch(function () { gone('Something went wrong. Go back to the app and try again.'); });

  $('data-up-submit').addEventListener('click', function () {
    if (state.busy) return;
    state.busy = true; err('');
    var btn = $('data-up-submit'); btn.disabled = true;
    fetch(API + '/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: t, proration_date: state.pd }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) { done(d.plan_name, d.return_url); return; }
        if (d && (d.error === 'link_expired' || d.error === 'no_membership')) { gone(d.message); return; }
        err((d && d.message) || 'That didn’t go through. Nothing was charged.');
        state.busy = false; btn.disabled = false;
      })
      .catch(function () { err('That didn’t go through. Please try again.'); state.busy = false; btn.disabled = false; });
  });

  /* "Change": Stripe's own secure "update payment method" page (billing portal flow),
     then straight back to this same link. No card form on our page. */
  $('data-up-change').addEventListener('click', function () {
    fetch(API + '/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: t }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.ok && d.url) location.href = d.url; else err((d && d.message) || 'Please try again.'); })
      .catch(function () { err('Please try again.'); });
  });
})();
