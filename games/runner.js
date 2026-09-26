/* Schnitzeljagd-Minispiel „Neon-Runner"
 * Endlos-Läufer auf einer Neon-Straße mit 3 Spuren (Canvas, Pseudo-3D).
 * Registriert sich als window.SchnitzelGames.runner. Vertrag: games/README.md
 */
(function () {
  'use strict';

  var NAME = 'runner';

  var DEFAULTS = {
    goal: 60,
    lives: 3,
    difficulty: 2,
    title: 'Neon-Runner',
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
    var bg = null, bgW = 0, bgH = 0, floorGrad = null, roadGrad = null, vignette = null;
    var spr = {
      cyan: glowSprite(64, 220, 255),
      mag: glowSprite(255, 63, 180),
      white: glowSprite(220, 245, 255),
      green: glowSprite(74, 222, 128),
      red: glowSprite(251, 113, 133)
    };

    var state = 'intro';
    var stateT = 0;
    var time = 0;
    var dist = 0, speed = 8, baseSpeed = diff.v0, runTime = 0;
    var lane = 0, px = 0, py = 0, vy = 0, duckT = 0, invT = 0, bank = 0, roll = 0;
    var playerZ = 0;
    var lives = cfg.lives, orbs = 0, attempts = 0;
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
      var s = F / dz;
      out.x = W / 2 + (x - camX) * s;
      out.y = horizon + (camY - y) * s;
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
      buildBackground();
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
      failSent = false;
      // Nach jedem gescheiterten Versuch etwas ruhiger starten
      baseSpeed = diff.v0 * Math.max(0.72, 1 - 0.07 * attempts);
      nextSpawn = dist + 48;
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
      burst(px, 0.1, playerZ - 0.3, 8, spr.cyan, 3, 0.35);
    }

    function duck() {
      if (state !== 'run' && state !== 'countdown') return;
      if (py > 0.02) vy = Math.min(vy, -16); // schnell landen
      duckT = DUCK_T;
    }

    function crash(o) {
      lives--;
      invT = 1.6;
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
      objects.forEach(function (o) { if (o.type !== 'orb') shatter(o); });
      objects = objects.filter(function (o) { return o.type === 'orb'; });
      burst(px, py + 0.6, playerZ, 60, spr.green, 12, 1.4);
      burst(px, py + 0.6, playerZ, 40, spr.cyan, 10, 1.2);
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
    function addLow(ln, z) { objects.push({ type: 'low', x: ln * LANE, z: z, w: LANE * 0.94, d: 0.5, y0: 0, y1: 0.85 }); }
    function addBeam(ln, z) { objects.push({ type: 'beam', x: ln * LANE, z: z, w: LANE * 0.94, d: 0.5, y0: 0.95, y1: 1.75 }); }
    function addOrbLine(ln, z0, n, y) {
      for (var i = 0; i < n; i++) {
        objects.push({ type: 'orb', x: ln * LANE, z: z0 + i * 2.6, y: y || 0.75, ph: Math.random() * 6, w: 0, d: 0 });
      }
    }
    function addOrbArc(ln, zc) {
      for (var i = -2; i <= 2; i++) {
        objects.push({ type: 'orb', x: ln * LANE, z: zc + i * 2.2, y: 0.8 + 1.1 * (1 - (i * i) / 5), ph: Math.random() * 6, w: 0, d: 0 });
      }
    }

    function spawnRow() {
      var z = nextSpawn;
      var prog = clamp(runTime / 60, 0, 1);
      var r = Math.random();
      var a = Math.floor(Math.random() * 3) - 1;
      var others = [-1, 0, 1].filter(function (l) { return l !== a; });
      var b = others[Math.floor(Math.random() * 2)];
      var withOrbs = Math.random() < 0.62;

      if (r < 0.16 - prog * 0.06) {
        // Nur Lichter (Verschnaufpause)
        addOrbLine(a, z - 6, 5);
      } else if (r < 0.40) {
        addWall(a, z);
        if (withOrbs) addOrbLine(b, z - 9, 4);
      } else if (r < 0.56 + prog * 0.04) {
        addWall(others[0], z);
        addWall(others[1], z);
        if (withOrbs) addOrbLine(a, z - 9, 4);
      } else if (r < 0.70) {
        addLow(-1, z); addLow(0, z); addLow(1, z);
        if (withOrbs) addOrbArc(a, z);
      } else if (r < 0.84) {
        addBeam(-1, z); addBeam(0, z); addBeam(1, z);
        if (withOrbs) addOrbLine(a, z - 5, 4, 0.35);
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
          if (state === 'run' || state === 'countdown') burst(px, 0.05, playerZ - 0.2, 6, spr.cyan, 2.5, 0.3);
        }
      }
      if (duckT > 0) duckT = Math.max(0, duckT - dt);
      if (invT > 0) invT = Math.max(0, invT - dt);
      var lat = lane * LANE - px;
      bank += (clamp(-lat * 0.22, -0.5, 0.5) - bank) * Math.min(1, dt * 12);
      var rollT = reduceMotion ? 0 : clamp(lat * 0.018, -0.045, 0.045);
      roll += (rollT - roll) * Math.min(1, dt * 8);
      camX += (px * 0.55 - camX) * Math.min(1, dt * 8);

      if (state === 'won') {
        playerZ += dt * (8 + stateT * 70);
        if (stateT > 1.1 && !cardShown) {
          showCard({ label: cfg.label, title: 'Geschafft', titleClass: 'is-ok', text: cfg.winText, meta: orbs + ' von ' + cfg.goal + ' Lichtern' });
        }
        if (stateT > 1.9 && !winSent) {
          winSent = true;
          safeCall(onWin);
        }
      }
      if (state === 'over' && stateT > 1.1 && !cardShown) {
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
            if (Math.abs(rz - playerZ) < 1.1 && Math.abs(o.x - px) < 1.05 && Math.abs(o.y - (py + 0.5)) < 1.15) {
              collect(o);
              continue;
            }
          } else if (invT <= 0 && rz - o.d / 2 < 1.0 && rz + o.d / 2 > -0.7 && Math.abs(o.x - px) < o.w / 2 + 0.45) {
            var top = py + (duckT > 0 ? 0.5 : 1.15);
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
      trail.unshift({ x: px, y: py, d: dist, duck: duckT > 0 });
      while (trail.length > 2 && (trail[trail.length - 1].d - dist + playerZ - 0.55) < -CAM_D + NEAR + 0.2) trail.pop();
      if (trail.length > 90) trail.length = 90;

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
      if (o.y1 < camY) face(3, 2, 6, 7);
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
      if (o.y1 < camY) { ctx.moveTo(c[3].x, c[3].y); ctx.lineTo(c[7].x, c[7].y); ctx.lineTo(c[6].x, c[6].y); ctx.lineTo(c[2].x, c[2].y); }
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

    var SHIP = [
      [0, 0.30, 1.35],   // 0 Spitze
      [-0.8, 0.22, -0.55], // 1 hinten links
      [0.8, 0.22, -0.55],  // 2 hinten rechts
      [0, 0.78, -0.3],   // 3 Finne oben
      [0, 0.04, -0.35]   // 4 unten
    ];
    var SP = [];
    for (var pi = 0; pi < 5; pi++) SP.push({ x: 0, y: 0, s: 0 });

    function drawPlayer() {
      var hScale = duckT > 0 ? 0.45 : 1;
      var hover = 0.22 + (py === 0 ? Math.sin(time * 6) * 0.04 : 0);
      var blink = invT > 0 && Math.floor(invT * 12) % 2 === 0;
      if (state === 'over' && stateT > 0.05) return; // zerstört
      var fz = playerZ;
      var alpha = blink ? 0.35 : 1;
      if (state === 'won') alpha = clamp(1 - stateT * 0.8, 0, 1);
      if (alpha <= 0) return;

      // Schatten / Bodenglühen
      proj(px, 0, fz + 0.2, P);
      var sh = 1.3 * P.s * clamp(1 - py * 0.35, 0.3, 1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * alpha;
      ctx.drawImage(spr.cyan, P.x - sh, P.y - sh * 0.25, sh * 2, sh * 0.5);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      var cb = Math.cos(bank), sb = Math.sin(bank);
      for (var i = 0; i < 5; i++) {
        var lx = SHIP[i][0], ly = SHIP[i][1] * hScale;
        proj(px + lx * cb - ly * sb, py + hover + lx * sb + ly * cb, fz + SHIP[i][2], SP[i]);
      }
      function tri(a, b, c) {
        ctx.moveTo(SP[a].x, SP[a].y); ctx.lineTo(SP[b].x, SP[b].y); ctx.lineTo(SP[c].x, SP[c].y); ctx.closePath();
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#061520';
      ctx.beginPath(); tri(0, 1, 3); tri(0, 2, 3); ctx.fill();
      ctx.fillStyle = 'rgba(64,220,255,0.28)';
      ctx.beginPath(); tri(0, 1, 3); ctx.fill();
      ctx.fillStyle = 'rgba(64,220,255,0.14)';
      ctx.beginPath(); tri(0, 2, 3); ctx.fill();
      ctx.fillStyle = '#0a2230';
      ctx.beginPath(); tri(1, 2, 3); ctx.fill();

      var lw = clamp(SP[1].s * 0.03, 1, 3.4);
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(SP[1].x, SP[1].y); ctx.lineTo(SP[0].x, SP[0].y); ctx.lineTo(SP[2].x, SP[2].y);
      ctx.lineTo(SP[3].x, SP[3].y); ctx.lineTo(SP[1].x, SP[1].y); ctx.lineTo(SP[2].x, SP[2].y);
      ctx.moveTo(SP[0].x, SP[0].y); ctx.lineTo(SP[3].x, SP[3].y);
      glowStroke('64,220,255', lw, alpha);

      // Triebwerk
      var ex = (SP[1].x + SP[2].x) / 2, ey = (SP[1].y + SP[2].y + SP[3].y * 2) / 4;
      var es = SP[1].s * (0.55 + Math.sin(time * 30) * 0.06 + (state === 'won' ? 0.5 : 0));
      ctx.globalAlpha = alpha;
      ctx.drawImage(spr.white, ex - es, ey - es, es * 2, es * 2);
      ctx.drawImage(spr.cyan, ex - es * 2, ey - es * 1.2, es * 4, es * 2.4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Leuchtwand hinter der Spielfigur (verläuft Richtung Kamera)
    function drawTrail() {
      if (trail.length < 2 || (state === 'over' && stateT > 0.05)) return;
      ctx.globalCompositeOperation = 'lighter';
      var n = trail.length;
      var prevB = null, prevT = null;
      for (var i = 0; i < n; i++) {
        var t = trail[i];
        var z = t.d - dist + playerZ - 0.55;
        if (z + CAM_D < NEAR) break;
        var hb = t.y + 0.2, ht = t.y + (t.duck ? 0.35 : 0.62);
        var B = proj(t.x, hb, z, { x: 0, y: 0, s: 0 });
        var T = proj(t.x, ht, z, { x: 0, y: 0, s: 0 });
        if (prevB) {
          var a = 0.5 * (1 - i / n);
          ctx.fillStyle = 'rgba(64,220,255,' + (a * 0.45) + ')';
          ctx.beginPath();
          ctx.moveTo(prevB.x, prevB.y); ctx.lineTo(prevT.x, prevT.y); ctx.lineTo(T.x, T.y); ctx.lineTo(B.x, B.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(200,245,255,' + a + ')';
          ctx.lineWidth = Math.max(1, T.s * 0.02);
          ctx.beginPath();
          ctx.moveTo(prevT.x, prevT.y); ctx.lineTo(T.x, T.y);
          ctx.stroke();
        }
        prevB = B; prevT = T;
      }
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

    function render() {
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
      drawRoad();

      // Objekte von hinten nach vorn, Spielfigur dazwischen einsortiert
      var list = [];
      for (var i = 0; i < objects.length; i++) {
        var rz = objects[i].z - dist;
        if (rz < FAR + 2 && rz + CAM_D > NEAR) list.push({ o: objects[i], z: rz });
      }
      list.push({ o: null, z: playerZ + 0.2 });
      list.sort(function (a, b) { return b.z - a.z; });
      for (var j = 0; j < list.length; j++) {
        var it = list[j];
        if (!it.o) { drawPlayer(); drawTrail(); }
        else if (it.o.type === 'orb') drawOrb(it.o, it.z);
        else drawBox(it.o, it.z);
      }
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
        objects = []; particles = []; trail = []; rings = [];
        canvas.width = canvas.height = 0;
        removeStyle();
      }
    };
  }

  window.SchnitzelGames = window.SchnitzelGames || {};
  window.SchnitzelGames[NAME] = {
    title: 'Neon-Runner',
    mount: mount
  };
})();
