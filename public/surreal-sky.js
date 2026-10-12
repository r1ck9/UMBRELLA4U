/* The Magritte sky behind every Umbrella4U page.

   One fixed canvas, drawn in code, no images. What is in it and why:

     Umbrellas hang in the sky the way the men hang in Golconda, in a loose
     grid that never lands and never falls.
     Rain falls through the whole sky except directly under an umbrella,
     where a dry column hangs down until the rain closes over it again.
     That is the organisation in one picture: the weather does not stop,
     the shelter is what somebody else is holding over you.
     A door stands open in mid-air with the light on behind it, because
     Haven is a door you can walk through from wherever you are standing.
     The sun and the moon are both up, because somebody is always awake.
     A few birds are holes cut in the sky, showing the paper underneath.

   The umbrella, cloud, moon and star outlines are the same paths the page
   uses for its sticker SVGs, so the sky is drawn in the site's own hand.

   Everything respects prefers-reduced-motion (one static frame, no
   parallax), pauses while the tab is hidden, and thins out on small or
   low-core devices. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)');

  /* ---- the site's own sticker outlines, reused as canvas paths ---- */
  var P = {
    // viewBox 0 0 100 100
    canopy: new Path2D('M8 52 C10 20 90 20 92 52 C82 45 72 45 64 52 C56 45 44 45 36 52 C28 45 18 45 8 52 Z'),
    handle: new Path2D('M50 52 L50 82 C50 92 36 92 36 83'),
    finial: new Path2D('M50 26 L50 16'),
    moon: new Path2D('M64 10 C38 16 22 40 26 64 C30 86 52 96 74 90 C58 84 46 68 46 50 C46 32 54 18 64 10 Z'),
    star: new Path2D('M50 8 L61 36 L91 38 L67 57 L75 87 L50 70 L25 87 L33 57 L9 38 L39 36 Z'),
    // viewBox 0 0 140 90
    cloud: new Path2D('M30 78 C12 78 6 62 16 52 C10 36 28 24 42 32 C48 14 76 10 86 28 C100 20 120 30 116 48 C132 50 134 76 114 78 Z'),
    // a gull, two strokes, drawn as one closed shape so it can be a hole
    bird: new Path2D('M4 30 C16 10 30 10 38 26 C46 10 60 10 72 30 C58 18 48 22 38 36 C28 22 18 18 4 30 Z')
  };

  var canvas = document.createElement('canvas');
  canvas.className = 'surreal-sky';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');

  function mount() {
    if (!canvas.parentNode) document.body.insertBefore(canvas, document.body.firstChild);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  /* ---- palette, read from the stylesheet so the sky follows the brand ---- */
  var C = {};
  function readPalette() {
    var s = getComputedStyle(root);
    function v(name, fallback) {
      var out = s.getPropertyValue(name).trim();
      return out || fallback;
    }
    C.ink = v('--hd-ink', '#3b2a54');
    C.lav = v('--hd-lav', '#ede3fb');
    C.paper = v('--hd-paper', '#fbf7ff');
    C.sheet = v('--hd-sheet', '#e3d3f7');
    C.lilac = v('--hd-lilac', '#c49aea');
    C.violet = v('--hd-violet', '#5e3d96');
    C.yellow = v('--hd-yellow', '#ffc94d');
    C.cream = v('--hd-cream', '#fff0c9');
    C.sky = v('--hd-sky', '#e3f1fc');
    C.white = v('--hd-white', '#ffffff');
  }
  readPalette();

  /* ---- world ---- */
  var W = 0, H = 0, dpr = 1, span = 0, pad = 260;
  var clouds = [], umbs = [], birds = [], doors = [], drops = [];
  var scroll = 0, t0 = 0;
  var bucket = [];

  // deterministic noise, so the sky is the same shape on every load
  var seed = 7;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  function build() {
    seed = 7;
    span = H + pad * 2;

    var small = W < 760;
    var lean = small || (navigator.hardwareConcurrency || 8) <= 4;

    // Golconda: a jittered grid of umbrellas, three depths
    umbs = [];
    var cols = small ? 3 : Math.max(4, Math.round(W / 330));
    var rows = small ? 4 : 5;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var depth = (r + c) % 3; // 0 far, 2 near
        var size = [34, 52, 78][depth] * (small ? 0.8 : 1);
        umbs.push({
          x: ((c + 0.5) / cols + (rnd() - 0.5) * 0.14) * W,
          y: ((r + 0.5) / rows + (rnd() - 0.5) * 0.1) * span,
          s: size,
          par: [0.12, 0.26, 0.46][depth],
          dim: [0.3, 0.52, 0.86][depth],
          fill: [C.sheet, C.lilac, C.lilac][depth],
          bob: rnd() * Math.PI * 2,
          sway: 0.5 + rnd() * 0.8,
          tilt: (rnd() - 0.5) * 0.18
        });
      }
    }

    clouds = [];
    var nc = small ? 4 : 7;
    for (var i = 0; i < nc; i++) {
      clouds.push({
        x: rnd() * W, y: rnd() * span,
        s: (90 + rnd() * 150) * (small ? 0.75 : 1),
        par: 0.06 + rnd() * 0.08,
        drift: (rnd() < 0.5 ? -1 : 1) * (2 + rnd() * 5),
        dim: 0.28 + rnd() * 0.22
      });
    }

    birds = [];
    var nb = small ? 2 : 4;
    for (var b = 0; b < nb; b++) {
      birds.push({
        x: rnd() * W, y: rnd() * span,
        s: 34 + rnd() * 30,
        par: 0.16 + rnd() * 0.12,
        drift: 6 + rnd() * 8,
        bob: rnd() * Math.PI * 2
      });
    }

    // two doors, kept well apart so you meet one every screen or so
    // the doors stand in the gutters either side of the paper, so they are
    // never half-swallowed by a panel
    var gutter = Math.max(0, (W - 1120) / 2);
    doors = [];
    if (gutter > 130 || small) {
      doors.push({ x: small ? W * 0.72 : W - gutter * 0.62, y: span * 0.2, s: small ? 70 : 104, par: 0.34 });
      doors.push({ x: small ? W * 0.12 : gutter * 0.3, y: span * 0.7, s: small ? 58 : 86, par: 0.3 });
    }

    drops = [];
    var nd = lean ? 90 : Math.round(W / 6);
    for (var d = 0; d < nd; d++) {
      var dp = d % 3;
      drops.push({
        x: rnd() * W, y: rnd() * span,
        len: [7, 11, 16][dp],
        v: [26, 42, 64][dp],
        par: [0.1, 0.24, 0.44][dp],
        dim: [0.2, 0.28, 0.36][dp]
      });
    }
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, W < 760 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    readPalette();
    build();
  }

  /* ---- drawing helpers ---- */
  function wrapY(y, par, t, drift) {
    var v = (y - scroll * par + (drift || 0) * t) % span;
    if (v < 0) v += span;
    return v - pad;
  }
  function wrapX(x, t, drift) {
    var v = (x + (drift || 0) * t) % (W + 400);
    if (v < 0) v += W + 400;
    return v - 200;
  }
  function alpha(a) { ctx.globalAlpha = a; }

  function shape(path, x, y, s, box, fill, stroke, lw, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(s / box, s / box);
    if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = (lw || 5) * box / s;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(path);
    }
    ctx.restore();
  }

  function drawUmbrella(u, x, y, t) {
    var s = u.s;
    var rot = u.tilt + Math.sin(t * 0.5 + u.bob) * 0.035 * u.sway;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s / 100, s / 100);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = u.fill;
    ctx.fill(P.canopy);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5;
    ctx.stroke(P.canopy);
    ctx.stroke(P.handle);
    ctx.stroke(P.finial);
    ctx.restore();
  }

  // a door standing in mid-air, ajar, with the light on behind it
  function drawDoor(d, x, y) {
    var s = d.s, w = s * 0.62, h = s * 1.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.05;
    ctx.strokeStyle = C.ink;

    // the light on the floor of a room that has no floor
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = C.cream;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h);
    ctx.lineTo(w * 0.9, h);
    ctx.lineTo(w * 2.1, h + s * 1.25);
    ctx.lineTo(-w * 0.5, h + s * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha /= 0.55;

    // the opening
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.fill();
    ctx.stroke();

    // the door itself, swung open towards us
    ctx.fillStyle = C.sheet;
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w + s * 0.5, s * 0.17);
    ctx.lineTo(w + s * 0.5, h + s * 0.17);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // handle
    ctx.beginPath();
    ctx.arc(w + s * 0.11, h * 0.56, s * 0.045, 0, Math.PI * 2);
    ctx.stroke();

    // the frame, standing on nothing
    ctx.beginPath();
    ctx.rect(-s * 0.09, -s * 0.09, w + s * 0.18, h + s * 0.09);
    ctx.stroke();
    ctx.restore();
  }

  /* ---- how dry it is at a point, 0 soaked, 1 sheltered ---- */
  function shelter(px, py, ups) {
    var dry = 0;
    for (var i = 0; i < ups.length; i++) {
      var u = ups[i];
      var below = py - u.ay;
      if (below < 0) continue;
      var reach = u.s * 7;
      if (below > reach) continue;
      var half = u.s * 0.42;
      var side = Math.abs(px - u.ax);
      if (side > half) continue;
      // soft at the edges of the column, and fading as the rain closes back over
      var e = 1 - Math.max(0, (side - half * 0.6) / (half * 0.4));
      var f = 1 - Math.pow(below / reach, 2);
      dry = Math.max(dry, e * f);
      if (dry > 0.98) return 1;
    }
    return dry;
  }

  /* ---- the frame ---- */
  function frame(now) {
    var t = reduce.matches ? 0 : (now - t0) / 1000;
    scroll = reduce.matches ? 0 : (window.scrollY || window.pageYOffset || 0);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // sun and moon, both up, almost still
    var hi = wrapY(span * 0.08, 0.03, t);
    alpha(0.5);
    shape(P.star, W * 0.12, hi + 40, 54, 100, C.yellow, C.ink, 5, 0.2);
    alpha(0.42);
    shape(P.moon, W * 0.88, hi - 10, 62, 100, C.cream, C.ink, 5, -0.15);

    // clouds
    var i, x, y;
    for (i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      x = wrapX(cl.x, t, cl.drift);
      y = wrapY(cl.y, cl.par, t);
      if (y < -200 || y > H + 200) continue;
      alpha(cl.dim);
      shape(P.cloud, x, y, cl.s, 140, C.sheet, C.ink, 5);
    }

    // birds: holes cut in the sky
    for (i = 0; i < birds.length; i++) {
      var bd = birds[i];
      x = wrapX(bd.x, t, bd.drift);
      y = wrapY(bd.y, bd.par, t) + Math.sin(t * 0.7 + bd.bob) * 6;
      if (y < -120 || y > H + 120) continue;
      alpha(0.5);
      shape(P.bird, x, y, bd.s, 76, C.paper, C.ink, 4);
    }

    // where the umbrellas are this frame, so the rain knows where to stop
    var live = [];
    for (i = 0; i < umbs.length; i++) {
      var u = umbs[i];
      u.ax = u.x + Math.sin(t * 0.33 + u.bob) * 9 * u.sway;
      u.ay = wrapY(u.y, u.par, t) + Math.sin(t * 0.5 + u.bob) * 7;
      if (u.ay > -200 && u.ay < H + 200) live.push(u);
    }

    // Rain, with a dry column hanging under every umbrella. Drops are sorted
    // into a few opacity buckets and each bucket is stroked as one path, so a
    // few hundred drops cost a handful of draw calls rather than one each.
    var BUCKETS = 7;
    for (i = 0; i < BUCKETS; i++) bucket[i] = null;
    for (i = 0; i < drops.length; i++) {
      var d = drops[i];
      x = d.x;
      y = wrapY(d.y, d.par, t, d.v);
      if (y < -40 || y > H + 40) continue;
      var dry = shelter(x, y, live);
      if (dry > 0.92) continue;
      var a = d.dim * (1 - dry);
      var b = Math.min(BUCKETS - 1, Math.round(a / 0.36 * (BUCKETS - 1)));
      if (!bucket[b]) bucket[b] = new Path2D();
      bucket[b].moveTo(x, y);
      bucket[b].lineTo(x - 1.8, y + d.len);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = C.violet;
    for (i = 1; i < BUCKETS; i++) {
      if (!bucket[i]) continue;
      alpha(i / (BUCKETS - 1) * 0.36);
      ctx.stroke(bucket[i]);
    }

    // doors
    for (i = 0; i < doors.length; i++) {
      var dr = doors[i];
      y = wrapY(dr.y, dr.par, t);
      if (y > -300 && y < H + 300) {
        alpha(0.7);
        drawDoor(dr, dr.x, y);
      }
    }

    // the umbrellas themselves, over the rain they are stopping
    for (i = 0; i < live.length; i++) {
      alpha(live[i].dim);
      drawUmbrella(live[i], live[i].ax, live[i].ay, t);
    }

    ctx.globalAlpha = 1;
  }

  /* ---- loop ---- */
  var raf = 0, running = false;
  function tick(now) {
    frame(now);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    if (reduce.matches) { frame(performance.now()); running = false; return; }
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function boot() {
    mount();
    resize();
    t0 = performance.now();
    if (reduce.matches) frame(t0);
    else start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      resize();
      if (reduce.matches) frame(performance.now());
    }, 160);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!reduce.matches) start();
  });

  if (reduce.addEventListener) {
    reduce.addEventListener('change', function () {
      stop();
      boot();
    });
  }

  // the colour scheme can flip under the user
  var dark = window.matchMedia('(prefers-color-scheme:dark)');
  if (dark.addEventListener) {
    dark.addEventListener('change', function () {
      readPalette();
      if (reduce.matches) frame(performance.now());
    });
  }
})();
