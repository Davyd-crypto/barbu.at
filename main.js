/* ==========================================================================
   HoldTheCameraa — main.js
   Vanilla, no build step, no dependencies. Classic script so it also runs
   from file:// (ES modules would be blocked by CORS there).

   One rAF loop drives everything: scroll lerp .075, cursor lerp .08, thread
   wobble, parallax. IntersectionObserver handles the four one-shot entrances.
   Section numbers in comments match the brief.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.HTC;
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var MOBILE = window.matchMedia('(max-width: 768px)');
  var COARSE = window.matchMedia('(hover: none)');
  var root = document.documentElement;
  var viewEl = document.getElementById('view');

  /* ======================================================================
     0. UTILITIES
     ====================================================================== */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function qs(s, c) { return (c || document).querySelector(s); }
  function qsa(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* deterministic per-seed randomness so a reload does not reshuffle a page
     halfway through reading it */
  function rnd(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* a hand-drawn underline across a 0-100 box, stroke kept at 1.6px by
     vector-effect so preserveAspectRatio="none" cannot distort it */
  function wobbleUL(seed) {
    var r = rnd(seed), n = 7, d = 'M0 ' + (4 + (r() - .5) * 2).toFixed(2);
    for (var i = 1; i <= n; i++) {
      var x = (100 * i / n), y = 4 + (r() - .5) * 3.4;
      var cx = (100 * (i - .5) / n), cy = 4 + (r() - .5) * 4.6;
      d += ' Q' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ' ' + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return '<svg class="ul" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">' +
           '<path pathLength="1" vector-effect="non-scaling-stroke" d="' + d + '"/></svg>';
  }

  /* a scribbled ellipse, one and three quarter turns, for the contents list */
  function scribble(w, h, seed) {
    var r = rnd(seed), steps = 46, d = '';
    for (var i = 0; i <= steps; i++) {
      var k = i / steps;
      var a = k * Math.PI * 2 * 1.78 - 0.5;
      var g = 1 + k * 0.08;
      var x = w / 2 + Math.cos(a) * (w / 2 - 2) * g * (1 + (r() - .5) * .05);
      var y = h / 2 + Math.sin(a) * (h / 2 - 2) * g * (1 + (r() - .5) * .07);
      d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* every image spot is a picsum seed during development and carries the
     swap comment the brief asks for */
  function plate(seed, alt, path, w, h) {
    return '<!-- swap: ' + path + ' -->\n<img src="https://picsum.photos/seed/' + seed +
           '/' + (w || 1600) + '/' + (h || 900) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async">';
  }

  /* ======================================================================
     7. ONE rAF LOOP
     ====================================================================== */
  var S = { y: 0, ly: 0, prev: 0, vel: 0, vh: 800, vw: 1200, doc: 1, mx: -300, my: -300, cx: -300, cy: -300, t: 0 };
  var tasks = [];         /* live for the whole session */
  var viewTasks = [];     /* torn down on every route change */
  var viewTimers = [], viewCleanups = [], viewRelayout = [];

  function onFrame(fn, scoped) { tasks.push(fn); if (scoped) viewTasks.push(fn); return fn; }

  /* everything a view registered is torn down before the next one renders:
     frame tasks, intervals, layout hooks and any DOM it parked outside #view */
  function dropViewTasks() {
    for (var i = 0; i < viewTasks.length; i++) {
      var k = tasks.indexOf(viewTasks[i]);
      if (k > -1) tasks.splice(k, 1);
    }
    viewTasks.length = 0;
    for (var t = 0; t < viewTimers.length; t++) clearInterval(viewTimers[t]);
    viewTimers.length = 0;
    for (var c = 0; c < viewCleanups.length; c++) { try { viewCleanups[c](); } catch (e) {} }
    viewCleanups.length = 0;
    viewRelayout.length = 0;
  }

  function measure() {
    S.vh = window.innerHeight;
    S.vw = window.innerWidth;
    S.doc = Math.max(1, document.documentElement.scrollHeight - S.vh);
  }

  function frame(now) {
    S.t = now / 1000;
    S.y = window.pageYOffset || root.scrollTop || 0;
    S.vel = S.y - S.prev;
    S.prev = S.y;
    S.ly = lerp(S.ly, S.y, 0.075);
    S.cx = lerp(S.cx, S.mx, 0.08);
    S.cy = lerp(S.cy, S.my, 0.08);
    for (var i = 0; i < tasks.length; i++) tasks[i](S);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', function () { measure(); relayout(); }, { passive: true });
  var relayoutFns = [];
  function relayout() {
    for (var i = 0; i < relayoutFns.length; i++) relayoutFns[i]();
    for (var j = 0; j < viewRelayout.length; j++) viewRelayout[j]();
  }

  document.addEventListener('pointermove', function (e) { S.mx = e.clientX; S.my = e.clientY; }, { passive: true });

  /* ======================================================================
     8. REVEAL — one-shot entrances only, and only for 6.4, 6.5, 6.7, 6.10
     ====================================================================== */
  var observers = [];
  function reveal(el, cb) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-in'); if (cb) cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        if (cb) cb(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    io.observe(el);
    observers.push(io);
  }
  function dropObservers() {
    for (var i = 0; i < observers.length; i++) observers[i].disconnect();
    observers.length = 0;
  }

  /* ======================================================================
     6.1 BOOT SEQUENCE — once per session
     ====================================================================== */
  function boot(done) {
    var b = document.getElementById('boot');
    var seen = false;
    try { seen = sessionStorage.getItem('htc.boot') === '1'; } catch (e) { seen = false; }

    if (seen || RM.matches) { b.classList.add('is-gone'); done(); return; }
    try { sessionStorage.setItem('htc.boot', '1'); } catch (e) {}

    var count = document.getElementById('boot-count');
    var dot = document.getElementById('boot-dot');
    var circles = qsa('circle', b), lines = qsa('line', b);

    lines.forEach(function (l, i) {
      l.style.transition = 'stroke-dashoffset 500ms linear ' + (60 + i * 90) + 'ms';
    });
    circles.forEach(function (c, i) {
      c.style.transition = 'stroke-dashoffset 420ms cubic-bezier(.16,1,.3,1) ' + (120 + i * 320) + 'ms';
    });
    requestAnimationFrame(function () {
      circles.forEach(function (c) { c.style.strokeDashoffset = '0'; });
      lines.forEach(function (l) { l.style.strokeDashoffset = '0'; });
    });

    var t0 = 0, DUR = 1500;
    function tick(now) {
      if (!t0) t0 = now;
      var p = clamp((now - t0) / DUR, 0, 1);
      count.textContent = pad2(Math.round(p * 100)).length < 3
        ? ('00' + Math.round(p * 100)).slice(-3)
        : String(Math.round(p * 100));
      if (p < 1) { requestAnimationFrame(tick); return; }
      dot.classList.add('is-bloom');
      setTimeout(function () {
        b.classList.add('is-lifting');
        setTimeout(function () { b.classList.add('is-gone'); }, 940);
      }, 300);
      done();
    }
    requestAnimationFrame(tick);
  }

  /* ======================================================================
     7.2 CURSOR — one object. 44px exclusion circle on the hero, 8px
     difference dot with a mono label everywhere else. Snaps to small
     interactive targets within 40px.
     ====================================================================== */
  var cursor = {
    el: document.getElementById('cursor'),
    ring: document.getElementById('cursor-ring'),
    label: document.getElementById('cursor-label'),
    hot: null, snap: null, heroPlate: null, heroSub: null
  };

  function initCursor() {
    if (COARSE.matches || MOBILE.matches) { root.classList.add('no-cursor'); return; }

    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor], a[href], button, [tabindex="0"]') : null;
      cursor.hot = t;
      if (!t) { cursor.el.classList.remove('has-label', 'is-snapped'); cursor.snap = null; return; }

      var lbl = t.getAttribute('data-cursor');
      if (!lbl) lbl = t.tagName === 'BUTTON' ? 'PRESS' : (t.tagName === 'A' ? 'VIEW' : 'LOOK');
      cursor.label.textContent = lbl;
      cursor.el.classList.add('has-label');

      /* 40px snap, but only for objects small enough that being pulled to
         their centre reads as magnetism rather than teleporting */
      var r = t.getBoundingClientRect();
      cursor.snap = (r.width < 300 && r.height < 150) ? t : null;
      cursor.el.classList.toggle('is-snapped', !!cursor.snap);
    }, true);

    document.addEventListener('pointerout', function (e) {
      if (e.relatedTarget) return;
      cursor.el.classList.remove('has-label', 'is-snapped');
      cursor.hot = null; cursor.snap = null;
    }, true);

    onFrame(function (s) {
      var x = s.cx, y = s.cy;
      if (cursor.snap && document.contains(cursor.snap)) {
        var r = cursor.snap.getBoundingClientRect();
        var ccx = r.left + r.width / 2, ccy = r.top + r.height / 2;
        var dx = ccx - s.mx, dy = ccy - s.my;
        var near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 40;
        if (near) { x = lerp(x, ccx, 0.35); y = lerp(y, ccy, 0.35); }
      }
      cursor.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';

      /* hero states */
      if (cursor.heroPlate) {
        var hr = cursor.heroPlate.getBoundingClientRect();
        var over = s.my > hr.top && s.my < hr.bottom && s.mx > hr.left && s.mx < hr.right;
        cursor.el.classList.toggle('is-hero', over);
        if (over && cursor.heroSub) {
          var sr = cursor.heroSub.getBoundingClientRect();
          cursor.el.classList.toggle('is-wide',
            s.my > sr.top - 26 && s.my < sr.bottom + 26 && s.mx > sr.left && s.mx < sr.right);
        } else {
          cursor.el.classList.remove('is-wide');
        }
      } else {
        cursor.el.classList.remove('is-hero', 'is-wide');
      }
    });
  }

  /* ======================================================================
     7.12 SCROLL READOUT — 1px right-edge rule and a running timecode.
     The page is treated as a two minute reel at 24fps.
     ====================================================================== */
  var REEL_FRAMES = 24 * 120;
  function timecode(frames) {
    var f = Math.round(frames);
    return pad2(Math.floor(f / 86400)) + ':' + pad2(Math.floor(f / 1440) % 60) + ':' +
           pad2(Math.floor(f / 24) % 60) + ':' + pad2(f % 24);
  }
  function initReadout() {
    var bar = document.getElementById('readout-bar');
    var tc = document.getElementById('readout-tc');
    var lastTc = '';
    onFrame(function (s) {
      var p = clamp(s.ly / s.doc, 0, 1);
      bar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      var t = timecode(p * REEL_FRAMES);
      if (t !== lastTc) { tc.textContent = t; lastTc = t; }
    });
  }

  /* ======================================================================
     7.11 ROUTE CURTAIN — a flare panel wipes across behind a torn-paper
     clip-path, 1100ms total, with a frame counter running during the wipe.
     ====================================================================== */
  function tornClip(seed) {
    var r = rnd(seed), n = 26, pts = [];
    for (var i = 0; i <= n; i++) pts.push((r() * 3.4).toFixed(2) + '% ' + (i / n * 100).toFixed(2) + '%');
    pts.push('100% 100%', '100% 0%');
    return 'polygon(' + pts.join(',') + ')';
  }

  var curtainSeed = 7;
  function wipe(swap) {
    var c = document.getElementById('curtain');
    var panel = document.getElementById('curtain-panel');
    var tcEl = document.getElementById('curtain-tc');

    if (RM.matches) { swap(); return; }

    panel.style.clipPath = tornClip(curtainSeed += 13);
    c.classList.remove('is-clear');
    void panel.offsetWidth;
    c.classList.add('is-cover');

    var t0 = performance.now(), running = true;
    (function count(now) {
      if (!running) return;
      tcEl.textContent = timecode(Math.min(26, (now - t0) / 1000 * 24));
      requestAnimationFrame(count);
    })(t0);

    setTimeout(function () {
      swap();
      c.classList.remove('is-cover');
      c.classList.add('is-clear');
      setTimeout(function () { running = false; c.classList.remove('is-clear'); }, 560);
    }, 550);
  }

  /* ======================================================================
     5. ROUTER — #/ · #/work/:slug · #/stills · #/about · #/contact
     A trailing !anchor (#/!prints) deep links a chapter of the index.
     ====================================================================== */
  function bySlug(s) {
    for (var i = 0; i < D.projects.length; i++) if (D.projects[i].slug === s) return D.projects[i];
    return null;
  }

  function parseHash() {
    var h = location.hash.replace(/^#/, '') || '/';
    var anchor = '';
    var bang = h.indexOf('!');
    if (bang > -1) { anchor = h.slice(bang + 1); h = h.slice(0, bang); }
    if (h.length > 1 && h.charAt(h.length - 1) === '/') h = h.slice(0, -1);

    if (h === '/stills') return { view: 'stills' };
    if (h === '/about') return { view: 'about' };
    if (h === '/contact') return { view: 'contact' };
    var m = /^\/work\/([a-z0-9-]+)$/.exec(h);
    if (m) { var p = bySlug(m[1]); if (p) return { view: 'work', project: p }; }
    return { view: 'home', anchor: anchor };
  }

  var current = null, booted = false;

  function titleFor(r) {
    if (r.view === 'work') return r.project.title + ' — HoldTheCameraa';
    if (r.view === 'stills') return 'Photography — HoldTheCameraa';
    if (r.view === 'about') return 'Dossier — HoldTheCameraa';
    if (r.view === 'contact') return 'Contact — HoldTheCameraa';
    return 'HoldTheCameraa — film direction, videography, photography';
  }

  function markNav(r) {
    qsa('.nav a').forEach(function (a) {
      var k = a.getAttribute('data-nav');
      var on = (k === r.view) || (r.view === 'work' && k === 'home');
      a.classList.toggle('is-active', on);
      a.classList.toggle('is-drawn', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function scrollToAnchor(id) {
    var t = document.getElementById(id);
    if (!t) { window.scrollTo(0, 0); return; }
    t.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
  }

  function renderView(r) {
    dropViewTasks();
    dropObservers();
    cursor.heroPlate = null;
    cursor.heroSub = null;

    var tpl = document.getElementById('t-' + r.view);
    viewEl.replaceChildren(tpl.content.cloneNode(true));

    root.setAttribute('data-route', r.view);
    root.setAttribute('data-chapter', r.view === 'contact' ? 'brick' : 'ink');
    document.title = titleFor(r);
    markNav(r);

    hydrate[r.view](r);
    bindView();
    measure();

    if (r.anchor) { window.scrollTo(0, 0); setTimeout(function () { scrollToAnchor(r.anchor); }, 60); }
    else window.scrollTo(0, 0);

    if (booted) viewEl.focus({ preventScroll: true });
    current = r;
  }

  function onHash() {
    var r = parseHash();
    var same = current && current.view === r.view &&
      (r.view !== 'work' || (current.project && current.project.slug === r.project.slug));
    if (same) {
      if (r.anchor) scrollToAnchor(r.anchor);
      else window.scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
      return;
    }
    wipe(function () { renderView(r); });
  }

  /* ======================================================================
     6.2 MASTHEAD — hand-drawn nav underlines, regenerated on resize so the
     wobble never stretches oddly
     ====================================================================== */
  function drawNavUnderlines() {
    qsa('.nav a, .plate__nav a').forEach(function (a, i) {
      var old = qs('.ul', a);
      if (old) old.remove();
      a.insertAdjacentHTML('beforeend', wobbleUL(101 + i * 7));
    });
  }

  /* ======================================================================
     BUILDERS shared by several views
     ====================================================================== */
  function ledgerHTML(credits) {
    return credits.map(function (c, i) {
      return '<div class="lrow" style="--i:' + i + '">' +
        '<dt>' + esc(c[0]) + '<i class="lead" aria-hidden="true"></i></dt>' +
        '<dd><span class="nm">' + esc(c[1]) + '</span>' +
        '<span class="hn" aria-hidden="true">' + esc(c[1]) + '</span></dd>' +
        '</div>';
    }).join('');
  }

  function frameHTML(seed, alt, cls, path) {
    return '<figure class="frame ' + cls + '" tabindex="0">' +
      plate(seed, alt, path) +
      '<figcaption class="frame__cap">' + esc(alt) + '</figcaption></figure>';
  }

  /* ======================================================================
     VIEW HYDRATORS
     ====================================================================== */
  var hydrate = {};

  /* ---------------------------------------------------------------- home */
  hydrate.home = function () {
    var p0 = D.projects[0];

    /* 6.4 */
    qs('[data-mount="ledger"]').innerHTML = ledgerHTML(p0.credits);

    /* 6.5 */
    qs('[data-mount="widx"]').innerHTML = D.projects.map(function (p, i) {
      return '<li class="widx__item" style="--i:' + i + '">' +
        '<a class="widx__a" href="#/work/' + p.slug + '" data-cursor="OPEN" data-slug="' + p.slug + '">' +
          '<span class="widx__n">' + ('0' + (i + 1)) + '</span>' +
          '<span class="widx__t">' + esc(p.title) + '</span>' +
          '<span class="widx__meta"><span>' + esc(p.client) + '</span><i>' + p.year + '</i>' +
            '<span>' + esc(p.role) + '</span></span>' +
          '<!-- swap: /assets/work/' + p.slug + '.jpg -->' +
          '<img class="widx__mob" src="https://picsum.photos/seed/' + p.slug + '-01/1200/750" alt="" loading="lazy" decoding="async">' +
        '</a></li>';
    }).join('');

    /* 4.2 stray pen marks and dust, seeded per page load (ref 8) */
    paperMarks(qs('.widx'));

    /* 6.8 */
    qsa('[data-collage]').forEach(function (el) {
      el.textContent = D.collage[+el.getAttribute('data-collage')] || '';
    });

    /* 6.6 — nine plates, unequal, three columns */
    var picks = [
      [0, 0, 'frame--t'], [1, 2, 'frame--w'], [2, 4, 'frame--s'],
      [3, 1, 'frame--w'], [4, 5, 'frame--t'], [5, 8, 'frame--x'],
      [0, 6, 'frame--s'], [2, 7, 'frame--t'], [5, 3, 'frame--w']
    ];
    var cols = ['', '', ''];
    picks.forEach(function (pk, i) {
      var pr = D.projects[pk[0]];
      var seed = pr.slug + '-' + ('0' + (pk[1] + 1)).slice(-2);
      cols[i % 3] += frameHTML(seed, pr.stills[pk[1]], pk[2], '/assets/stills/' + seed + '.jpg');
    });
    for (var c = 0; c < 3; c++) qs('[data-mount="grid-' + c + '"]').innerHTML = cols[c];

    /* 7.13 */
    buildMarquee();

    /* 6.7 */
    buildPrints();
  };

  /* ---------------------------------------------------------------- work */
  hydrate.work = function (r) {
    var p = r.project;
    var img = qs('[data-case-hero]');
    img.src = 'https://picsum.photos/seed/' + p.slug + '-hero/1600/900';
    img.alt = p.stills[0];
    qs('[data-case-kicker]').textContent = p.client + '  /  ' + p.year;
    qs('[data-case-title]').textContent = p.title;
    qs('[data-case-logline]').textContent = p.logline;
    qs('[data-case-format]').textContent = p.format;
    qs('[data-case-role]').textContent = 'role: ' + p.role;
    qs('[data-mount="ledger"]').innerHTML = ledgerHTML(p.credits);

    var cls = ['frame--w', 'frame--t', 'frame--s', 'frame--s', 'frame--w', 'frame--t', 'frame--t', 'frame--w', 'frame--s'];
    qs('[data-mount="plates"]').innerHTML = p.stills.map(function (alt, i) {
      var seed = p.slug + '-' + ('0' + (i + 1)).slice(-2);
      return frameHTML(seed, alt, cls[i], '/assets/work/' + p.slug + '/' + ('0' + (i + 1)).slice(-2) + '.jpg');
    }).join('');

    var idx = D.projects.indexOf(p);
    var nx = D.projects[(idx + 1) % D.projects.length];
    var a = qs('[data-mount="next"]');
    a.href = '#/work/' + nx.slug;
    a.innerHTML =
      '<span class="nextp__l lbl">next film</span>' +
      '<span class="nextp__t">' + esc(nx.title) + '</span>' +
      '<span class="nextp__im"><!-- swap: /assets/work/' + nx.slug + '.jpg -->' +
      '<img src="https://picsum.photos/seed/' + nx.slug + '-hero/800/500" alt="" loading="lazy" decoding="async"></span>';
  };

  /* -------------------------------------------------------------- stills */
  hydrate.stills = function () {
    var years = [];
    D.stills.forEach(function (s) { if (years.indexOf(s.y) < 0) years.push(s.y); });
    years.sort(function (a, b) { return b - a; });

    qs('[data-mount="chips"]').innerHTML =
      '<button class="chip" type="button" data-year="all" aria-pressed="true" data-cursor="FILTER">all</button>' +
      years.map(function (y) {
        return '<button class="chip" type="button" data-year="' + y + '" aria-pressed="false" data-cursor="FILTER">' + y + '</button>';
      }).join('');

    qs('[data-mount="masonry"]').innerHTML = D.stills.map(function (s, i) {
      var seed = 'htc-still-' + ('0' + (i + 1)).slice(-2);
      var h = [900, 1200, 1400, 1000][i % 4];
      return '<figure class="frame" tabindex="0" data-year="' + s.y + '">' +
        '<!-- swap: /assets/stills/' + seed + '.jpg -->' +
        '<img src="https://picsum.photos/seed/' + seed + '/1100/' + h + '" alt="' + esc(s.a) + '" loading="lazy" decoding="async">' +
        '<figcaption class="frame__cap">' + s.y + ' &nbsp; ' + esc(s.a) + '</figcaption></figure>';
    }).join('');
  };

  /* --------------------------------------------------------------- about */
  hydrate.about = function () {
    var A = D.about;
    qs('[data-about-name]').textContent = A.name;
    qs('[data-about-strip]').textContent = A.strip;
    qs('[data-about-sig]').textContent = A.signature;
    qs('[data-mount="about-body"]').innerHTML = A.body.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');

    var ARROW = {
      down: { style: 'left:-4px; top:100%;', box: '0 0 120 74', d: 'M6 4 C10 34 34 56 96 60', h: 'M96 60 L80 52 M96 60 L84 70' },
      up:   { style: 'left:14px; bottom:100%;', box: '0 0 120 74', d: 'M4 70 C8 38 34 12 104 8', h: 'M104 8 L88 3 M104 8 L90 18' },
      left: { style: 'right:100%; top:2px;', box: '0 0 130 64', d: 'M126 8 C90 8 46 22 8 44', h: 'M8 44 L24 40 M8 44 L20 56' }
    };
    qs('[data-mount="notes"]').innerHTML = A.notes.map(function (n, i) {
      var ar = ARROW[n.arrow];
      return '<span class="note" style="left:' + n.x + '%; top:' + n.y + '%; transform:rotate(' + n.rot + 'deg); transition-delay:' + (i * 90) + 'ms">' +
        esc(n.text) +
        '<svg viewBox="' + ar.box + '" style="' + ar.style + ' width:' + ar.box.split(' ')[2] + 'px; height:' + ar.box.split(' ')[3] + 'px;" aria-hidden="true">' +
        '<path pathLength="1" d="' + ar.d + '"/><path pathLength="1" d="' + ar.h + '"/></svg></span>';
    }).join('');

    qs('[data-mount="contents"]').innerHTML = A.contents.map(function (c, i) {
      return '<li><a href="' + c[2] + '" data-cursor="GO">' +
        '<span class="no">' + c[0] +
        '<svg viewBox="0 0 46 40" aria-hidden="true"><path pathLength="1" d="' + scribble(46, 40, 31 + i * 5) + '"/></svg>' +
        '</span><span class="tx">' + esc(c[1]) + '</span></a></li>';
    }).join('');
  };

  /* ------------------------------------------------------------- contact */
  hydrate.contact = function () {
    qs('[data-mount="links"]').innerHTML = D.links.map(function (l) {
      var ext = l.href.indexOf('http') === 0;
      return '<li><a href="' + l.href + '" data-cursor="' + (l.label === 'EMAIL' ? 'WRITE' : 'OPEN') + '"' +
        (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.label) + '</a></li>';
    }).join('');

    qsa('.links a').forEach(function (a, i) { a.insertAdjacentHTML('beforeend', wobbleUL(211 + i * 11)); });

    /* orange film datestamp, ref 10, in 'YY M D format */
    var d = new Date();
    qs('#pc-date').textContent = "'" + String(d.getFullYear()).slice(-2) + ' ' + (d.getMonth() + 1) + ' ' + pad2(d.getDate());
  };

  /* ======================================================================
     4.2 PAPER FIELD — 30 stray pen marks and dust specks, seeded per page
     load, scattered over the work index chapter (ref 8)
     ====================================================================== */
  var PAGE_SEED = 4242;
  try { PAGE_SEED = Date.now() % 99991; } catch (e) {}

  function paperMarks(sec) {
    if (!sec) return;
    var r = rnd(PAGE_SEED + 17), out = '';
    for (var i = 0; i < 30; i++) {
      var x = (r() * 98).toFixed(2), y = (r() * 98).toFixed(2);
      var rot = (r() * 360).toFixed(0), sc = (0.5 + r() * 1.7).toFixed(2);
      var op = (0.16 + r() * 0.4).toFixed(2);
      var kind = Math.floor(r() * 4), body;
      if (kind === 0) body = '<path d="M0 7 C4 2 10 9 17 3" fill="none" stroke="#1B1B1B" stroke-width="1" stroke-linecap="round"/>';
      else if (kind === 1) body = '<circle cx="4" cy="5" r="1.2" fill="#1B1B1B"/><circle cx="11" cy="8" r=".7" fill="#1B1B1B"/>';
      else if (kind === 2) body = '<path d="M0 1 L16 10" fill="none" stroke="#1B1B1B" stroke-width=".7"/>';
      else body = '<path d="M2 11 L7 1 L12 11" fill="none" stroke="#1B1B1B" stroke-width=".9" stroke-linecap="round"/>';
      out += '<svg viewBox="0 0 20 12" aria-hidden="true" style="position:absolute;left:' + x + '%;top:' + y +
             '%;width:22px;height:13px;overflow:visible;opacity:' + op +
             ';transform:rotate(' + rot + 'deg) scale(' + sc + ')">' + body + '</svg>';
    }
    var box = document.createElement('div');
    box.className = 'widx__marks';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = out;
    sec.appendChild(box);
  }

  /* ======================================================================
     6.3 HERO — scrub the plate open, cycle the burned-in subtitle on a hard
     cut. No crossfade, ever.
     ====================================================================== */
  function heroBind() {
    var hero = qs('.hero'), pl = qs('.hero__plate'), sub = qs('#hero-sub');
    if (!hero || !pl) return;
    cursor.heroPlate = pl;
    cursor.heroSub = sub;

    if (sub) {
      sub.textContent = D.subtitles[0];
      if (!RM.matches) {
        var i = 0;
        viewTimers.push(setInterval(function () {
          i = (i + 1) % D.subtitles.length;
          sub.textContent = D.subtitles[i];
        }, 4200));
      }
    }

    if (RM.matches) { pl.style.transform = 'none'; pl.style.clipPath = 'inset(0)'; return; }
    onFrame(function (s) {
      var p = clamp(s.ly / (s.vh * 0.85), 0, 1);
      pl.style.transform = 'scale(' + (1.06 - 0.06 * p).toFixed(4) + ')';
      pl.style.clipPath = 'inset(' + (10 - 10 * p).toFixed(2) + '% ' + (6 - 6 * p).toFixed(2) + '%)';
      hero.classList.toggle('is-scrolled', s.y > 40);
    }, true);
  }

  /* ======================================================================
     6.5 THREAD WEB — one cubic bezier per hovered title, 90ms delay before
     the thumbnail lands, 6px sine wobble, 600ms decay, four alive at most.
     ====================================================================== */
  function threadsBind() {
    if (MOBILE.matches || COARSE.matches) return;
    var layer = document.getElementById('threads');
    var thumbs = document.getElementById('thumbs');
    var items = qsa('.widx__a');
    if (!items.length) return;

    var live = [];
    function find(a) { for (var i = 0; i < live.length; i++) if (live[i].a === a) return live[i]; return null; }
    function kill(th) { th.path.remove(); th.thumb.remove(); var k = live.indexOf(th); if (k > -1) live.splice(k, 1); }

    function make(a) {
      var slug = a.getAttribute('data-slug');
      var path = mk('path', {});
      layer.appendChild(path);
      var t = document.createElement('div');
      t.className = 'thumb';
      t.innerHTML = '<!-- swap: /assets/work/' + slug + '.jpg -->' +
        '<img src="https://picsum.photos/seed/' + slug + '-thumb/660/414" alt="" decoding="async">';
      var x = clamp(S.mx + 42, 16, S.vw - 240);
      var y = clamp(S.my - 70, 74, S.vh - 156);
      t.style.left = x + 'px'; t.style.top = y + 'px';
      thumbs.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('is-on'); });
      return { a: a, path: path, thumb: t, x: x, y: y, dying: 0 };
    }

    items.forEach(function (a) {
      var timer = null;
      a.addEventListener('pointerenter', function () {
        var e = find(a);
        if (e) { e.dying = 0; e.path.removeAttribute('opacity'); e.thumb.classList.add('is-on'); return; }
        timer = setTimeout(function () {
          if (live.length >= 4) kill(live[0]);
          live.push(make(a));
        }, 90);
      });
      a.addEventListener('pointerleave', function () {
        if (timer) { clearTimeout(timer); timer = null; }
        var e = find(a);
        if (e && !e.dying) { e.dying = performance.now(); e.thumb.classList.remove('is-on'); }
      });
    });

    onFrame(function (s) {
      var now = performance.now();
      for (var i = live.length - 1; i >= 0; i--) {
        var th = live[i];
        var t = th.a.querySelector('.widx__t') || th.a;
        var r = t.getBoundingClientRect();
        var x0 = clamp(r.right + 10, 0, s.vw), y0 = r.top + r.height * 0.5;
        var x1 = th.x, y1 = th.y + 69;
        var dx = x1 - x0;
        var w = RM.matches ? 0 : Math.sin(s.t * 2 + i * 1.7) * 6;
        var d = 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) +
          ' C' + (x0 + dx * 0.42).toFixed(1) + ' ' + (y0 + w).toFixed(1) +
          ' ' + (x1 - dx * 0.42).toFixed(1) + ' ' + (y1 - w).toFixed(1) +
          ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
        th.path.setAttribute('d', d);
        if (th.dying) {
          var k = clamp((now - th.dying) / 600, 0, 1);
          th.path.setAttribute('opacity', (1 - k).toFixed(3));
          if (k >= 1) kill(th);
        }
      }
    }, true);

    viewCleanups.push(function () {
      while (live.length) kill(live[0]);
      layer.textContent = '';
      thumbs.textContent = '';
    });
  }

  /* ======================================================================
     6.6 COLUMN PARALLAX
     ====================================================================== */
  function parallaxBind() {
    var cols = qsa('[data-par]');
    if (!cols.length || MOBILE.matches || RM.matches) return;
    var base = [];
    function calc() {
      base = cols.map(function (c) {
        return c.getBoundingClientRect().top + (window.pageYOffset || 0) - S.vh;
      });
    }
    calc();
    viewRelayout.push(calc);
    onFrame(function (s) {
      for (var i = 0; i < cols.length; i++) {
        var f = parseFloat(cols[i].getAttribute('data-par')) || 0;
        cols[i].style.transform = 'translate3d(0,' + ((s.ly - base[i]) * f).toFixed(1) + 'px,0)';
      }
    }, true);
  }

  /* ======================================================================
     6.7 PRINT STACK — six prints, drag with inertia (decay .92), grabbed
     print promoted and squared up, arrow keys move by 12px.
     ====================================================================== */
  var PRINTS = [
    { seed: 'nord-09',        alt: 'the road out of town at dusk',              fx: .10, fy: .05, rot: -7, cls: '' },
    { seed: 'sase-dimineata-03', alt: 'steam on the window above the sink',     fx: .33, fy: .21, rot: 5,  cls: 'print--wide' },
    { seed: 'fabrica-14-05',  alt: 'gloves left on a bench, still shaped like hands', fx: .57, fy: .03, rot: -3, cls: '' },
    { seed: 'iarna-la-doi-06', alt: 'a cigarette shared on the landing',        fx: .80, fy: .20, rot: 8,  cls: '' },
    { seed: 'apa-mare-08',    alt: 'the crew on the pontoon at five in the morning', fx: .36, fy: .52, rot: -5, cls: 'print--wide' },
    { seed: 'pe-drum-04',     alt: 'hands winding a cassette back with a pen',  fx: .67, fy: .49, rot: 3,  cls: '' }
  ];

  function buildPrints() {
    var stage = qs('[data-mount="prints"]');
    if (!stage) return;
    var html = PRINTS.map(function (p, i) {
      return '<div class="print ' + p.cls + '" style="--rot:' + p.rot + 'deg;--i:' + i + '" tabindex="0" role="group" ' +
        'data-cursor="DRAG" data-fx="' + p.fx + '" data-fy="' + p.fy + '" ' +
        'aria-label="Print ' + (i + 1) + ' of 6: ' + esc(p.alt) + '. Use the arrow keys to move it.">' +
        '<div class="print__card">' +
        plate(p.seed, p.alt, '/assets/prints/' + p.seed + '.jpg', 900, 1125) +
        '<span class="print__cap">' + esc(p.alt) + '</span>' +
        '</div></div>';
    }).join('');
    stage.insertAdjacentHTML('afterbegin', html);
  }

  function printsBind() {
    var stage = qs('.prints__stage');
    if (!stage) return;
    var els = qsa('.print', stage);
    if (!els.length) return;

    if (MOBILE.matches) { els.forEach(function (el) { el.style.transform = ''; }); return; }

    var zTop = 10, dealt = false;
    var items = els.map(function (el) {
      return { el: el, bx: 0, by: 0, x: 0, y: 0, vx: 0, vy: 0, drag: false, px: 0, py: 0 };
    });

    function layout() {
      var sr = stage.getBoundingClientRect();
      items.forEach(function (o) {
        var w = o.el.offsetWidth, h = o.el.offsetHeight;
        o.bx = parseFloat(o.el.getAttribute('data-fx')) * Math.max(0, sr.width - w);
        o.by = parseFloat(o.el.getAttribute('data-fy')) * Math.max(0, sr.height - h);
        apply(o);
      });
    }
    function apply(o) {
      var dy = dealt ? 0 : 300;
      o.el.style.transform = 'translate3d(' + (o.bx + o.x).toFixed(1) + 'px,' + (o.by + o.y + dy).toFixed(1) + 'px,0)';
    }
    function bound(o) {
      var sr = stage.getBoundingClientRect();
      var w = o.el.offsetWidth, h = o.el.offsetHeight;
      var minX = -o.bx - 30, maxX = sr.width - w - o.bx + 30;
      var minY = -o.by - 30, maxY = sr.height - h - o.by + 40;
      if (o.x < minX) { o.x = minX; o.vx *= -.3; }
      if (o.x > maxX) { o.x = maxX; o.vx *= -.3; }
      if (o.y < minY) { o.y = minY; o.vy *= -.3; }
      if (o.y > maxY) { o.y = maxY; o.vy *= -.3; }
    }

    items.forEach(function (o) {
      var el = o.el;
      el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        o.drag = true; o.px = e.clientX; o.py = e.clientY; o.vx = 0; o.vy = 0;
        el.classList.add('is-grabbed');
        el.style.zIndex = ++zTop;
      });
      el.addEventListener('pointermove', function (e) {
        if (!o.drag) return;
        var dx = e.clientX - o.px, dy = e.clientY - o.py;
        o.px = e.clientX; o.py = e.clientY;
        o.x += dx; o.y += dy; o.vx = dx; o.vy = dy;
        bound(o); apply(o);
      });
      function release() { o.drag = false; el.classList.remove('is-grabbed'); }
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);

      /* keyboard path */
      el.addEventListener('keydown', function (e) {
        var k = e.key, step = 12, moved = true;
        if (k === 'ArrowLeft') o.x -= step;
        else if (k === 'ArrowRight') o.x += step;
        else if (k === 'ArrowUp') o.y -= step;
        else if (k === 'ArrowDown') o.y += step;
        else moved = false;
        if (!moved) return;
        e.preventDefault();
        el.style.zIndex = ++zTop;
        bound(o); apply(o);
      });
    });

    onFrame(function () {
      for (var i = 0; i < items.length; i++) {
        var o = items[i];
        if (o.drag) continue;
        if (Math.abs(o.vx) < 0.08 && Math.abs(o.vy) < 0.08) { o.vx = 0; o.vy = 0; continue; }
        o.x += o.vx; o.y += o.vy;
        o.vx *= 0.92; o.vy *= 0.92;
        bound(o); apply(o);
      }
    }, true);

    layout();
    viewRelayout.push(layout);

    /* 6.7 entrance: the prints deal onto the stack, once */
    reveal(stage, function () {
      if (RM.matches) { dealt = true; layout(); return; }
      items.forEach(function (o) { o.el.classList.add('is-dealing'); });
      dealt = true;
      requestAnimationFrame(function () { items.forEach(apply); });
      setTimeout(function () { items.forEach(function (o) { o.el.classList.remove('is-dealing'); }); }, 1500);
    });
  }

  /* ======================================================================
     6.8 COLLAGE TILT — perspective 900px on the stage, layers rotate up to
     6deg and translate by depth
     ====================================================================== */
  function collageBind() {
    var stage = qs('[data-tilt]');
    if (!stage || MOBILE.matches || RM.matches) return;
    var layers = qsa('.collage__stage > *');
    var tx = 0, ty = 0, cx = 0, cy = 0;
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 2;
      ty = ((e.clientY - r.top) / r.height - .5) * 2;
    });
    stage.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    onFrame(function () {
      cx = lerp(cx, tx, .08); cy = lerp(cy, ty, .08);
      for (var i = 0; i < layers.length; i++) {
        var l = layers[i], d = parseFloat(l.getAttribute('data-depth')) || 1;
        l.style.setProperty('--ry', (cx * 6).toFixed(2) + 'deg');
        l.style.setProperty('--rx', (-cy * 6).toFixed(2) + 'deg');
        l.style.setProperty('--tx', (cx * d * 9).toFixed(1) + 'px');
        l.style.setProperty('--ty', (cy * d * 7).toFixed(1) + 'px');
      }
    }, true);
  }

  /* ======================================================================
     6.8 CHAPTER INVERSION — the root ground swaps when a chapter crosses
     the middle of the viewport
     ====================================================================== */
  function chapterBind() {
    var secs = qsa('[data-ground]');
    var base = root.getAttribute('data-route') === 'contact' ? 'brick' : 'ink';
    if (!secs.length || !('IntersectionObserver' in window)) { root.setAttribute('data-chapter', base); return; }
    var state = secs.map(function (el) { return { el: el, g: el.getAttribute('data-ground'), on: false }; });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        for (var i = 0; i < state.length; i++) if (state[i].el === en.target) state[i].on = en.isIntersecting;
      });
      var g = base;
      for (var j = 0; j < state.length; j++) if (state[j].on) g = state[j].g;
      root.setAttribute('data-chapter', g);
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    state.forEach(function (s) { io.observe(s.el); });
    observers.push(io);
  }

  /* ======================================================================
     7.13 VELOCITY MARQUEE
     ====================================================================== */
  function buildMarquee() {
    var track = document.getElementById('mq-track');
    if (!track) return;
    var html = '';
    for (var i = 0; i < 8; i++) html += '<span>' + esc(D.marquee) + '</span>';
    track.innerHTML = html;
  }
  function marqueeBind() {
    var track = document.getElementById('mq-track');
    if (!track || RM.matches) return;
    var x = 0, w = 0;
    function calc() { var f = track.firstElementChild; w = f ? f.getBoundingClientRect().width : 0; }
    calc();
    viewRelayout.push(calc);
    onFrame(function (s) {
      if (!w) { calc(); return; }
      var dir = s.vel >= 0 ? -1 : 1;
      x += (0.55 + Math.min(Math.abs(s.vel), 70) * 0.055) * dir;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }, true);
  }

  /* ======================================================================
     6.9 ABOUT — the one-line portrait is drawn by scroll scrub between 20%
     and 80% of its section
     ====================================================================== */
  function aboutBind() {
    reveal(qs('.ab__xerox'));
    var path = document.getElementById('oneline-path');
    var sec = qs('.ab--two');
    if (!path || !sec) return;
    if (RM.matches) { path.style.strokeDashoffset = '0'; return; }
    onFrame(function (s) {
      var r = sec.getBoundingClientRect();
      var prog = clamp((s.vh - r.top) / (r.height + s.vh * 0.55), 0, 1);
      var t = clamp((prog - 0.2) / 0.6, 0, 1);
      path.style.strokeDashoffset = String(1 - t);
    }, true);
  }

  /* ======================================================================
     6.10 CONTACT — magnetic links, postcard flip, mailto handoff
     ====================================================================== */
  function contactBind() {
    var pc = document.getElementById('pc');
    if (!pc) return;
    reveal(pc);

    var front = document.getElementById('pc-front');
    var turn = document.getElementById('pc-turn');
    var msg = document.getElementById('pc-msg');
    var status = document.getElementById('pc-status');

    function flip(on) {
      pc.classList.toggle('is-flipped', on);
      front.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on && msg) setTimeout(function () { msg.focus({ preventScroll: true }); }, RM.matches ? 0 : 900);
      if (!on) setTimeout(function () { front.focus({ preventScroll: true }); }, RM.matches ? 0 : 900);
    }
    front.setAttribute('aria-expanded', 'false');
    front.addEventListener('click', function () { flip(true); });
    turn.addEventListener('click', function () { flip(false); });

    /* no backend. hand the message to the mail client. */
    document.getElementById('pc-send').addEventListener('click', function () {
      var to = (D.links[0].href || '').replace(/^mailto:/, '') || 'mail@holdthecameraa.com';
      var body = (msg.value || '').trim();
      var from = (document.getElementById('pc-from').value || '').trim();
      var mail = (document.getElementById('pc-mail').value || '').trim();
      var sig = from || mail ? '\n\n— ' + from + (mail ? ' <' + mail + '>' : '') : '';
      location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent('commission — ' + (from || 'no name')) +
        '&body=' + encodeURIComponent(body + sig);
      status.textContent = 'handed to your mail app.';
    });

    /* magnetic pull, 60px reach, 6px maximum offset */
    if (!COARSE.matches && !MOBILE.matches) {
      var links = qsa('.links a');
      onFrame(function (s) {
        for (var i = 0; i < links.length; i++) {
          var a = links[i], r = a.getBoundingClientRect();
          var nx = clamp(s.mx, r.left, r.right), ny = clamp(s.my, r.top, r.bottom);
          var d = Math.sqrt((s.mx - nx) * (s.mx - nx) + (s.my - ny) * (s.my - ny));
          if (d < 60) {
            var ccx = r.left + r.width / 2, ccy = r.top + r.height / 2;
            var vx = s.mx - ccx, vy = s.my - ccy, len = Math.sqrt(vx * vx + vy * vy) || 1;
            var k = (1 - d / 60) * 6;
            a.style.transform = 'translate(' + (vx / len * k).toFixed(2) + 'px,' + (vy / len * k).toFixed(2) + 'px)';
          } else if (a.style.transform) {
            a.style.transform = '';
          }
        }
      }, true);
    }
  }

  /* ======================================================================
     5. PHOTOGRAPHY — year chips
     ====================================================================== */
  function chipsBind() {
    var chips = qsa('.chip');
    if (!chips.length) return;
    var frames = qsa('.masonry .frame');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var y = c.getAttribute('data-year');
        chips.forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
        frames.forEach(function (f) {
          f.classList.toggle('is-out', y !== 'all' && f.getAttribute('data-year') !== y);
        });
      });
    });
  }

  /* ======================================================================
     6.11 FOOTER — the wordmark scales slightly with scroll. Room tone is
     generated, not loaded: there are no assets in this repo.
     ====================================================================== */
  function footerBind() {
    var m = document.getElementById('foot-mark');
    if (m && !RM.matches) {
      onFrame(function (s) {
        m.style.transform = 'scale(' + (1 + clamp(s.ly / s.doc, 0, 1) * 0.045).toFixed(4) + ')';
      });
    }

    var btn = document.getElementById('sound');
    if (!btn) return;
    var ctx = null, gain = null, on = false;
    btn.addEventListener('click', function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { btn.disabled = true; return; }
      on = !on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      try {
        if (!ctx) {
          ctx = new AC();
          var len = Math.floor(ctx.sampleRate * 4);
          var buf = ctx.createBuffer(1, len, ctx.sampleRate);
          var ch = buf.getChannelData(0), last = 0;
          for (var i = 0; i < len; i++) {
            last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
            ch[i] = last * 3;
          }
          var src = ctx.createBufferSource();
          src.buffer = buf; src.loop = true;
          var lp = ctx.createBiquadFilter();
          lp.type = 'lowpass'; lp.frequency.value = 420;
          gain = ctx.createGain();
          gain.gain.value = 0.0001;
          src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
          src.start();
        }
        if (ctx.state === 'suspended') ctx.resume();
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(on ? 0.05 : 0.0001, ctx.currentTime + (on ? 0.9 : 0.5));
      } catch (e) { btn.disabled = true; }
    });
  }

  /* ======================================================================
     PER-VIEW WIRING
     ====================================================================== */
  function bindView() {
    chapterBind();
    heroBind();
    reveal(qs('.ledger__body'));
    reveal(qs('.widx__list'));
    threadsBind();
    parallaxBind();
    printsBind();
    collageBind();
    marqueeBind();
    aboutBind();
    contactBind();
    chipsBind();
    drawNavUnderlines();
  }

  /* ======================================================================
     INIT
     ====================================================================== */
  function init() {
    measure();
    relayoutFns.push(drawNavUnderlines);
    initCursor();
    initReadout();
    footerBind();

    window.addEventListener('hashchange', onHash);
    requestAnimationFrame(frame);

    renderView(parseHash());
    booted = true;
    boot(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
