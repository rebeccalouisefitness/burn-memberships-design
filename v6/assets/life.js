/* Part B (Rebecca 20 Oct: "a bit more interactive, things moving around"): scroll-in motion, the app tour
   video, a swipeable/auto-rotating screens carousel and a working plan builder. No layout changes.
   Respects prefers-reduced-motion. Design only - no plumbing. */
(function () {
  'use strict';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IO = 'IntersectionObserver' in window;
  var QS = new URLSearchParams(location.search);
  if (QS.get('review') === '1') document.documentElement.classList.add('review');
  document.querySelectorAll('[data-new-copy]').forEach(function (el) { el.title = 'Changed. Was: ' + el.getAttribute('data-new-copy'); });

  /* 1. Scroll-in reveal */
  if (!reduced && IO) {
    var els = document.querySelectorAll('.sec-head, .pillar, .wcard, .ccard, .tier, .tour-video, .carousel, .pb, .cs-card, .chall-phone, .faq details, .final .copy, .meet-copy, .review-card');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9) return;            /* already on screen at load: leave it alone */
      el.classList.add('rv'); el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el);
    });
  }

  /* 2. App tour video: loads and plays only when on screen */
  var vid = document.querySelector('.tour-vid');
  if (vid) {
    if (reduced || !IO) { vid.setAttribute('controls', ''); }
    else {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { if (vid.preload !== 'auto') { vid.preload = 'auto'; vid.load(); } var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
          else vid.pause();
        });
      }, { threshold: 0.35 }).observe(vid);
    }
  }

  /* 3. Screens carousel: swipe, dots, gentle auto-advance */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('[data-track]'), dotsEl = car.querySelector('[data-dots]');
    var items = [].slice.call(track.children), cur = 0, hold = 0, visible = false;
    var dots = items.map(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', (it.querySelector('figcaption b') || {}).textContent || ('Screen ' + (i + 1)));
      b.addEventListener('click', function () { go(i, true); });
      dotsEl.appendChild(b); return b;
    });
    function mark(i) { cur = i; dots.forEach(function (d, k) { d.classList.toggle('on', k === i); d.setAttribute('aria-selected', k === i ? 'true' : 'false'); }); }
    function go(i, user) {
      if (user) hold = Date.now();
      var it = items[i]; if (!it) return;
      track.scrollTo({ left: it.offsetLeft - track.offsetLeft - (track.clientWidth - it.clientWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
      mark(i);
    }
    var t; track.addEventListener('scroll', function () {
      clearTimeout(t); t = setTimeout(function () {
        var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
        items.forEach(function (it, k) { var c = it.offsetLeft - track.offsetLeft + it.clientWidth / 2, d = Math.abs(c - mid); if (d < bd) { bd = d; best = k; } });
        mark(best);
      }, 80);
    }, { passive: true });
    ['pointerdown', 'touchstart', 'wheel', 'mouseenter', 'focusin'].forEach(function (ev) { car.addEventListener(ev, function () { hold = Date.now(); }, { passive: true }); });
    mark(0);
    if (IO) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(car);
    if (!reduced) setInterval(function () {
      if (!visible || document.hidden || Date.now() - hold < 8000) return;
      if (track.scrollWidth <= track.clientWidth + 4) return;   /* everything already fits: nothing to rotate */
      go((cur + 1) % items.length, false);
    }, 3500);
  });

  /* 4. Plan builder: pick goal, days and time, then see a sample week made of real BURN workouts */
  var pb = document.querySelector('[data-plan-builder]');
  if (pb) {
    var pick = { goal: 'strong', days: '3', time: '30' }, data = null;
    pb.querySelectorAll('[data-pb]').forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        g.querySelectorAll('button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        pick[g.getAttribute('data-pb')] = b.getAttribute('data-v');
        if (!pb.querySelector('[data-pb-out]').hidden) build();
      });
    });
    var GOAL = { strong: ['strength', 'weights', 'upper body', 'back', 'arms'], tone: ['sculpt', 'barre', 'glutes', 'core', 'legs', 'pilates', 'lower body'],
      energy: ['cardio', 'cardio & hiit', 'hiit', 'burn', 'full body', 'kickboxing'], habit: ['beginner', 'full body', 'no equipment', 'bodyweight'] };
    var DAYS = { 2: ['Mon', 'Thu'], 3: ['Mon', 'Wed', 'Fri'], 4: ['Mon', 'Tue', 'Thu', 'Sat'], 5: ['Mon', 'Tue', 'Wed', 'Fri', 'Sat'] };
    var FOCUS = ['legs', 'arms', 'core', 'glutes', 'full body', 'upper body', 'lower body', 'back'];
    function fits(w, T) { return T <= 10 ? w.m <= 15 : (w.m >= T - 8 && w.m <= T + 6); }
    function score(w) { var gs = GOAL[pick.goal]; return w.g.filter(function (t) { return gs.indexOf(t) > -1; }).length; }
    function build() {
      var T = +pick.time, N = +pick.days, list = data.filter(function (w) { return fits(w, T); });
      if (list.length < N) list = data.slice().sort(function (a, b) { return Math.abs(a.m - T) - Math.abs(b.m - T); }).slice(0, 20);
      list.sort(function (a, b) { return score(b) - score(a) || a.t.localeCompare(b.t); });
      var chosen = [], used = {};
      for (var i = 0; i < list.length && chosen.length < N; i++) {      /* vary the focus day to day */
        var f = FOCUS.filter(function (x) { return list[i].g.indexOf(x) > -1; })[0] || 'other';
        if (used[f] && i < list.length - (N - chosen.length)) continue;
        used[f] = 1; chosen.push(list[i]);
      }
      for (i = 0; chosen.length < N && i < list.length; i++) if (chosen.indexOf(list[i]) < 0) chosen.push(list[i]);
      var ol = pb.querySelector('[data-pb-week]'); ol.innerHTML = '';
      chosen.forEach(function (w, k) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="d"></span><span class="w"></span><span class="m"></span>';
        li.children[0].textContent = DAYS[N][k]; li.children[1].textContent = w.t; li.children[2].textContent = w.m + ' min';
        if (!reduced) li.style.animationDelay = k * 90 + 'ms';
        ol.appendChild(li);
      });
      var out = pb.querySelector('[data-pb-out]'); out.hidden = false;
    }
    pb.querySelector('[data-pb-go]').addEventListener('click', function () {
      if (data) return build();
      fetch('assets/plan-workouts.json').then(function (r) { return r.json(); }).then(function (j) { data = j; build(); })
        .catch(function () { var o = pb.querySelector('[data-pb-out]'); o.hidden = false; o.querySelector('[data-pb-week]').innerHTML = '<li>That didn&rsquo;t work. Please try again.</li>'; });
    });
  }
})();
