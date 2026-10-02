/* Schnitzeljagd-Minispiel „Lurch-Runner"
 * Endlos-Läufer auf einer Neon-Straße mit 3 Spuren (Canvas, Pseudo-3D).
 * Registriert sich als window.SchnitzelGames.runner. Vertrag: games/README.md
 */
(function () {
  'use strict';

  var NAME = 'runner';

  var DEFAULTS = {
    goal: 80,
    lives: 3,
    difficulty: 2,
    title: 'Lurch-Runner',
    label: 'Minispiel',
    intro: 'Sammle die Lichter und weiche den pinken Hindernissen aus.',
    winText: 'Ziel erreicht',
    startText: "Los geht's"
  };

  // Tempo (Einheiten/s), Anstieg pro Sekunde, Abstand zwischen Hindernis-Reihen (s)
  var DIFF = {
    1: { v0: 17, vmax: 30, ramp: 0.25, gap: 1.3 },
    2: { v0: 21, vmax: 38, ramp: 0.35, gap: 1.05 },
    3: { v0: 25, vmax: 46, ramp: 0.45, gap: 0.9 }
  };

  var LANE = 2.2;         // Spurbreite
  var ROAD = 3.3;         // halbe Straßenbreite
  var CAM_D = 5;          // Kamera-Abstand hinter der Spielfigur
  var NEAR = 0.6;
  var FAR = 115;
  var GRAV = 26;
  var JUMP_V = 9.2;
  var DUCK_T = 0.65;

  var CSS = [
    '.sg-runner{position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg,#0a0e14);',
    'font-family:"Space Grotesk",-apple-system,sans-serif;color:var(--text,#eaf6fb);-webkit-user-select:none;user-select:none;',
    '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.sg-runner *{box-sizing:border-box;margin:0;padding:0}',
    '.sg-runner__canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}',
    '.sg-runner__hud{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-start;justify-content:space-between;',
    'gap:12px;padding:14px 16px;pointer-events:none;transition:opacity .3s ease}',
    '.sg-runner__hud.is-hidden{opacity:0}',
    '.sg-runner__lives{display:flex;gap:6px;padding-top:4px}',
    '.sg-runner__life{width:24px;height:24px;color:var(--cyan,#40dcff);filter:drop-shadow(0 0 6px rgba(64,220,255,.7));',
    'transition:opacity .3s ease,transform .3s ease}',
    '.sg-runner__life.is-lost{opacity:.2;transform:scale(.75);filter:none}',
    '.sg-runner__score{text-align:right;min-width:128px}',
    '.sg-runner__lbl{font-size:11px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan,#40dcff)}',
    '.sg-runner__num{font-size:26px;font-weight:700;letter-spacing:-.02em;line-height:1.1;font-variant-numeric:tabular-nums;',
    'text-shadow:0 0 14px rgba(64,220,255,.65)}',
    '.sg-runner__num.is-bump{animation:sg-runner-bump .3s ease}',
    '.sg-runner__of{font-size:16px;opacity:.6}',
    '.sg-runner__bar{height:4px;border-radius:99px;background:rgba(64,220,255,.15);margin-top:6px;overflow:hidden}',
    '.sg-runner__fill{height:100%;width:0;background:var(--cyan,#40dcff);box-shadow:0 0 10px var(--cyan,#40dcff);transition:width .25s ease}',
    '.sg-runner__count{position:absolute;left:0;right:0;top:30%;text-align:center;font-size:104px;font-weight:700;letter-spacing:-.04em;',
    'line-height:1;color:#fff;text-shadow:0 0 22px #40dcff,0 0 60px #40dcff;pointer-events:none;opacity:0}',
    '.sg-runner__count.is-pop{animation:sg-runner-pop .7s ease-out both}',
    '.sg-runner__overlay{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:center;',
    'padding:16px 16px 22px;pointer-events:none;opacity:0;transition:opacity .35s ease}',
    '.sg-runner__overlay.is-show{opacity:1;pointer-events:auto}',
    '.sg-runner__card{width:100%;max-width:420px;padding:22px 20px 20px;border-radius:18px;border:1px solid rgba(64,220,255,.3);',
    'background:linear-gradient(160deg,rgba(64,220,255,.10),rgba(64,220,255,.03)),rgba(10,14,20,.74);',
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.6);',
    'transform:translateY(18px);transition:transform .45s cubic-bezier(.2,1.2,.4,1)}',
    '.sg-runner__overlay.is-show .sg-runner__card{transform:none}',
    '.sg-runner__title{font-size:34px;font-weight:700;letter-spacing:-.02em;text-transform:uppercase;line-height:1.02;margin-top:6px}',
    '.sg-runner__title.is-err{color:var(--err,#fb7185);text-shadow:0 0 18px rgba(251,113,133,.5)}',
    '.sg-runner__title.is-ok{color:var(--ok,#4ade80);text-shadow:0 0 18px rgba(74,222,128,.5)}',
    '.sg-runner__text{font-size:15px;line-height:1.5;color:rgba(234,246,251,.74);margin-top:8px}',
    '.sg-runner__meta{margin-top:12px;font-size:12px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan,#40dcff)}',
    '.sg-runner__controls{list-style:none;margin-top:14px;display:grid;gap:8px}',
    '.sg-runner__controls li{display:flex;align-items:center;gap:12px;font-size:15px;color:rgba(234,246,251,.88)}',
    '.sg-runner__controls svg{width:30px;height:30px;color:var(--cyan,#40dcff);flex:0 0 auto}',
    '.sg-runner__btn{display:block;margin-top:18px;width:100%;height:52px;border:0;border-radius:14px;background:var(--cyan,#40dcff);',
    'color:#04121a;font:700 16px "Space Grotesk",-apple-system,sans-serif;box-shadow:0 6px 28px rgba(64,220,255,.45);cursor:pointer;',
    'touch-action:manipulation;-webkit-appearance:none;appearance:none}',
    '.sg-runner__btn:active{transform:scale(.98)}',
    '@keyframes sg-runner-pop{0%{opacity:0;transform:scale(1.9)}25%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:scale(.9)}}',
    '@keyframes sg-runner-bump{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}',
    '@media (prefers-reduced-motion: reduce){',
    '.sg-runner__count.is-pop{animation-duration:.01ms;opacity:1}',
    '.sg-runner__num.is-bump{animation:none}',
    '.sg-runner__card,.sg-runner__overlay{transition:none}}'
  ].join('\n');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var styleRefs = 0;
  var styleEl = null;

  function addStyle() {
    styleRefs++;
    if (styleEl && styleEl.isConnected) return;
    styleEl = document.querySelector('style[data-game="' + NAME + '"]');
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-game', NAME);
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
  }

  function removeStyle() {
    styleRefs = Math.max(0, styleRefs - 1);
    if (styleRefs === 0 && styleEl) {
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svg(paths) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < paths.length; i++) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', paths[i][0]);
      if (paths[i][1]) p.setAttribute('fill', 'currentColor');
      s.appendChild(p);
    }
    return s;
  }

  var ICONS = {
    life: [['M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4z'], ['M12 8l3.5 2v4L12 16l-3.5-2v-4z', true]],
    lr: [['M3 12h18'], ['M7 8l-4 4 4 4'], ['M17 8l4 4-4 4']],
    up: [['M12 20V4'], ['M7 9l5-5 5 5'], ['M8 21h8']],
    down: [['M12 3v16'], ['M7 14l5 5 5-5'], ['M8 3h8']]
  };

  function str(v, fallback) {
    return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
  }

  function num(v, fallback, min, max) {
    var n = Number(v);
    if (v === null || v === '' || !isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // Leuchtpunkt-Sprite (radialer Verlauf), wird für Glühen und Partikel gestempelt
  function glowSprite(r, g, b) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var x = c.getContext('2d');
    var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(' + r + ',' + g + ',' + b + ',0.9)');
    gr.addColorStop(0.45, 'rgba(' + r + ',' + g + ',' + b + ',0.28)');
    gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return c;
  }

  // Deterministischer Zufall für den Hintergrund (bleibt bei Größenänderung gleich)
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function mount(container, options) {
    options = options || {};
    var params = (options.params && typeof options.params === 'object') ? options.params : {};
    var onWin = typeof options.onWin === 'function' ? options.onWin : function () {};
    var onFail = typeof options.onFail === 'function' ? options.onFail : function () {};

    var cfg = {
      goal: num(params.goal, DEFAULTS.goal, 3, 500),
      lives: num(params.lives, DEFAULTS.lives, 1, 9),
      difficulty: num(params.difficulty, DEFAULTS.difficulty, 1, 3),
      title: str(params.title, DEFAULTS.title),
      label: str(params.label, DEFAULTS.label),
      intro: str(params.intro, DEFAULTS.intro),
      winText: str(params.winText, DEFAULTS.winText),
      startText: str(params.startText, DEFAULTS.startText)
    };
    var diff = DIFF[cfg.difficulty];
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    addStyle();

    // ── DOM ──
    var root = el('div', 'sg-runner');
    root.setAttribute('lang', 'de');
    var canvas = el('canvas', 'sg-runner__canvas');
    canvas.setAttribute('aria-label', 'Spielfeld');
    root.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var mainCtx = ctx; // für den Spiegel-Durchgang wird ctx kurz umgeschaltet

    var hud = el('div', 'sg-runner__hud is-hidden');
    var livesBox = el('div', 'sg-runner__lives');
    var lifeEls = [];
    for (var li = 0; li < cfg.lives; li++) {
      var ic = svg(ICONS.life);
      ic.setAttribute('class', 'sg-runner__life');
      lifeEls.push(ic);
      livesBox.appendChild(ic);
    }
    var scoreBox = el('div', 'sg-runner__score');
    scoreBox.appendChild(el('div', 'sg-runner__lbl', 'Lichter'));
    var numEl = el('div', 'sg-runner__num');
    var numA = el('span', null, '0');
    numEl.appendChild(numA);
    numEl.appendChild(el('span', 'sg-runner__of', ' / ' + cfg.goal));
    scoreBox.appendChild(numEl);
    var bar = el('div', 'sg-runner__bar');
    var fill = el('div', 'sg-runner__fill');
    bar.appendChild(fill);
    scoreBox.appendChild(bar);
    hud.appendChild(livesBox);
    hud.appendChild(scoreBox);
    root.appendChild(hud);

    var countEl = el('div', 'sg-runner__count');
    countEl.setAttribute('aria-live', 'assertive');
    root.appendChild(countEl);

    var overlay = el('div', 'sg-runner__overlay');
    var card = el('div', 'sg-runner__card');
    card.setAttribute('role', 'dialog');
    overlay.appendChild(card);
    root.appendChild(overlay);

    container.appendChild(root);

    // ── Zustand ──
    var W = 1, H = 1, dpr = 1, horizon = 0, F = 1, camY = 5, camX = 0;
    var Fe = 1, camYe = 5, fov = 1;      // wirksame Brennweite/Kamerahöhe (Tunnel weitet das Bild)
    var mirror = false;                  // true = Spiegelbild in der nassen Straße zeichnen
    var refl = null, rctx = null, sunRefl = null;
    var REFL_SCALE = 0.5;                // Spiegel in halber Auflösung (wirkt weich)
    var TUN_R = 8;                       // Tunnelradius
    var TUN_STEP = 5;                    // Abstand der Tunnelringe
    var tunnels = [], nextTunnel = 0, tunIn = 0;
    var bg = null, bgW = 0, bgH = 0, floorGrad = null, roadGrad = null, vignette = null;
    var spr = {
      cyan: glowSprite(64, 220, 255),
      mag: glowSprite(255, 63, 180),
      white: glowSprite(220, 245, 255),
      green: glowSprite(74, 222, 128),
      yellow: glowSprite(255, 211, 107),
      red: glowSprite(251, 113, 133)
    };

    var state = 'intro';
    var stateT = 0;
    var time = 0;
    var dist = 0, speed = 8, baseSpeed = diff.v0, runTime = 0;
    var lane = 0, px = 0, py = 0, vy = 0, duckT = 0, invT = 0, roll = 0;
    var playerZ = 0;
    var lives = cfg.lives, orbs = 0, attempts = 0;
    // Animationszustand des Neon-Lurchs
    var lu = {
      gait: 0, wave: 0, flat: 0, sq: 0, look: 0, yaw: 0, tail: 0, lookBack: 1, blink: 0, nextBlink: 2,
      gulp: 0, dizzy: 0, tongue: null, alpha: 1, lift: [0, 0, 0, 0], tipX: 0, tipY: 0.2, tipZ: -2
    };
    var footprints = [];
    var objects = [], particles = [], rings = [], trail = [], streaks = [];
    var nextSpawn = 0;
    var shake = 0, flash = 0, flashCol = '255,255,255';
    var raf = 0, last = 0, destroyed = false, hidden = false;
    var countStep = -1;
    var cardShown = false, winSent = false, failSent = false;
    var cardAction = null;
    var ptr = null;
    var perfFrames = 0, perfSum = 0, perfChecked = false;
    var resizeObs = null;
    var P = { x: 0, y: 0, s: 0 };
    var Q = { x: 0, y: 0, s: 0 };

    for (var si = 0; si < 34; si++) streaks.push(newStreak(true));

    function newStreak(anyZ) {
      var side = Math.random() < 0.5 ? -1 : 1;
      return {
        x: side * rnd(ROAD + 1.2, ROAD + 11),
        y: rnd(0.3, 8),
        z: anyZ ? rnd(0, FAR) : FAR + rnd(0, 30),
        c: Math.random() < 0.6 ? '64,220,255' : '255,63,180'
      };
    }

    // ── Projektion: Kamera blickt waagerecht die Straße entlang ──
    function proj(x, y, z, out) {
      var dz = z + CAM_D;
      if (dz < 0.05) dz = 0.05;
      var s = Fe / dz;
      out.x = W / 2 + (x - camX) * s;
      out.y = horizon + (camYe - (mirror ? -y : y)) * s;
      out.s = s;
      return out;
    }

    function fog(z) {
      return z > 70 ? clamp(1 - (z - 70) / (FAR - 70), 0, 1) : 1;
    }

    // ── Größe & vorgerenderter Hintergrund ──
    function resize() {
      var r = root.getBoundingClientRect();
      var nw = Math.max(1, Math.round(r.width));
      var nh = Math.max(1, Math.round(r.height));
      var maxDpr = perfChecked && dpr < 2 ? dpr : 2;
      var nd = Math.min(window.devicePixelRatio || 1, maxDpr);
      if (nw === W && nh === H && nd === dpr && bg) return;
      W = nw; H = nh; dpr = nd;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      horizon = H * 0.40;
      F = W * 0.70;
      camY = (H * 0.80 - horizon) * CAM_D / F;
      Fe = F * fov;
      camYe = camY * F / Fe;
      buildBackground();
      if (!refl) {
        refl = document.createElement('canvas');
        rctx = refl.getContext('2d');
      }
      refl.width = Math.max(1, Math.round(W * dpr * REFL_SCALE));
      refl.height = Math.max(1, Math.round(H * dpr * REFL_SCALE));
      buildSunReflection();
      floorGrad = ctx.createLinearGradient(0, horizon, 0, H);
      floorGrad.addColorStop(0, '#1a0826');
      floorGrad.addColorStop(0.18, '#0b0718');
      floorGrad.addColorStop(1, '#04060b');
      roadGrad = ctx.createLinearGradient(0, horizon, 0, H);
      roadGrad.addColorStop(0, 'rgba(64,220,255,0.02)');
      roadGrad.addColorStop(1, 'rgba(64,220,255,0.10)');
      vignette = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
      if (hidden || state === 'paused') render();
    }

    // Weicher Spiegelstreifen der Sonne auf der nassen Straße
    function buildSunReflection() {
      var R = Math.min(W * 0.33, horizon * 0.62);
      var w = Math.ceil(R * 2.2), h = Math.ceil((H - horizon) * 0.8);
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr * 0.5));
      c.height = Math.max(1, Math.round(h * dpr * 0.5));
      var g = c.getContext('2d');
      g.scale(dpr * 0.5, dpr * 0.5);
      var v = g.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, 'rgba(255,200,110,0.95)');
      v.addColorStop(0.35, 'rgba(255,90,170,0.6)');
      v.addColorStop(1, 'rgba(170,50,255,0)');
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      var hz = g.createLinearGradient(0, 0, w, 0);
      hz.addColorStop(0, 'rgba(0,0,0,0)');
      hz.addColorStop(0.5, 'rgba(0,0,0,1)');
      hz.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hz;
      g.fillRect(0, 0, w, h);
      sunRefl = { c: c, w: w, h: h };
    }

    function buildBackground() {
      var rand = seeded(20260926);
      bgW = Math.ceil(W + 240);
      bgH = Math.ceil(horizon + 160);
      var hy = horizon + 140;
      var c = document.createElement('canvas');
      c.width = Math.round(bgW * dpr);
      c.height = Math.round(bgH * dpr);
      var g = c.getContext('2d');
      g.scale(dpr, dpr);

      var sky = g.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, '#03050b');
      sky.addColorStop(0.5, '#080a1d');
      sky.addColorStop(0.82, '#1b0a31');
      sky.addColorStop(1, '#40104d');
      g.fillStyle = sky;
      g.fillRect(0, 0, bgW, bgH);

      // Sterne
      for (var i = 0; i < 150; i++) {
        var sy = Math.pow(rand(), 1.6) * hy * 0.85;
        var sx = rand() * bgW;
        var sr = rand() * 1.1 + 0.3;
        g.globalAlpha = (1 - sy / hy) * (0.35 + rand() * 0.65);
        g.fillStyle = rand() < 0.25 ? '#9fe9ff' : '#ffffff';
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      // Sonne mit Streifen
      var R = Math.min(W * 0.33, horizon * 0.62);
      var cx = bgW / 2, cy = hy - R * 0.78;
      var halo = g.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.4);
      halo.addColorStop(0, 'rgba(255,63,180,0.42)');
      halo.addColorStop(0.5, 'rgba(160,50,255,0.12)');
      halo.addColorStop(1, 'rgba(160,50,255,0)');
      g.fillStyle = halo;
      g.fillRect(0, 0, bgW, hy);

      var sc = document.createElement('canvas');
      var sd = Math.ceil(R * 2 + 4);
      sc.width = Math.round(sd * dpr);
      sc.height = Math.round(sd * dpr);
      var s2 = sc.getContext('2d');
      s2.scale(dpr, dpr);
      var sun = s2.createLinearGradient(0, 2, 0, sd - 2);
      sun.addColorStop(0, '#fff08a');
      sun.addColorStop(0.38, '#ffae5c');
      sun.addColorStop(0.7, '#ff3fb4');
      sun.addColorStop(1, '#a52cff');
      s2.fillStyle = sun;
      s2.beginPath();
      s2.arc(sd / 2, sd / 2, R, 0, Math.PI * 2);
      s2.fill();
      s2.globalCompositeOperation = 'destination-out';
      for (var k = 0; k < 9; k++) {
        var yy = sd / 2 - R * 0.12 + R * k * 0.125;
        s2.fillRect(0, yy, sd, 1 + k * 1.1);
      }
      g.save();
      g.beginPath();
      g.rect(0, 0, bgW, hy);
      g.clip();
      g.drawImage(sc, cx - sd / 2, cy - sd / 2, sd, sd);
      g.restore();

      // Berge: zwei Schichten mit Neon-Kanten
      function ridge(n, hMin, hMax, fillCol, strokeCol, glowA) {
        var pts = [];
        for (var j = 0; j <= n; j++) {
          var x = (j / n) * bgW + (j > 0 && j < n ? (rand() - 0.5) * (bgW / n) * 0.6 : 0);
          var h = (j === 0 || j === n) ? hMin * 0.5 : hMin + rand() * (hMax - hMin);
          pts.push([x, hy - h]);
        }
        g.beginPath();
        g.moveTo(0, hy + 1);
        for (var m = 0; m < pts.length; m++) g.lineTo(pts[m][0], pts[m][1]);
        g.lineTo(bgW, hy + 1);
        g.closePath();
        g.fillStyle = fillCol;
        g.fill();
        // Drahtgitter-Linien von den Gipfeln
        g.strokeStyle = strokeCol;
        g.globalAlpha = 0.22;
        g.lineWidth = 1;
        for (var q = 1; q < pts.length - 1; q++) {
          g.beginPath();
          g.moveTo(pts[q][0], pts[q][1]);
          g.lineTo(pts[q][0] + (rand() - 0.5) * 30, hy);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.beginPath();
        for (var t = 0; t < pts.length; t++) {
          if (t === 0) g.moveTo(pts[t][0], pts[t][1]);
          else g.lineTo(pts[t][0], pts[t][1]);
        }
        g.globalCompositeOperation = 'lighter';
        g.lineWidth = 5;
        g.globalAlpha = glowA;
        g.stroke();
        g.lineWidth = 1.4;
        g.globalAlpha = 0.9;
        g.stroke();
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      ridge(9, W * 0.07, W * 0.2, '#0e0822', 'rgba(170,80,255,0.9)', 0.12);
      ridge(14, W * 0.03, W * 0.1, '#07040f', 'rgba(255,63,180,0.95)', 0.18);

      // Horizont-Glühen
      var hz = g.createLinearGradient(0, hy - 34, 0, hy + 20);
      hz.addColorStop(0, 'rgba(255,63,180,0)');
      hz.addColorStop(0.62, 'rgba(255,63,180,0.35)');
      hz.addColorStop(1, 'rgba(255,63,180,0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = hz;
      g.fillRect(0, hy - 34, bgW, 54);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1a0826';
      g.fillRect(0, hy + 0.5, bgW, bgH - hy);
      g.fillStyle = 'rgba(255,140,220,0.9)';
      g.fillRect(0, hy - 0.5, bgW, 1.5);
      bg = c;
    }

    // ── Karten (Start, Crash, Pause, Sieg) ──
    function showCard(o) {
      while (card.firstChild) card.removeChild(card.firstChild);
      if (o.label) card.appendChild(el('div', 'sg-runner__lbl', o.label));
      var t = el('h2', 'sg-runner__title' + (o.titleClass ? ' ' + o.titleClass : ''), o.title);
      card.appendChild(t);
      if (o.text) card.appendChild(el('p', 'sg-runner__text', o.text));
      if (o.meta) card.appendChild(el('div', 'sg-runner__meta', o.meta));
      if (o.controls) {
        var ul = el('ul', 'sg-runner__controls');
        [['lr', 'Wischen links / rechts: Spur wechseln'],
          ['up', 'Wischen nach oben: Springen'],
          ['down', 'Wischen nach unten: Ducken']].forEach(function (c) {
          var li2 = el('li');
          li2.appendChild(svg(ICONS[c[0]]));
          li2.appendChild(el('span', null, c[1]));
          ul.appendChild(li2);
        });
        card.appendChild(ul);
      }
      cardAction = o.action || null;
      if (o.button) {
        var b = el('button', 'sg-runner__btn', o.button);
        b.type = 'button';
        card.appendChild(b);
      }
      overlay.classList.add('is-show');
      cardShown = true;
      if (o.button) {
        var btn = card.querySelector('.sg-runner__btn');
        try { btn.focus({ preventScroll: true }); } catch (e) { /* ältere Browser */ }
      }
    }

    function hideCard() {
      overlay.classList.remove('is-show');
      cardShown = false;
      cardAction = null;
    }

    function onCardClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('.sg-runner__btn') : null;
      if (!b || !cardAction) return;
      var a = cardAction;
      hideCard();
      a();
    }

    function showCount(txt) {
      countEl.textContent = txt;
      countEl.classList.remove('is-pop');
      void countEl.offsetWidth;
      countEl.classList.add('is-pop');
    }

    function updateHud(bump) {
      numA.textContent = String(orbs);
      fill.style.width = Math.min(100, orbs / cfg.goal * 100) + '%';
      lifeEls.forEach(function (e, i) { e.classList.toggle('is-lost', i >= lives); });
      if (bump) {
        numEl.classList.remove('is-bump');
        void numEl.offsetWidth;
        numEl.classList.add('is-bump');
      }
    }

    function safeCall(fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    }

    // ── Spielablauf ──
    function startRun() {
      objects = [];
      rings = [];
      orbs = 0;
      lives = cfg.lives;
      lane = 0;
      vy = 0;
      py = 0;
      duckT = 0;
      invT = 0;
      playerZ = 0;
      runTime = 0;
      lu.dizzy = 0;
      lu.tongue = null;
      failSent = false;
      // Nach jedem gescheiterten Versuch etwas ruhiger starten
      baseSpeed = diff.v0 * Math.max(0.72, 1 - 0.07 * attempts);
      nextSpawn = dist + 48;
      tunnels = [];
      nextTunnel = dist + 420;
      updateHud(false);
      hud.classList.remove('is-hidden');
      startCountdown();
    }

    function startCountdown() {
      state = 'countdown';
      stateT = 0;
      countStep = -1;
    }

    function move(dir) {
      if (state !== 'run' && state !== 'countdown') return;
      var nl = clamp(lane + dir, -1, 1);
      if (nl === lane) { shake = Math.max(shake, 0.12); return; }
      lane = nl;
    }

    function jump() {
      if (state !== 'run' && state !== 'countdown') return;
      if (py > 0.02 || vy > 0) return;
      vy = JUMP_V;
      duckT = 0;
      lu.sq = -0.9; // Strecken beim Absprung
      burst(px, 0.1, playerZ - 0.3, 8, spr.cyan, 3, 0.35);
    }

    function duck() {
      if (state !== 'run' && state !== 'countdown') return;
      if (py > 0.02) vy = Math.min(vy, -16); // schnell landen
      if (duckT <= 0) lu.sq = 0.6;
      duckT = DUCK_T;
    }

    function crash(o) {
      lives--;
      invT = 1.6;
      lu.dizzy = 1.7;
      lu.sq = 0.9;
      lu.tongue = null;
      shake = 0.55;
      flash = 1;
      flashCol = '251,113,133';
      burst(px, py + 0.5, playerZ, 34, spr.mag, 9, 0.9);
      burst(px, py + 0.5, playerZ, 16, spr.white, 6, 0.6);
      shatter(o);
      updateHud(false);
      if (lives <= 0) gameOver();
    }

    function gameOver() {
      state = 'over';
      stateT = 0;
      attempts++;
      burst(px, py + 0.5, playerZ, 50, spr.cyan, 12, 1.2);
      if (!failSent) {
        failSent = true;
        safeCall(onFail);
      }
    }

    function winGame() {
      state = 'won';
      stateT = 0;
      flash = 1;
      flashCol = '160,240,255';
      // Hindernisse zerspringen, übrige Lichter zerplatzen wie Feuerwerk
      objects.forEach(function (o) {
        if (o.type !== 'orb') shatter(o);
        else if (o.z - dist < 60) burst(o.x, o.y, o.z - dist, 6, Math.random() < 0.5 ? spr.cyan : spr.yellow, 6, 0.8);
      });
      objects = [];
      burst(px, py + 0.6, playerZ, 50, spr.green, 12, 1.4);
      burst(px, py + 0.6, playerZ, 36, spr.cyan, 10, 1.2);
      burst(px, py + 0.6, playerZ, 30, spr.yellow, 11, 1.3);
      burst(px, py + 0.6, playerZ, 24, spr.mag, 10, 1.1);
    }

    function collect(o) {
      o.taken = true;
      orbs++;
      rings.push({ x: o.x, y: o.y, z: o.z - dist, t: 0 });
      burst(o.x, o.y, o.z - dist, 10, spr.cyan, 5, 0.5);
      updateHud(true);
      if (orbs >= cfg.goal && state === 'run') winGame();
    }

    // Partikel in Welt-Koordinaten (z relativ zur Spielfigur)
    function burst(x, y, z, n, sprite, force, life) {
      if (reduceMotion) n = Math.ceil(n / 3);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
        var f = force * (0.3 + Math.random() * 0.7);
        particles.push({
          x: x, y: y, z: z,
          vx: Math.cos(a) * Math.cos(b) * f,
          vy: Math.sin(b) * f + force * 0.25,
          vz: Math.sin(a) * Math.cos(b) * f,
          life: life * (0.5 + Math.random() * 0.5),
          max: life,
          sp: sprite,
          size: 0.18 + Math.random() * 0.22
        });
      }
    }

    function shatter(o) {
      var rz = o.z - dist;
      for (var i = 0; i < (reduceMotion ? 6 : 18); i++) {
        particles.push({
          x: o.x + rnd(-o.w / 2, o.w / 2), y: rnd(o.y0, o.y1), z: rz + rnd(-o.d / 2, o.d / 2),
          vx: rnd(-6, 6), vy: rnd(1, 8), vz: rnd(2, 10),
          life: rnd(0.4, 0.9), max: 0.9, sp: spr.mag, size: rnd(0.15, 0.35)
        });
      }
      o.dead = true;
    }

    // ── Hindernis-Reihen: immer mindestens ein Weg frei ──
    function addWall(ln, z) { objects.push({ type: 'wall', x: ln * LANE, z: z, w: LANE * 0.8, d: 1.1, y0: 0, y1: 2.4 }); }
    function addLow(ln, z) { objects.push({ type: 'low', x: ln * LANE, z: z, w: LANE * 0.94, d: 0.5, y0: 0, y1: 0.6 }); }
    function addBeam(ln, z) { objects.push({ type: 'beam', x: ln * LANE, z: z, w: LANE * 0.94, d: 0.5, y0: 0.55, y1: 1.25 }); }
    function addOrbLine(ln, z0, n, y) {
      for (var i = 0; i < n; i++) {
        objects.push({ type: 'orb', x: ln * LANE, z: z0 + i * 2.6, y: y || 0.6, ph: Math.random() * 6, w: 0, d: 0 });
      }
    }
    function addOrbArc(ln, zc) {
      for (var i = -2; i <= 2; i++) {
        objects.push({ type: 'orb', x: ln * LANE, z: zc + i * 2.2, y: 0.6 + 1.1 * (1 - (i * i) / 5), ph: Math.random() * 6, w: 0, d: 0 });
      }
    }

    // Bonus-Tunnel: Ringe aus Licht, drinnen eine Lichterkette im Zickzack
    function spawnTunnel(z) {
      var len = TUN_STEP * 26;
      var t = { start: z + 6, end: z + 6 + len };
      tunnels.push(t);
      var ln = Math.floor(Math.random() * 3) - 1, dir = Math.random() < 0.5 ? -1 : 1;
      for (var zz = t.start + 10; zz < t.end - 12; zz += 19) {
        addOrbLine(ln, zz, 3);
        if (ln + dir > 1 || ln + dir < -1) dir = -dir;
        ln += dir;
      }
      nextSpawn = t.end + 18;
      nextTunnel = t.end + rnd(650, 850);
    }

    function spawnRow() {
      var z = nextSpawn;
      if (z >= nextTunnel) { spawnTunnel(z); return; }
      var prog = clamp(runTime / 60, 0, 1);
      var r = Math.random();
      var a = Math.floor(Math.random() * 3) - 1;
      var others = [-1, 0, 1].filter(function (l) { return l !== a; });
      var b = others[Math.floor(Math.random() * 2)];
      var withOrbs = Math.random() < 0.5;

      if (r < 0.16 - prog * 0.06) {
        // Nur Lichter (Verschnaufpause)
        addOrbLine(a, z - 6, 4);
      } else if (r < 0.40) {
        addWall(a, z);
        if (withOrbs) addOrbLine(b, z - 9, 3);
      } else if (r < 0.56 + prog * 0.04) {
        addWall(others[0], z);
        addWall(others[1], z);
        if (withOrbs) addOrbLine(a, z - 9, 3);
      } else if (r < 0.70) {
        addLow(-1, z); addLow(0, z); addLow(1, z);
        if (withOrbs) addOrbArc(a, z);
      } else if (r < 0.84) {
        addBeam(-1, z); addBeam(0, z); addBeam(1, z);
        if (withOrbs) addOrbLine(a, z - 5, 3, 0.35);
      } else if (r < 0.93) {
        addWall(a, z);
        others.forEach(function (l) { addLow(l, z); });
        if (withOrbs) addOrbArc(b, z);
      } else {
        addWall(a, z);
        others.forEach(function (l) { addBeam(l, z); });
      }
      var gapT = diff.gap - prog * 0.15;
      nextSpawn += Math.max(14, speed * gapT * rnd(0.95, 1.4));
    }

    // ── Update ──
    function update(dt) {
      time += dt;
      stateT += dt;
      if (state === 'paused') return;

      var target;
      if (state === 'intro') target = 9;
      else if (state === 'countdown') target = baseSpeed * 0.55;
      else if (state === 'run') {
        runTime += dt;
        target = Math.min(diff.vmax, baseSpeed + diff.ramp * runTime);
      } else if (state === 'over') target = 0;
      else target = 6;
      speed += (target - speed) * Math.min(1, dt * (state === 'over' ? 2.5 : 1.8));
      dist += speed * dt;

      if (state === 'countdown') {
        var step = Math.floor(stateT / 0.7);
        if (step !== countStep) {
          countStep = step;
          if (step < 3) showCount(String(3 - step));
          else {
            showCount('Los!');
            state = 'run';
            stateT = 0;
          }
        }
      }

      // Spielfigur
      px += (lane * LANE - px) * Math.min(1, dt * 13);
      if (py > 0 || vy > 0) {
        vy -= GRAV * dt;
        py += vy * dt;
        if (py <= 0) {
          py = 0;
          vy = 0;
          lu.sq = 1; // Plumps beim Landen
          if (state === 'run' || state === 'countdown') burst(px, 0.05, playerZ - 0.2, 6, spr.cyan, 2.5, 0.3);
        }
      }
      if (duckT > 0) duckT = Math.max(0, duckT - dt);
      if (invT > 0) invT = Math.max(0, invT - dt);
      var lat = lane * LANE - px;
      var rollT = reduceMotion ? 0 : clamp(lat * 0.018, -0.045, 0.045);
      roll += (rollT - roll) * Math.min(1, dt * 8);
      camX += (px * 0.55 - camX) * Math.min(1, dt * 8);
      updateLurch(dt, lat);

      // Tunnel: drinnen dunkler und weiteres Blickfeld (Tempo-Gefühl)
      var inT = 0;
      for (var ti = tunnels.length - 1; ti >= 0; ti--) {
        var tn = tunnels[ti];
        if (tn.end - dist < -CAM_D - 4) { tunnels.splice(ti, 1); continue; }
        if (dist > tn.start - 6 && dist < tn.end - 2) inT = 1;
      }
      tunIn += (inT - tunIn) * Math.min(1, dt * 3);
      var fovT = !reduceMotion && inT && state === 'run' ? 0.84 : 1;
      fov += (fovT - fov) * Math.min(1, dt * 1.8);

      if (state === 'won') {
        if (stateT > 1.0) playerZ += dt * (stateT - 1.0) * 42; // erst umschauen, dann ab in den Sonnenuntergang
        if (stateT > 1.1 && !cardShown) {
          showCard({ label: cfg.label, title: 'Geschafft', titleClass: 'is-ok', text: cfg.winText, meta: orbs + ' von ' + cfg.goal + ' Lichtern' });
        }
        if (stateT > 1.9 && !winSent) {
          winSent = true;
          safeCall(onWin);
        }
      }
      if (state === 'over' && stateT > 1.6 && !cardShown) {
        showCard({
          label: cfg.label,
          title: 'Crash',
          titleClass: 'is-err',
          text: orbs + ' von ' + cfg.goal + ' Lichtern gesammelt. Beim nächsten Versuch geht es etwas ruhiger los.',
          button: 'Nochmal',
          action: startRun
        });
      }

      if (state === 'run') {
        while (nextSpawn - dist < FAR) spawnRow();
      }

      // Objekte & Kollisionen
      var alive = [], cur = objects; // winGame() darf objects währenddessen ersetzen
      for (var i = 0; i < cur.length; i++) {
        var o = cur[i];
        var rz = o.z - dist;
        if (o.dead || o.taken || rz < -CAM_D + NEAR - 1.5) continue;
        if (state === 'run') {
          if (o.type === 'orb') {
            var dzO = rz - playerZ;
            if (dzO > -0.8 && dzO < 4.8 && Math.abs(o.x - px) < 1.05 && Math.abs(o.y - (py + 0.45)) < 1.2) {
              collect(o);
              if (dzO > 1.2) lu.tongue = { x: o.x, y: o.y, z: rz, t: 0 }; // Zunge schnappt zu
              lu.gulp = 0.3;
              continue;
            }
          } else if (invT <= 0 && rz - o.d / 2 < 1.0 && rz + o.d / 2 > -0.7 && Math.abs(o.x - px) < o.w / 2 + 0.45) {
            var top = py + (duckT > 0 ? 0.32 : 0.85);
            if (top > o.y0 && py < o.y1) {
              crash(o);
              continue;
            }
          }
        }
        alive.push(o);
      }
      objects = alive.filter(function (x) { return !x.dead; });

      // Partikel
      var drag = Math.exp(-dt * 1.6);
      particles = particles.filter(function (p) {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt - speed * dt;
        p.vy -= 9 * dt;
        p.vx *= drag; p.vz *= drag;
        if (p.y < 0) { p.y = 0; p.vy *= -0.4; }
        return p.z > -CAM_D + NEAR;
      });
      rings = rings.filter(function (r) {
        r.t += dt;
        r.z -= speed * dt;
        return r.t < 0.45;
      });

      // Lichtspur der Spielfigur
      trail.unshift({ x: lu.tipX, y: lu.tipY, z: lu.tipZ, d: dist });
      while (trail.length > 2 && (trail[trail.length - 1].d - dist + trail[trail.length - 1].z) < -CAM_D + NEAR) trail.pop();
      if (trail.length > 60) trail.length = 60;

      // Seitliche Tempo-Streifen
      for (var s = 0; s < streaks.length; s++) {
        streaks[s].z -= speed * dt * 1.25;
        if (streaks[s].z < -3) streaks[s] = newStreak(false);
      }

      shake = Math.max(0, shake - dt * 1.4);
      flash = Math.max(0, flash - dt * 2.2);
    }

    // ── Zeichnen ──
    function glowStroke(col, lw, a) {
      ctx.strokeStyle = 'rgba(' + col + ',' + (0.16 * a) + ')';
      ctx.lineWidth = lw * 4.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + col + ',' + (0.4 * a) + ')';
      ctx.lineWidth = lw * 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * a) + ')';
      ctx.lineWidth = Math.max(0.8, lw * 0.6);
      ctx.stroke();
    }

    function drawGrid() {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;
      // Querlinien
      var step = 4, off = dist % step;
      for (var k = 0; ; k++) {
        var z = k * step - off - 4.2;
        if (z > FAR) break;
        proj(0, 0, z, P);
        if (P.y > H + 2) continue;
        var a = fog(z) * (z < 20 ? 0.5 : 0.32);
        ctx.strokeStyle = 'rgba(190,80,255,' + a + ')';
        ctx.lineWidth = z < 10 ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(-120, P.y);
        ctx.lineTo(W + 120, P.y);
        ctx.stroke();
      }
      // Längslinien neben der Straße
      for (var i = -9; i <= 9; i++) {
        var x = (i + (i < 0 ? -0.5 : 0.5)) * LANE;
        if (Math.abs(x) <= ROAD + 0.1) continue;
        proj(x, 0, -4.3, P);
        proj(x, 0, FAR, Q);
        ctx.strokeStyle = 'rgba(190,80,255,0.28)';
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(Q.x, Q.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawRoad() {
      // Fahrbahn
      ctx.fillStyle = 'rgba(4,8,14,0.82)';
      ctx.beginPath();
      proj(-ROAD, 0, -4.3, P); ctx.moveTo(P.x, P.y);
      proj(ROAD, 0, -4.3, P); ctx.lineTo(P.x, P.y);
      proj(ROAD, 0, FAR, P); ctx.lineTo(P.x, P.y);
      proj(-ROAD, 0, FAR, P); ctx.lineTo(P.x, P.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = roadGrad;
      ctx.fill();

      // Sonne spiegelt sich flimmernd im Asphalt (in Streifen, die mitlaufen)
      if (sunRefl && tunIn < 0.99) {
        var sr = sunRefl, cxS = W / 2 - camX * 7, n = 22, ph = (dist * 0.06) % 1;
        ctx.globalAlpha = 0.55 * (1 - tunIn);
        for (var q = 0; q < n; q++) {
          var t0 = (q + ph) / n, t1 = (q + ph + 0.55) / n;
          var y0 = Math.pow(t0, 1.7) * sr.h, y1 = Math.pow(Math.min(1, t1), 1.7) * sr.h;
          if (y1 - y0 < 0.5) continue;
          var ww = sr.w * (1 - t0 * 0.45);
          ctx.drawImage(sr.c, 0, (y0 / sr.h) * sr.c.height, sr.c.width, Math.max(1, ((y1 - y0) / sr.h) * sr.c.height),
            cxS - ww / 2, horizon + y0, ww, y1 - y0);
        }
        ctx.globalAlpha = 1;
      }

      // Randlinien
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        proj(sgn * ROAD, 0, -4.3, P);
        proj(sgn * ROAD, 0, FAR, Q);
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(Q.x, Q.y);
        glowStroke('64,220,255', 2.2, 1);
      }
      // Gestrichelte Spurlinien
      ctx.strokeStyle = 'rgba(64,220,255,0.55)';
      var period = 8, dash = 3.2, off = dist % period;
      for (var d = -1; d <= 1; d += 2) {
        var x = d * LANE / 2;
        ctx.beginPath();
        for (var k = 0; ; k++) {
          var z0 = k * period - off - 4.3;
          if (z0 > FAR) break;
          var z1 = Math.min(FAR, z0 + dash);
          if (z1 < -4.3) continue;
          proj(x, 0, Math.max(-4.3, z0), P);
          proj(x, 0, z1, Q);
          ctx.moveTo(P.x, P.y);
          ctx.lineTo(Q.x, Q.y);
        }
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Lichtimpulse auf den Randlinien
      for (var n = 0; n < 4; n++) {
        var pz = FAR - ((time * (speed * 1.9 + 20) + n * 31) % (FAR + 4));
        var side = n % 2 ? 1 : -1;
        proj(side * ROAD, 0.02, pz, P);
        var sz = Math.max(6, P.s * 0.9) * fog(pz);
        ctx.drawImage(spr.cyan, P.x - sz, P.y - sz, sz * 2, sz * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawStreaks() {
      ctx.globalCompositeOperation = 'lighter';
      var a = clamp((speed - 12) / 30, 0, 1) * 0.55;
      if (a <= 0.01) { ctx.globalCompositeOperation = 'source-over'; return; }
      ctx.lineWidth = 1.5;
      for (var i = 0; i < streaks.length; i++) {
        var s = streaks[i];
        proj(s.x, s.y, s.z, P);
        proj(s.x, s.y, s.z + 2 + speed * 0.12, Q);
        ctx.strokeStyle = 'rgba(' + s.c + ',' + (a * fog(s.z)) + ')';
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.lineTo(Q.x, Q.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    var BOX = [];
    for (var bi = 0; bi < 8; bi++) BOX.push({ x: 0, y: 0, s: 0 });

    function drawBox(o, rz) {
      var z0 = rz - o.d / 2, z1 = rz + o.d / 2;
      if (z0 + CAM_D < NEAR) return;
      var a = fog(rz);
      if (a <= 0) return;
      var xl = o.x - o.w / 2, xr = o.x + o.w / 2;
      var c = BOX;
      proj(xl, o.y0, z0, c[0]); proj(xr, o.y0, z0, c[1]); proj(xr, o.y1, z0, c[2]); proj(xl, o.y1, z0, c[3]);
      proj(xl, o.y0, z1, c[4]); proj(xr, o.y0, z1, c[5]); proj(xr, o.y1, z1, c[6]); proj(xl, o.y1, z1, c[7]);
      var lw = clamp(c[0].s * 0.028, 0.8, 3.2);

      function face(i0, i1, i2, i3) {
        ctx.moveTo(c[i0].x, c[i0].y);
        ctx.lineTo(c[i1].x, c[i1].y);
        ctx.lineTo(c[i2].x, c[i2].y);
        ctx.lineTo(c[i3].x, c[i3].y);
        ctx.closePath();
      }

      // Körper
      ctx.globalAlpha = a;
      ctx.beginPath();
      if (o.y1 < camYe) face(3, 2, 6, 7);
      if (camX < xl) face(0, 3, 7, 4);
      if (camX > xr) face(1, 2, 6, 5);
      ctx.fillStyle = 'rgba(70,10,60,0.92)';
      ctx.fill();
      ctx.beginPath();
      face(0, 1, 2, 3);
      ctx.fillStyle = 'rgba(28,4,30,0.93)';
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = 'lighter';
      // Front-Dekor
      var fx0 = c[0].x, fx1 = c[1].x, fy0 = c[3].y, fy1 = c[0].y;
      var fw = fx1 - fx0, fh = fy1 - fy0;
      if (o.type === 'wall') {
        ctx.strokeStyle = 'rgba(255,63,180,' + (0.35 * a) + ')';
        ctx.lineWidth = Math.max(1, lw * 0.7);
        ctx.beginPath();
        for (var k = 1; k < 7; k++) {
          var yy = fy0 + fh * k / 7;
          ctx.moveTo(fx0 + fw * 0.12, yy);
          ctx.lineTo(fx1 - fw * 0.12, yy);
        }
        ctx.stroke();
        // Warn-Chevron
        ctx.beginPath();
        ctx.moveTo(fx0 + fw * 0.28, fy0 + fh * 0.3);
        ctx.lineTo(fx0 + fw * 0.5, fy0 + fh * 0.45);
        ctx.lineTo(fx0 + fw * 0.72, fy0 + fh * 0.3);
        glowStroke('255,63,180', lw, a);
      } else if (fw > 2 && fh > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(fx0, fy0, fw, fh);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,63,180,' + (0.55 * a) + ')';
        ctx.lineWidth = Math.max(1.5, fh * 0.28);
        ctx.beginPath();
        var st = Math.max(6, fh * 1.1);
        for (var sx = fx0 - fh; sx < fx1 + fh; sx += st) {
          ctx.moveTo(sx, fy1);
          ctx.lineTo(sx + fh, fy0);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Kanten
      ctx.beginPath();
      face(0, 1, 2, 3);
      if (o.y1 < camYe) { ctx.moveTo(c[3].x, c[3].y); ctx.lineTo(c[7].x, c[7].y); ctx.lineTo(c[6].x, c[6].y); ctx.lineTo(c[2].x, c[2].y); }
      if (camX < xl) { ctx.moveTo(c[0].x, c[0].y); ctx.lineTo(c[4].x, c[4].y); ctx.lineTo(c[7].x, c[7].y); }
      if (camX > xr) { ctx.moveTo(c[1].x, c[1].y); ctx.lineTo(c[5].x, c[5].y); ctx.lineTo(c[6].x, c[6].y); }
      glowStroke('255,63,180', lw, a);

      // Pfosten des Balkens
      if (o.type === 'beam') {
        ctx.beginPath();
        proj(xl + 0.05, 0, rz, P); ctx.moveTo(P.x, P.y);
        proj(xl + 0.05, o.y0, rz, P); ctx.lineTo(P.x, P.y);
        proj(xr - 0.05, 0, rz, P); ctx.moveTo(P.x, P.y);
        proj(xr - 0.05, o.y0, rz, P); ctx.lineTo(P.x, P.y);
        glowStroke('255,63,180', lw * 0.8, a * 0.8);
      }
      // Lichtschein auf dem Boden
      proj(o.x, 0, rz, P);
      var gs = o.w * P.s * 0.9;
      ctx.globalAlpha = 0.35 * a;
      ctx.drawImage(spr.mag, P.x - gs, P.y - gs * 0.22, gs * 2, gs * 0.44);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawOrb(o, rz) {
      var a = fog(rz);
      if (a <= 0 || rz + CAM_D < NEAR) return;
      var bob = Math.sin(time * 4 + o.ph) * 0.12;
      proj(o.x, o.y + bob, rz, P);
      var r = 0.34 * P.s;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.75 * a;
      ctx.drawImage(spr.cyan, P.x - r * 3.2, P.y - r * 3.2, r * 6.4, r * 6.4);
      ctx.globalAlpha = a;
      var rot = time * 3 + o.ph;
      var ex = Math.sin(rot) * r * 0.9;
      var h = r * 1.4;
      // zwei Facetten eines rotierenden Diamanten
      ctx.fillStyle = 'rgba(64,220,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(P.x, P.y - h); ctx.lineTo(P.x - r, P.y); ctx.lineTo(P.x, P.y + h); ctx.lineTo(P.x + ex, P.y); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(200,245,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(P.x, P.y - h); ctx.lineTo(P.x + ex, P.y); ctx.lineTo(P.x, P.y + h); ctx.lineTo(P.x + r, P.y); ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ── Neon-Lurch: ein Feuersalamander aus Licht, von hinten gesehen ──
    var LS = 1.2;   // Größe der Figur
    var NSP = 16;   // Punkte der Wirbelsäule (Schnauze → Schwanzspitze)
    // Halbe Breite und Rückenhöhe entlang der Wirbelsäule (s = 0 Schnauze … 1 Schwanzspitze)
    var WID = [[0, 0.2], [0.07, 0.38], [0.17, 0.27], [0.32, 0.39], [0.46, 0.41], [0.57, 0.33], [0.67, 0.19], [0.85, 0.09], [1, 0.02]];
    var TOP = [[0, 0.28], [0.07, 0.44], [0.17, 0.38], [0.34, 0.48], [0.55, 0.44], [0.67, 0.3], [1, 0.1]];
    // Leuchtflecken: Position entlang der Wirbelsäule, seitlicher Versatz (Anteil der Breite)
    var SPOTS = [[0.12, 0.55], [0.12, -0.55], [0.3, 0.5], [0.34, -0.45], [0.42, 0.05], [0.5, 0.5],
      [0.52, -0.5], [0.64, 0], [0.76, 0.1], [0.87, -0.05]];
    // Diagonaler Gang: vorne links + hinten rechts gemeinsam
    var LEGS = [
      { s: 0.24, side: -1, ph: 0 }, { s: 0.24, side: 1, ph: Math.PI },
      { s: 0.56, side: -1, ph: Math.PI }, { s: 0.56, side: 1, ph: 0 }
    ];
    var spine = [];
    for (var ni = 0; ni < NSP; ni++) {
      spine.push({ x: 0, y: 0, z: 1 - ni * 0.18, w: 0.2, nx: 1, nz: 0,
        L: { x: 0, y: 0, s: 0 }, R: { x: 0, y: 0, s: 0 }, C: { x: 0, y: 0, s: 0 } });
    }
    var T1 = { x: 0, y: 0, s: 0 }, T2 = { x: 0, y: 0, s: 0 }, T3 = { x: 0, y: 0, s: 0 };
    var body = { baseY: 0.12, cy: 1, sy: 0 };

    function interp(tab, s) {
      for (var i = 1; i < tab.length; i++) {
        if (s <= tab[i][0]) {
          var a = tab[i - 1], b = tab[i];
          return a[1] + (b[1] - a[1]) * (s - a[0]) / (b[0] - a[0]);
        }
      }
      return tab[tab.length - 1][1];
    }

    // Lokale Lurch-Koordinaten (x rechts, y hoch, z vorwärts) → Bildschirm
    function lp(lx, ly, lz, out) {
      lx *= LS; lz *= LS;
      return proj(px + lx * body.cy + lz * body.sy, body.baseY + ly * LS, playerZ + lz * body.cy - lx * body.sy, out);
    }

    function updateLurch(dt, lat) {
      var grounded = py <= 0.02 && vy <= 0;
      var moving = state !== 'over' && state !== 'paused';
      // Schrittfrequenz wächst mit dem Tempo; in der Luft und beim Rutschen kein Laufen
      var hz = moving && grounded && lu.flat < 0.5 ? 1.6 + speed * 0.19 : 0;
      lu.gait += dt * hz * Math.PI * 2;
      lu.wave += dt * (hz > 0 ? hz : (lu.flat > 0.5 && moving ? 3.2 : 1.2)) * Math.PI * 2;
      lu.flat += ((duckT > 0 || state === 'over' ? 1 : 0) - lu.flat) * Math.min(1, dt * 16);
      lu.sq += (0 - lu.sq) * Math.min(1, dt * 8);
      lu.look += (clamp(lat * 0.6, -1, 1) - lu.look) * Math.min(1, dt * 12);
      lu.yaw += (clamp(lat * 0.28, -0.45, 0.45) - lu.yaw) * Math.min(1, dt * 10);
      lu.tail += (clamp(-lat * 0.45, -0.7, 0.7) - lu.tail) * Math.min(1, dt * 5); // Schwanz schwingt nach
      var lb = 0;
      if (state === 'intro') lb = (time % 5) > 3.4 ? 1 : 0;
      else if (state === 'countdown') lb = countStep < 2 ? 1 : 0;
      else if (state === 'won') lb = stateT < 1.0 ? 1 : 0;
      else if (state === 'over') lb = 1;
      lu.lookBack += (lb - lu.lookBack) * Math.min(1, dt * 7);
      lu.nextBlink -= dt;
      if (lu.nextBlink <= 0) { lu.blink = 0.14; lu.nextBlink = rnd(1.8, 4.5); }
      lu.blink = Math.max(0, lu.blink - dt);
      lu.gulp = Math.max(0, lu.gulp - dt);
      lu.dizzy = Math.max(0, lu.dizzy - dt);
      if (lu.tongue) {
        lu.tongue.t += dt; // 0,07 s raus, 0,13 s zurück
        lu.tongue.z -= speed * dt;
        if (lu.tongue.t > 0.2) lu.tongue = null;
      }

      // Fußspuren beim Aufsetzen der Füße
      footprints = footprints.filter(function (f) { f.t += dt; return f.t < 1.1; });
      for (var k = 0; k < 4; k++) {
        var l = Math.sin(lu.gait + LEGS[k].ph);
        if (hz > 0 && lu.lift[k] > 0 && l <= 0) addFootprint(k);
        lu.lift[k] = l;
      }

      // Bauchrutscher: Funken unter dem Bauch
      if (grounded && duckT > 0 && (state === 'run' || state === 'countdown')) {
        for (var n = 0; n < (reduceMotion ? 1 : 3); n++) {
          particles.push({
            x: px + rnd(-0.4, 0.4), y: 0.04, z: playerZ + rnd(-0.7, 0.5),
            vx: rnd(-2.8, 2.8), vy: rnd(0.8, 3), vz: rnd(-1, 2),
            life: rnd(0.18, 0.4), max: 0.4, sp: Math.random() < 0.55 ? spr.yellow : spr.white, size: rnd(0.05, 0.11)
          });
        }
      }

      // Sieg: Freudensprünge
      if (state === 'won' && grounded && stateT > 0.1) {
        vy = JUMP_V * 0.72;
        lu.sq = -0.7;
      }
    }

    function addFootprint(k) {
      var L = LEGS[k], p = spine[Math.round(L.s * (NSP - 1))];
      var fx = p.x + L.side * (p.w * 0.85 + 0.42), fz = p.z + 0.3;
      footprints.push({
        x: px + (fx * body.cy + fz * body.sy) * LS,
        z: dist + playerZ + (fz * body.cy - fx * body.sy) * LS,
        side: L.side, t: 0
      });
    }

    function buildSpine() {
      var flat = lu.flat, air = py > 0.02;
      var ys = (1 - 0.3 * lu.sq) * (1 - 0.5 * flat);
      var ws = (1 + 0.2 * lu.sq) * (1 + 0.15 * flat);
      var bob = (air || flat > 0.5) ? 0 : Math.abs(Math.sin(lu.gait)) * 0.05;
      body.baseY = py + (0.1 + bob) * (1 - flat) + 0.02;
      body.cy = Math.cos(lu.yaw);
      body.sy = Math.sin(lu.yaw);
      var curl = air ? (vy > 0 ? 0.55 : 0.3) : 0; // Schwanz rollt sich im Sprung hoch
      var i, p;
      for (i = 0; i < NSP; i++) {
        var s = i / (NSP - 1);
        p = spine[i];
        var amp = air ? 0.03 : (0.05 + 0.2 * s * s) * (flat > 0.5 ? 1.3 : 1);
        p.z = 1.05 - s * 2.45;
        p.x = amp * Math.sin(lu.wave - s * 5.2) + lu.tail * s * s * 0.9 + lu.look * 0.14 * Math.max(0, 1 - s * 3);
        p.y = interp(TOP, s) * ys + curl * s * s * s;
        p.w = interp(WID, s) * ws * (s < 0.16 ? 1 + lu.gulp * 0.9 : 1); // Backen blähen sich nach dem Schnappen
      }
      for (i = 0; i < NSP; i++) {
        var a = spine[Math.max(0, i - 1)], b = spine[Math.min(NSP - 1, i + 1)];
        var tx = b.x - a.x, tz = b.z - a.z, len = Math.sqrt(tx * tx + tz * tz) || 1;
        p = spine[i];
        p.nx = -tz / len;
        p.nz = tx / len;
        var side = p.y * 0.55;
        lp(p.x - p.nx * p.w, side, p.z - p.nz * p.w, p.L);
        lp(p.x + p.nx * p.w, side, p.z + p.nz * p.w, p.R);
        lp(p.x, p.y, p.z, p.C);
      }
      p = spine[NSP - 1];
      lu.tipX = px + (p.x * body.cy + p.z * body.sy) * LS;
      lu.tipY = body.baseY + p.y * LS;
      lu.tipZ = playerZ + (p.z * body.cy - p.x * body.sy) * LS;
    }

    function drawLegs() {
      var ground = (py - body.baseY) / LS;
      var up = clamp(vy / JUMP_V, -1, 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (var k = 0; k < 4; k++) {
        var L = LEGS[k], p = spine[Math.round(L.s * (NSP - 1))], side = L.side;
        var front = L.s < 0.4;
        var sx = p.x + side * p.w * 0.85, sy = p.y * 0.5, sz = p.z;
        var fx, fy, fz;
        if (py > 0.02) {
          // Froschsprung: hinten gestreckt, vorne nach vorn greifen; beim Fallen Landung vorbereiten
          if (front) { fx = sx + side * 0.3; fy = sy - 0.25 + up * 0.1; fz = sz + 0.35 - (up < 0 ? 0.15 : 0); }
          else { fx = sx + side * (up > 0 ? 0.15 : 0.35); fy = sy - (up > 0 ? 0.4 : 0.2); fz = sz - (up > 0 ? 0.55 : 0.1); }
        } else if (lu.flat > 0.5) {
          // Bauchplatscher: Beine seitlich weg, paddeln
          var pad = state === 'over' ? 0 : Math.sin(time * 16 + L.ph) * 0.14;
          fx = sx + side * 0.55; fy = ground + 0.04; fz = sz + (front ? 0.22 : -0.18) + pad;
        } else {
          var ph = lu.gait + L.ph;
          fx = sx + side * 0.42;
          fy = ground + Math.max(0, Math.sin(ph)) * 0.2;
          fz = sz - Math.cos(ph) * 0.3;
        }
        var ex = (sx + fx) / 2 + side * 0.18, ey = Math.max(sy, fy) + 0.16, ez = (sz + fz) / 2;
        lp(sx, sy, sz, T1);
        lp(ex, ey, ez, T2);
        lp(fx, fy, fz, T3);
        var lw = Math.max(2.5, 0.16 * LS * T2.s);
        ctx.globalAlpha = lu.alpha;
        ctx.beginPath();
        ctx.moveTo(T1.x, T1.y); ctx.lineTo(T2.x, T2.y); ctx.lineTo(T3.x, T3.y);
        ctx.strokeStyle = '#05161d';
        ctx.lineWidth = lw * 1.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'lighter';
        glowStroke('64,220,255', lw * 0.32, 0.9 * lu.alpha);
        // Zehen
        var fX = T3.x, fY = T3.y;
        ctx.beginPath();
        var toes = [[0.11, 0.09], [0.14, 0], [0.1, -0.08]];
        for (var t = 0; t < 3; t++) {
          lp(fx + side * toes[t][0], fy, fz + toes[t][1], T1);
          ctx.moveTo(fX, fY);
          ctx.lineTo(T1.x, T1.y);
        }
        glowStroke('64,220,255', lw * 0.2, 0.9 * lu.alpha);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function outlinePath() {
      ctx.beginPath();
      ctx.moveTo(spine[0].L.x, spine[0].L.y);
      for (var i = 1; i < NSP; i++) ctx.lineTo(spine[i].L.x, spine[i].L.y);
      for (i = NSP - 1; i >= 0; i--) ctx.lineTo(spine[i].R.x, spine[i].R.y);
      ctx.closePath();
    }

    function drawBody() {
      var a = lu.alpha, i;
      ctx.globalAlpha = a;
      outlinePath();
      ctx.fillStyle = '#041a22';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      // Rückenlicht: weicher Streifen entlang der Wirbelsäule (gibt Volumen)
      ctx.lineCap = 'round';
      for (i = 1; i < NSP; i++) {
        var p0 = spine[i - 1].C, p1 = spine[i].C;
        ctx.strokeStyle = 'rgba(64,220,255,' + (0.17 * a) + ')';
        ctx.lineWidth = Math.max(1, spine[i].w * LS * p1.s * 1.1);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      outlinePath();
      glowStroke('64,220,255', clamp(spine[8].C.s * 0.03, 1, 3.2), a);
      // Leuchtflecken wie beim Feuersalamander
      for (var k = 0; k < SPOTS.length; k++) {
        var sp = SPOTS[k], q = spine[Math.round(sp[0] * (NSP - 1))];
        lp(q.x + q.nx * q.w * sp[1], q.y * 0.97, q.z + q.nz * q.w * sp[1], T1);
        var r = 0.075 * LS * T1.s * (1 - sp[0] * 0.35) * (0.9 + 0.1 * Math.sin(time * 5 + k));
        ctx.globalAlpha = 0.9 * a;
        ctx.drawImage(spr.yellow, T1.x - r * 2.6, T1.y - r * 2.6, r * 5.2, r * 5.2);
        ctx.fillStyle = 'rgba(255,228,140,' + a + ')';
        ctx.beginPath();
        ctx.arc(T1.x, T1.y, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = a;
      var tip = spine[NSP - 1].C, tr = 0.22 * LS * tip.s;
      ctx.drawImage(spr.cyan, tip.x - tr, tip.y - tr, tr * 2, tr * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawFace() {
      var a = lu.alpha, h = spine[1];
      var ey = h.y + 0.2 * (1 - 0.5 * lu.flat);
      var squint = lu.flat > 0.5 && state !== 'over';
      var dizzy = lu.dizzy > 0 || state === 'over';
      for (var e = -1; e <= 1; e += 2) {
        lp(h.x + h.nx * 0.25 * e, ey, h.z + h.nz * 0.25 * e + 0.02, T1);
        var r = 0.19 * LS * T1.s;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 * a;
        ctx.drawImage(spr.white, T1.x - r * 2.4, T1.y - r * 2.4, r * 4.8, r * 4.8);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = a;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (squint) {
          // Zugekniffen: > <
          var dir = -e;
          ctx.strokeStyle = '#eafcff';
          ctx.lineWidth = Math.max(1.5, r * 0.32);
          ctx.beginPath();
          ctx.moveTo(T1.x - 0.6 * r * dir, T1.y - 0.55 * r);
          ctx.lineTo(T1.x + 0.5 * r * dir, T1.y);
          ctx.lineTo(T1.x - 0.6 * r * dir, T1.y + 0.55 * r);
          ctx.stroke();
          continue;
        }
        var open = lu.blink > 0 ? 0.12 : 1;
        ctx.fillStyle = '#eafcff';
        ctx.beginPath();
        ctx.ellipse(T1.x, T1.y, r, r * open, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#40dcff';
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.stroke();
        if (open < 0.5) continue;
        if (dizzy) {
          // Spiralaugen
          ctx.strokeStyle = '#04121a';
          ctx.lineWidth = Math.max(1, r * 0.15);
          ctx.beginPath();
          for (var q = 0; q < 24; q++) {
            var ang = q * 0.55 + time * 9 * e, rr = r * 0.82 * q / 24;
            var xx = T1.x + Math.cos(ang) * rr, yy = T1.y + Math.sin(ang) * rr;
            if (q) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        } else {
          // Pupillen: schauen nach vorn (oben am Auge), zur Seite beim Spurwechsel, zur Kamera beim Umschauen
          var lb = lu.lookBack;
          var dx = lu.look * 0.45 * r * (1 - lb * 0.5);
          var dy = -0.5 * r * (1 - lb);
          var pr = r * (0.42 + 0.12 * lb);
          ctx.fillStyle = '#04121a';
          ctx.beginPath();
          ctx.arc(T1.x + dx, T1.y + dy, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(T1.x + dx - pr * 0.35, T1.y + dy - pr * 0.35, pr * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Grinsen und Bäckchen beim Umschauen
      if (lu.lookBack > 0.3 && !dizzy) {
        lp(h.x, h.y + 0.02, h.z - 0.02, T1);
        var r2 = 0.2 * LS * T1.s;
        ctx.globalAlpha = a * lu.lookBack;
        ctx.strokeStyle = '#eafcff';
        ctx.lineWidth = Math.max(1.5, r2 * 0.22);
        ctx.beginPath();
        ctx.arc(T1.x, T1.y - r2 * 0.4, r2, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        for (e = -1; e <= 1; e += 2) {
          ctx.drawImage(spr.mag, T1.x + e * r2 * 1.5 - r2 * 0.7, T1.y - r2 * 0.1 - r2 * 0.7, r2 * 1.4, r2 * 1.4);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }

    function drawTongue() {
      var tg = lu.tongue;
      if (!tg) return;
      var ext = tg.t < 0.07 ? tg.t / 0.07 : Math.max(0, 1 - (tg.t - 0.07) / 0.12);
      var h = spine[0];
      lp(h.x, h.y * 0.6, h.z + 0.05, T1);
      proj(tg.x, tg.y, tg.z, T2);
      var tx = T1.x + (T2.x - T1.x) * ext, ty = T1.y + (T2.y - T1.y) * ext;
      var lw = Math.max(3, 0.12 * LS * T1.s);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(T1.x, T1.y);
      ctx.quadraticCurveTo((T1.x + tx) / 2, Math.min(T1.y, ty) - lw * 2, tx, ty);
      glowStroke('255,95,162', lw, 1);
      var r = lw * 1.5;
      ctx.drawImage(spr.mag, tx - r * 2, ty - r * 2, r * 4, r * 4);
      if (tg.t > 0.07) {
        var orr = 0.3 * T2.s * ext + 4;
        ctx.drawImage(spr.cyan, tx - orr, ty - orr, orr * 2, orr * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Schwindel-Sternchen um den Kopf nach einem Crash
    function drawStars() {
      var amt = state === 'over' ? 1 : clamp(lu.dizzy / 0.4, 0, 1);
      if (amt <= 0) return;
      var h = spine[1];
      ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 3; k++) {
        var ang = time * 5 + k * 2.094;
        lp(h.x + Math.cos(ang) * 0.45, h.y + 0.6, h.z + Math.sin(ang) * 0.32, T1);
        var r = 0.1 * LS * T1.s;
        ctx.globalAlpha = amt;
        ctx.drawImage(spr.yellow, T1.x - r * 2.5, T1.y - r * 2.5, r * 5, r * 5);
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        for (var q = 0; q < 8; q++) {
          var rr = q % 2 ? r * 0.38 : r, aa = q * Math.PI / 4 + time * 4;
          var xx = T1.x + Math.cos(aa) * rr, yy = T1.y + Math.sin(aa) * rr;
          if (q) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawPlayer() {
      lu.alpha = invT > 0 && state === 'run' && Math.floor(invT * 12) % 2 === 0 ? 0.4 : 1;
      if (state === 'won') lu.alpha = clamp(1 - (playerZ - 25) / 35, 0, 1);
      if (lu.alpha <= 0) return;
      buildSpine();

      // Bodenglühen (nicht im Spiegelbild)
      var mid = spine[6];
      if (!mirror) {
      lp(mid.x, -body.baseY / LS, mid.z, T1);
      var sh = 1.5 * T1.s * clamp(1 - py * 0.35, 0.3, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * lu.alpha;
      ctx.drawImage(spr.cyan, T1.x - sh, T1.y - sh * 0.3, sh * 2, sh * 0.6);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      }

      drawLegs();
      drawBody();
      drawFace();
      drawTongue();
      drawStars();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    function drawFootprints() {
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < footprints.length; i++) {
        var f = footprints[i], rz = f.z - dist;
        if (rz + CAM_D < NEAR) continue;
        proj(f.x, 0.01, rz, T1);
        var r = 0.08 * LS * T1.s;
        ctx.globalAlpha = (1 - f.t / 1.1) * 0.75;
        ctx.drawImage(spr.cyan, T1.x - r * 2, T1.y - r * 0.9, r * 4, r * 1.8);
        for (var t = -1; t <= 1; t++) {
          proj(f.x + (0.08 * t + f.side * 0.05) * LS, 0.01, rz + (0.14 - Math.abs(t) * 0.03) * LS, T2);
          var tr = r * 0.9;
          ctx.drawImage(spr.cyan, T2.x - tr, T2.y - tr * 0.6, tr * 2, tr * 1.2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Lichtschweif der Schwanzspitze
    function drawTrail() {
      if (trail.length < 2) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      var n = trail.length;
      for (var i = 1; i < n; i++) {
        var a0 = trail[i - 1], a1 = trail[i];
        var z0 = a0.d - dist + a0.z, z1 = a1.d - dist + a1.z;
        if (z1 + CAM_D < NEAR) break;
        proj(a0.x, a0.y, z0, T1);
        proj(a1.x, a1.y, z1, T2);
        var f = 1 - i / n;
        ctx.strokeStyle = 'rgba(64,220,255,' + (0.55 * f * lu.alpha) + ')';
        ctx.lineWidth = Math.max(1, 0.09 * T2.s * f);
        ctx.beginPath();
        ctx.moveTo(T1.x, T1.y);
        ctx.lineTo(T2.x, T2.y);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawParticles() {
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        proj(p.x, p.y, p.z, P);
        var s = p.size * P.s;
        if (s < 0.5) continue;
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.drawImage(p.sp, P.x - s, P.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      for (var r = 0; r < rings.length; r++) {
        var g = rings[r];
        proj(g.x, g.y, g.z, P);
        var rad = (0.4 + g.t * 5) * P.s;
        ctx.strokeStyle = 'rgba(64,220,255,' + (1 - g.t / 0.45) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(P.x, P.y, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawArch(a, rz) {
      if (rz + CAM_D < NEAR + 0.2) return;
      // Ringe kurz vor der Kamera ausblenden (sonst breite Balken quer übers Bild)
      var f = fog(rz) * clamp((rz + 2.5) / 4, 0, 1);
      if (f <= 0) return;
      var i, th;
      ctx.beginPath();
      for (i = 0; i <= 8; i++) {
        th = i * Math.PI / 8;
        proj(Math.cos(th) * TUN_R, Math.sin(th) * TUN_R * 0.95, rz, P);
        if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y);
      }
      var col = a.k % 2 ? '255,63,180' : '64,220,255';
      var pulse = 0.55 + 0.45 * Math.sin(time * 7 - a.k * 0.8);
      var lw = clamp(P.s * 0.04, 0.8, 3.2) * (a.gate ? 1.6 : 1);
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(col, lw, f * (a.gate ? 1 : pulse));
      // Lichtpunkte an den Ecken
      var sp = a.k % 2 ? spr.mag : spr.cyan;
      ctx.globalAlpha = 0.8 * f;
      for (i = 1; i < 8; i += 2) {
        th = i * Math.PI / 8;
        proj(Math.cos(th) * TUN_R, Math.sin(th) * TUN_R * 0.95, rz, P);
        var r = clamp(P.s * 0.3, 3, 26);
        ctx.drawImage(sp, P.x - r, P.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Längslinien der Tunnelröhre
    function drawTunnelWalls() {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.2;
      for (var t = 0; t < tunnels.length; t++) {
        var z0 = Math.max(-4.3, tunnels[t].start - dist), z1 = Math.min(FAR, tunnels[t].end - dist);
        if (z1 <= z0) continue;
        ctx.strokeStyle = 'rgba(64,220,255,' + (0.22 * fog(z0)) + ')';
        ctx.beginPath();
        for (var i = 1; i < 8; i++) {
          var th = i * Math.PI / 8, x = Math.cos(th) * TUN_R, y = Math.sin(th) * TUN_R * 0.95;
          proj(x, y, z0, P); ctx.moveTo(P.x, P.y);
          proj(x, y, z1, P); ctx.lineTo(P.x, P.y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawItem(it) {
      if (it.arch) drawArch(it.arch, it.z);
      else if (!it.o) { if (!mirror) { drawPlayer(); drawTrail(); } } // flacher Lurch: Spiegelbild wirkt wie Doppelgänger
      else if (it.o.type === 'orb') drawOrb(it.o, it.z);
      else drawBox(it.o, it.z);
    }

    // Spiegelbild aller Objekte in halber Auflösung, additiv auf die Straße gelegt
    function drawReflections(list) {
      if (!rctx) return;
      var rs = dpr * REFL_SCALE;
      rctx.setTransform(1, 0, 0, 1, 0, 0);
      rctx.globalCompositeOperation = 'source-over';
      rctx.globalAlpha = 1;
      rctx.clearRect(0, 0, refl.width, refl.height);
      rctx.setTransform(rs, 0, 0, rs, 0, 0);
      ctx = rctx;
      mirror = true;
      try {
        for (var j = 0; j < list.length; j++) drawItem(list[j]);
      } finally {
        mirror = false;
        ctx = mainCtx;
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.38;
      ctx.drawImage(refl, 0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function render() {
      Fe = F * fov;
      camYe = camY * F / Fe;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#04060b';
      ctx.fillRect(0, 0, W, H);

      var sx = 0, sy = 0;
      if (shake > 0 && !reduceMotion) {
        sx = (Math.random() - 0.5) * shake * 22;
        sy = (Math.random() - 0.5) * shake * 22;
      }
      ctx.translate(W / 2 + sx, H / 2 + sy);
      ctx.rotate(roll);
      ctx.translate(-W / 2, -H / 2);

      if (bg) ctx.drawImage(bg, -120 - camX * 7, -140, bgW, bgH);
      ctx.fillStyle = floorGrad;
      ctx.fillRect(-140, horizon, W + 280, H - horizon + 140);

      drawGrid();
      drawStreaks();
      if (tunIn > 0.01) {
        ctx.fillStyle = 'rgba(3,4,10,' + (0.8 * tunIn) + ')';
        ctx.fillRect(-140, -140, W + 280, H + 280);
      }
      drawRoad();
      drawFootprints();
      drawTunnelWalls();

      // Objekte von hinten nach vorn, Spielfigur dazwischen einsortiert
      var list = [];
      for (var i = 0; i < objects.length; i++) {
        var rz = objects[i].z - dist;
        if (rz < FAR + 2 && rz + CAM_D > NEAR) list.push({ o: objects[i], z: rz });
      }
      for (var t = 0; t < tunnels.length; t++) {
        var tn = tunnels[t], nR = Math.round((tn.end - tn.start) / TUN_STEP);
        for (var k = 0; k <= nR; k++) {
          var az = tn.start + k * TUN_STEP - dist;
          if (az < FAR && az + CAM_D > NEAR) list.push({ arch: { k: k, gate: k === 0 || k === nR }, z: az });
        }
      }
      list.push({ o: null, z: playerZ + 0.2 });
      list.sort(function (a, b) { return b.z - a.z; });
      drawReflections(list);
      for (var j = 0; j < list.length; j++) drawItem(list[j]);
      drawParticles();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      if (flash > 0) {
        ctx.fillStyle = 'rgba(' + flashCol + ',' + (flash * 0.32) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // ── Schleife ──
    function frame(t) {
      raf = 0;
      if (destroyed || hidden) return;
      var raw = last ? (t - last) / 1000 : 0.016;
      last = t;
      var dt = Math.min(0.034, raw);
      // Bei schwacher Grafikleistung Auflösung einmalig senken
      if (state === 'run' && !perfChecked && raw < 0.2) {
        perfFrames++;
        perfSum += raw;
        if (perfFrames >= 90) {
          perfChecked = true;
          if (perfSum / perfFrames > 0.024 && dpr > 1) {
            dpr = Math.max(1, dpr - 0.5);
            W = 0;
            resize();
          }
        }
      }
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function startLoop() {
      if (!raf && !destroyed && !hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    function onVisibility() {
      if (document.hidden) {
        hidden = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (state === 'run' || state === 'countdown') {
          state = 'paused';
          stateT = 0;
          countEl.classList.remove('is-pop');
          showCard({ label: cfg.label, title: 'Pause', text: 'Weiter geht es mit einem kurzen Countdown.', button: 'Weiter', action: startCountdown });
        }
      } else {
        hidden = false;
        startLoop();
      }
    }

    // ── Eingabe: Wischgesten ──
    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    }
    function onMove(e) {
      if (!ptr || e.pointerId !== ptr.id || ptr.done) return;
      var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      ptr.done = true;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
      else if (dy < 0) jump();
      else duck();
    }
    function onUp(e) {
      if (ptr && e.pointerId === ptr.id) ptr = null;
    }
    function onKey(e) {
      if (!root.isConnected || cardShown) return;
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') move(-1);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') move(1);
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') jump();
      else if (k === 'ArrowDown' || k === 's' || k === 'S') duck();
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    card.addEventListener('click', onCardClick);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof ResizeObserver === 'function') {
      resizeObs = new ResizeObserver(function () { if (!destroyed) resize(); });
      resizeObs.observe(root);
    }

    resize();
    updateHud(false);
    showCard({
      label: cfg.label,
      title: cfg.title,
      text: cfg.intro,
      meta: 'Ziel: ' + cfg.goal + ' Lichter · ' + cfg.lives + ' Leben',
      controls: true,
      button: cfg.startText,
      action: startRun
    });
    hidden = !!document.hidden;
    render();
    startLoop();

    return {
      // Nur lesend, für automatisierte Tests (Testseite)
      _snapshot: function () {
        return {
          state: state, lane: lane, px: px, py: py, duck: duckT > 0, lives: lives, orbs: orbs, speed: speed,
          tongue: lu.tongue ? lu.tongue.t : -1, tunnel: tunIn,
          objects: objects.map(function (o) {
            return { type: o.type, lane: Math.round(o.x / LANE), z: o.z - dist, y: o.y };
          })
        };
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (resizeObs) resizeObs.disconnect();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        card.removeEventListener('click', onCardClick);
        window.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
        if (root.parentNode) root.parentNode.removeChild(root);
        objects = []; particles = []; trail = []; rings = []; tunnels = [];
        if (refl) refl.width = refl.height = 0;
        canvas.width = canvas.height = 0;
        removeStyle();
      }
    };
  }

  window.SchnitzelGames = window.SchnitzelGames || {};
  window.SchnitzelGames[NAME] = {
    title: 'Lurch-Runner',
    mount: mount
  };
})();
