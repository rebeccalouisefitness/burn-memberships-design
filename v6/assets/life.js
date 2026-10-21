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
    var els = document.querySelectorAll('.sec-head, .pillar, .pillar2, .plan-copy, .plan-card, .quiz2, .ai2, .rw-card, .cphone, .faq-photo, .pb-out, .wcard, .ccard, .tier, .tour-video, .carousel, .pb, .cs-card, .chall-phone, .faq details, .final .copy, .meet-copy, .review-card');
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

  /* Shared data: real BURN workouts, recipes and mindset videos (from the app). Loaded once, on demand. */
  var DATA = null, dataP = null;
  function data() { return dataP || (dataP = fetch('assets/plan-workouts.json').then(function (r) { return r.json(); }).then(function (j) { DATA = j; return j; })); }
  var THUMB = function (id) { return 'https://cdn.jwplayer.com/v2/media/' + id + '/poster.jpg?width=480'; };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function h(str) { var x = 7; for (var i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) % 100003; return x; }
  var SKIP = /pain|stretch|yoga|meditat|mobility|cool ?down|warm ?up/i;

  /* 4. Plan builder: goal, days, time -> a SAMPLE DAY (real workout, recipe and mindset video) */
  var pb = document.querySelector('[data-plan-builder]');
  if (pb) {
    var pick = { goal: 'strong', days: '3', time: '30' };
    pb.querySelectorAll('[data-pb]').forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        g.querySelectorAll('button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        pick[g.getAttribute('data-pb')] = b.getAttribute('data-v');
        if (DATA) build();
      });
    });
    var GOAL = { strong: ['strength', 'weights', 'upper body', 'back', 'arms'], tone: ['sculpt', 'barre', 'glutes', 'core', 'legs', 'pilates', 'lower body'],
      energy: ['cardio', 'cardio & hiit', 'hiit', 'burn', 'full body', 'kickboxing'], habit: ['beginner', 'full body', 'no equipment', 'bodyweight'] };
    var MIND = { strong: 'Raise Your Standards Mindset', tone: 'Vision And Goal Setting Mindset', energy: 'Clarity Mindset', habit: 'Showing Up Mindset' };
    function fits(w, T) { return T <= 10 ? (w.m >= 8 && w.m <= 15) : (w.m >= T - 8 && w.m <= T + 6); }
    function score(w) { if (pick.goal === 'habit' && (w.g.indexOf('advanced') > -1 || /advanced|extreme/i.test(w.t))) return -1; var gs = GOAL[pick.goal]; return w.g.filter(function (t) { return gs.indexOf(t) > -1; }).length; }
    function card(when, kind, img, alt, title, meta) {
      var c = el('article', 'pc-row'); c.appendChild(el('span', 'pc-when', when));
      var im = el('div', 'pc-thumb'); var i = new Image(); i.src = img; i.alt = alt; i.loading = 'lazy'; i.decoding = 'async'; im.appendChild(i); c.appendChild(im);
      var b = el('div', 'pc-body'); b.appendChild(el('span', 'pc-kind', kind)); b.appendChild(el('h4', null, title)); b.appendChild(el('p', null, meta)); c.appendChild(b);
      if (!reduced) c.style.animationDelay = (pb.querySelectorAll('.pc-row').length * 120) + 'ms';
      return c;
    }
    var DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], DAYN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var ON = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 3, 4] };
    var GOALN = { strong: 'Get stronger', tone: 'Tone and sculpt', energy: 'More energy', habit: 'Build a habit' };
    function build() {
      var T = +pick.time, N = +pick.days;
      var pool = DATA.w.filter(function (w) { return !SKIP.test(w.t) && w.g.indexOf('stretch') < 0; });
      var list = pool.filter(function (w) { return fits(w, T); }); var good = list.filter(function (w) { return score(w) > 0; }); if (good.length) list = good;
      if (!list.length) list = pool.slice().sort(function (a, b) { return Math.abs(a.m - T) - Math.abs(b.m - T); });
      list.sort(function (a, b) { return score(b) - score(a) || h(a.t + pick.goal + T + N) - h(b.t + pick.goal + T + N); });
      var w = list[0];
      var recs = DATA.rec.slice();
      if (pick.goal === 'energy') recs.sort(function (a, b) { return (b.meal === 'Breakfast') - (a.meal === 'Breakfast') || a.m - b.m; });
      else if (pick.goal === 'habit') recs.sort(function (a, b) { return a.m - b.m || b.p - a.p; });
      else recs.sort(function (a, b) { return b.p - a.p; });
      var r = recs[h(pick.goal + T) % Math.min(3, recs.length)];
      var mv = DATA.mind.filter(function (x) { return x.t === MIND[pick.goal]; })[0] || DATA.mind[0];
      var on = ON[N] || ON[3];
      var wk = pb.querySelector('[data-pb-week]'); wk.innerHTML = '';
      DAYS.forEach(function (d, k) { var li = el('li', on.indexOf(k) > -1 ? 'on' : null); li.appendChild(el('span', null, d)); li.setAttribute('aria-label', DAYN[k] + (on.indexOf(k) > -1 ? ': workout' : ': rest')); if (!reduced) li.style.animationDelay = (k * 50) + 'ms'; wk.appendChild(li); });
      pb.querySelector('[data-pb-badge]').textContent = N + ' days \u00b7 ' + T + ' min';
      pb.querySelector('[data-pb-sum]').textContent = DAYN[on[0]] + ' \u00b7 ' + GOALN[pick.goal];
      var day = pb.querySelector('[data-pb-day]'); day.innerHTML = '';
      day.appendChild(card('Morning', 'Workout', THUMB(w.id), w.t + ' workout with Rebecca', w.t, w.m + ' min workout'));
      day.appendChild(card(r.meal === 'Breakfast' ? 'Breakfast' : 'Lunch', 'Recipe', 'img/recipes/' + r.k + '.jpg', r.t, r.t, r.m + ' min \u00b7 ' + r.p + 'g protein'));
      day.appendChild(card('Evening', 'Mindset', THUMB(mv.id), mv.t + ' video', mv.t, mv.m + ' min video'));
      pb.querySelector('[data-pb-out]').hidden = false;
    }
    var outEl = pb.querySelector('[data-pb-out]');
    function run(flash) { data().then(function () { build(); if (flash && !reduced) { outEl.classList.remove('flash'); void outEl.offsetWidth; outEl.classList.add('flash'); } }).catch(function () { outEl.querySelector('[data-pb-day]').textContent = 'That didn\u2019t work. Please try again.'; }); }
    pb.querySelector('[data-pb-go]').addEventListener('click', function () { run(true); if (window.innerWidth < 900) outEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
    if (IO) { var io2 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io2.disconnect(); run(false); } }, { rootMargin: '300px' }); io2.observe(pb); } else run(false);
  }

  /* 5. Ask BURN AI: a little live chat demo, built from real BURN content, plays when the card is on screen */
  var chat = document.querySelector('[data-ai-chat]');
  if (chat) {
    var running = false;
    function bubble(cls, txt) { var b = el('div', 'ai-b ' + cls); b.textContent = txt || ''; chat.appendChild(b); while (chat.children.length > 4) chat.removeChild(chat.firstChild); return b; }
    function typeInto(b, txt, done) { if (reduced) { b.textContent = txt; return done(); } var i = 0; (function step() { b.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(step, 18); else done(); })(); }
    function convo() {
      if (!DATA) return;
      var ne = DATA.w.filter(function (x) { return (x.g.indexOf('no equipment') > -1 || x.g.indexOf('bodyweight') > -1) && !SKIP.test(x.t) && x.m <= 22; }).sort(function (a, b) { return Math.abs(a.m - 20) - Math.abs(b.m - 20); });
      var w = ne[0]; if (!w) return;
      var r = DATA.rec.slice().sort(function (a, b) { return b.p - a.p; })[0];
      var script = [
        ['me', 'I’ve only got 20 minutes and no equipment today. What should I do?'],
        ['ai', 'Try ' + w.t + '. It’s ' + w.m + ' minutes and you don’t need any equipment. Want me to add it to today?'],
        ['me', 'Yes please! What should I eat after?'],
        ['ai', r.t + ' is a great one: ' + r.p + 'g of protein, ready in ' + r.m + ' minutes.']
      ];
      var k = 0; chat.innerHTML = '';
      (function next() {
        if (k >= script.length) { setTimeout(function () { running = false; if (visible) start(); }, 6000); return; }
        var line = script[k++];
        if (line[0] === 'me') { bubble('me', line[1]); setTimeout(next, 700); }
        else { var t = bubble('ai typing'); t.innerHTML = '<i></i><i></i><i></i>'; setTimeout(function () { t.className = 'ai-b ai'; typeInto(t, line[1], function () { setTimeout(next, 900); }); }, reduced ? 0 : 1100); }
      })();
    }
    var visible = false;
    function start() { if (running) return; running = true; data().then(convo).catch(function () { running = false; }); }
    if (IO) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.4 }).observe(chat);
    else start();
  }

  /* 6. "Find your perfect workout": tapping a category opens real BURN workouts in it */
  var MAP = { 'full body': ['full body'], legs: ['legs'], arms: ['arms'], core: ['core'], 'lower body': ['lower body'], glutes: ['glutes'], 'upper body': ['upper body'],
    'back & shoulders': ['back', 'shoulders'], strength: ['strength'], weights: ['weights'], 'cardio & hiit': ['cardio', 'cardio & hiit', 'hiit'], stretch: ['stretch'],
    sculpt: ['sculpt'], barre: ['barre'], kickboxing: ['kickboxing'], pilates: ['pilates', 'mat'], yoga: ['yoga'], 'resistance bands': ['bands', 'resistance bands'],
    bands: ['bands', 'resistance bands'], kettlebell: ['kettlebell'], sliders: ['sliders'], beginners: ['beginner'], 'no equipment': ['no equipment', 'bodyweight'] };
  var cards = document.querySelectorAll('.wcard');
  if (cards.length) {
    var dlg;
    function openCat(name) {
      var tags = MAP[name.toLowerCase()] || [name.toLowerCase()];
      data().then(function () {
        var ws = DATA.w.filter(function (w) { return w.g.some(function (t) { return tags.indexOf(t) > -1; }); }).slice(0, 6);
        if (!dlg) {
          dlg = el('div', 'wsheet'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
          dlg.innerHTML = '<div class="ws-back" data-ws-close></div><div class="ws-panel"><button type="button" class="ws-x" aria-label="Close" data-ws-close>&times;</button><h3></h3><div class="ws-list"></div><a class="btn block" href="join.html" data-chooser data-join="workout_sheet">Join BURN to start</a></div>';
          document.body.appendChild(dlg);
          dlg.addEventListener('click', function (e) { if (e.target.closest('[data-ws-close]')) close(); });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg.classList.contains('on')) close(); });
        }
        dlg.querySelector('h3').textContent = name + ' workouts';
        var L = dlg.querySelector('.ws-list'); L.innerHTML = '';
        if (!ws.length) L.appendChild(el('p', 'muted', 'New ' + name.toLowerCase() + ' workouts are on their way.'));
        ws.forEach(function (w) { var r = el('div', 'ws-row'); var i = new Image(); i.src = THUMB(w.id); i.alt = ''; i.loading = 'lazy'; r.appendChild(i); var t = el('div'); t.appendChild(el('b', null, w.t)); t.appendChild(el('span', null, w.m + ' min')); r.appendChild(t); L.appendChild(r); });
        dlg.classList.add('on'); document.documentElement.style.overflow = 'hidden'; dlg.querySelector('.ws-x').focus();
      });
    }
    function close() { dlg.classList.remove('on'); document.documentElement.style.overflow = ''; }
    cards.forEach(function (c) {
      var name = (c.querySelector('h4') || {}).textContent; if (!name) return;
      c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.setAttribute('aria-label', 'See ' + name + ' workouts');
      c.addEventListener('click', function () { openCat(name.replace(/&amp;/g, '&')); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCat(name); } });
    });
  }
})();
