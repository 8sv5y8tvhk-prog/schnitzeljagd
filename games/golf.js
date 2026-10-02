/* Schnitzeljagd-Minispiel „Lurch-Golf"
 * Minigolf auf schwebenden Neon-Bahnen, der eingerollte Lurch ist der Ball.
 * Canvas mit Perspektive (schräg von oben). Registriert sich als window.SchnitzelGames.golf.
 * Vertrag: games/README.md
 */
(function () {
  'use strict';

  var NAME = 'golf';

  var DEFAULTS = {
    holes: 3,
    extraStrokes: 4,
    title: 'Lurch-Golf',
    label: 'Minispiel',
    intro: 'Bring den eingerollten Lurch mit möglichst wenigen Schlägen ins Loch.',
    winText: 'Alle Bahnen geschafft!',
    startText: "Los geht's"
  };

  var BALL_R = 0.28;
  var HOLE_R = 0.36;
  var WALL_H = 0.42;
  var MAXV = 13;
  var DECEL = 2.6;
  var DRAG = 0.22;
  var REST_WALL = 0.72;
  var GRAV = 16;
  var PITCH = 0.9;    // Blickneigung der Kamera (rad)
  var CAM_D = 11.5;   // Kamera-Abstand zum Zielpunkt
  var SUB = 1 / 240;  // Physik-Teilschritt

  function rectWalls(x0, z0, x1, z1) {
    return [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  }

  // ── Die Bahnen (Koordinaten: x quer, z nach vorn; Einheit ≈ Balldurchmesser × 1,8) ──
  var COURSE = [
    {
      name: 'Warmlaufen', par: 2, tee: [0, 0], hole: [0.9, 13.6],
      floor: [[-2, -1.5, 2, 15.5]],
      walls: rectWalls(-2, -1.5, 2, 15.5),
      bumpers: [[-0.7, 6.2, 0.45], [1.0, 9.0, 0.45]],
      pads: [[-0.6, 2.2, 0.6, 3.8, 0, 1]],
      drops: []
    },
    {
      name: 'Portal & Windmühle', par: 3, tee: [0, 0], hole: [-2.2, 16.8],
      floor: [[-2, -1.5, 2, 9], [-3.2, 9, 3.2, 18.5]],
      walls: [[-2, -1.5, 2, -1.5], [2, -1.5, 2, 9], [-2, 9, -2, -1.5], [-3.2, 9, -0.95, 9], [0.95, 9, 3.2, 9],
        [3.2, 9, 3.2, 18.5], [3.2, 18.5, -3.2, 18.5], [-3.2, 18.5, -3.2, 9], [-3.2, 14.6, -1.0, 14.6], [-1.0, 14.6, -1.0, 15.9]],
      windmill: { x: 0, z: 9, len: 1.25, speed: 1.5 },
      portals: [{ a: [1.3, 5.5], b: [-0.2, 17.2] }],
      bumpers: [[1.9, 12.5, 0.42]],
      pads: [],
      drops: []
    },
    {
      name: 'Sprungschanze', par: 3, tee: [0, 0.5], hole: [-0.8, 16.4],
      floor: [[-2, -1.5, 3, 7.4], [2.2, 7.4, 3, 12], [-2.5, 12, 3, 18.5]],
      walls: [[-2, -1.5, 3, -1.5], [3, -1.5, 3, 18.5], [3, 18.5, -2.5, 18.5], [-2.5, 18.5, -2.5, 12], [-2, 7.4, -2, -1.5],
        [-2, 7.4, -1, 7.4], [1, 7.4, 2.2, 7.4], [2.2, 7.4, 2.2, 12]],
      ramp: { x0: -1, z0: 6.0, x1: 1, z1: 7.4, h: 0.45 },
      bumpers: [[-1.3, 15.2, 0.4], [1.5, 16.6, 0.4]],
      pads: [],
      drops: [[-1, 7.4, 1, 7.4], [-2.5, 12, 2.2, 12]]
    }
  ];

  var CSS = [
    '.sg-golf{position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg,#0a0e14);',
    'font-family:"Space Grotesk",-apple-system,sans-serif;color:var(--text,#eaf6fb);-webkit-user-select:none;user-select:none;',
    '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.sg-golf *{box-sizing:border-box;margin:0;padding:0}',
    '.sg-golf__canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}',
    '.sg-golf__hud{position:absolute;left:0;right:0;top:0;display:flex;align-items:flex-start;justify-content:space-between;',
    'gap:12px;padding:14px 16px;pointer-events:none;transition:opacity .3s ease}',
    '.sg-golf__hud.is-hidden{opacity:0}',
    '.sg-golf__lbl{font-size:11px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan,#40dcff)}',
    '.sg-golf__name{font-size:18px;font-weight:700;letter-spacing:-.02em;text-transform:uppercase;margin-top:4px;',
    'text-shadow:0 0 14px rgba(64,220,255,.5)}',
    '.sg-golf__score{text-align:right}',
    '.sg-golf__num{font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.05;font-variant-numeric:tabular-nums;',
    'text-shadow:0 0 14px rgba(64,220,255,.65)}',
    '.sg-golf__num.is-warn{color:var(--err,#fb7185);text-shadow:0 0 14px rgba(251,113,133,.6)}',
    '.sg-golf__of{font-size:15px;opacity:.65;font-weight:500}',
    '.sg-golf__banner{position:absolute;left:16px;right:16px;top:22%;text-align:center;pointer-events:none;opacity:0;',
    'transform:translateY(10px);transition:opacity .4s ease,transform .5s cubic-bezier(.2,1.2,.4,1)}',
    '.sg-golf__banner.is-show{opacity:1;transform:none}',
    '.sg-golf__banner .sg-golf__title{font-size:40px;text-shadow:0 0 24px rgba(64,220,255,.7)}',
    '.sg-golf__pop{position:absolute;left:0;right:0;top:30%;text-align:center;font-size:46px;font-weight:700;letter-spacing:-.03em;',
    'line-height:1;text-transform:uppercase;color:#fff;text-shadow:0 0 22px #40dcff,0 0 60px #40dcff;pointer-events:none;opacity:0;padding:0 12px}',
    '.sg-golf__pop.is-ok{color:#eaffef;text-shadow:0 0 22px #4ade80,0 0 60px #4ade80}',
    '.sg-golf__pop.is-err{color:#ffe9ee;text-shadow:0 0 22px #fb7185,0 0 60px #fb7185}',
    '.sg-golf__pop.is-go{animation:sg-golf-pop 1.6s ease-out both}',
    '.sg-golf__hint{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;',
    'padding:12px 16px;border-radius:14px;border:1px solid rgba(64,220,255,.3);background:rgba(10,14,20,.72);',
    '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:15px;white-space:nowrap;pointer-events:none;',
    'opacity:0;transition:opacity .35s ease}',
    '.sg-golf__hint.is-show{opacity:1}',
    '.sg-golf__hint svg{width:26px;height:26px;color:var(--cyan,#40dcff);flex:0 0 auto}',
    '.sg-golf__overlay{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:center;',
    'padding:16px 16px 22px;pointer-events:none;opacity:0;transition:opacity .35s ease}',
    '.sg-golf__overlay.is-show{opacity:1;pointer-events:auto}',
    '.sg-golf__card{width:100%;max-width:420px;max-height:100%;overflow:auto;padding:22px 20px 20px;border-radius:18px;',
    'border:1px solid rgba(64,220,255,.3);background:linear-gradient(160deg,rgba(64,220,255,.10),rgba(64,220,255,.03)),rgba(10,14,20,.76);',
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.6);',
    'transform:translateY(18px);transition:transform .45s cubic-bezier(.2,1.2,.4,1)}',
    '.sg-golf__overlay.is-show .sg-golf__card{transform:none}',
    '.sg-golf__title{font-size:34px;font-weight:700;letter-spacing:-.02em;text-transform:uppercase;line-height:1.02;margin-top:6px}',
    '.sg-golf__title.is-err{color:var(--err,#fb7185);text-shadow:0 0 18px rgba(251,113,133,.5)}',
    '.sg-golf__title.is-ok{color:var(--ok,#4ade80);text-shadow:0 0 18px rgba(74,222,128,.5)}',
    '.sg-golf__text{font-size:15px;line-height:1.5;color:rgba(234,246,251,.74);margin-top:8px}',
    '.sg-golf__meta{margin-top:12px;font-size:12px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan,#40dcff)}',
    '.sg-golf__rows{list-style:none;margin-top:14px;display:grid;gap:8px}',
    '.sg-golf__rows li{display:flex;align-items:center;gap:12px;font-size:15px;color:rgba(234,246,251,.88)}',
    '.sg-golf__rows svg{width:30px;height:30px;color:var(--cyan,#40dcff);flex:0 0 auto}',
    '.sg-golf__table{width:100%;margin-top:14px;border-collapse:collapse;font-size:15px;font-variant-numeric:tabular-nums}',
    '.sg-golf__table td{padding:8px 4px;border-top:1px solid rgba(64,220,255,.18)}',
    '.sg-golf__table td:last-child{text-align:right;color:var(--cyan,#40dcff);font-weight:700}',
    '.sg-golf__table .is-total td{font-weight:700;border-top:1px solid rgba(64,220,255,.5)}',
    '.sg-golf__dim{color:rgba(234,246,251,.55)}',
    '.sg-golf__btn{display:block;margin-top:18px;width:100%;height:52px;border:0;border-radius:14px;background:var(--cyan,#40dcff);',
    'color:#04121a;font:700 16px "Space Grotesk",-apple-system,sans-serif;box-shadow:0 6px 28px rgba(64,220,255,.45);cursor:pointer;',
    'touch-action:manipulation;-webkit-appearance:none;appearance:none}',
    '.sg-golf__btn:active{transform:scale(.98)}',
    '@keyframes sg-golf-pop{0%{opacity:0;transform:scale(1.8)}14%{opacity:1;transform:scale(1)}80%{opacity:1;transform:scale(1.04)}100%{opacity:0;transform:scale(.96) translateY(-12px)}}',
    '@media (prefers-reduced-motion: reduce){',
    '.sg-golf__pop.is-go{animation-name:none;opacity:1}',
    '.sg-golf__card,.sg-golf__overlay,.sg-golf__banner{transition:none}}'
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
      p.setAttribute('d', paths[i]);
      s.appendChild(p);
    }
    return s;
  }

  var ICONS = {
    drag: ['M12 5a2.5 2.5 0 1 0 0.01 0', 'M12 9.5v8', 'M8.5 14.5L12 18l3.5-3.5', 'M5 21h14'],
    hole: ['M5 18c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M12 15V3', 'M12 3l6 3-6 3'],
    jump: ['M3 19h5l9-9h4', 'M14 6l3 4']
  };

  function str(v, fallback) {
    return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
  }

  function num(v, fallback, min, max) {
    var n = Number(v);
    if (v === null || v === '' || typeof v === 'boolean' || !isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

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

  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Welche Bahnen? Zahl (die ersten n) oder Liste von Bahnnummern (1–3)
  function pickHoles(v) {
    var list = [];
    if (Array.isArray(v)) {
      v.forEach(function (n) {
        var i = Math.round(Number(n)) - 1;
        if (i >= 0 && i < COURSE.length && list.indexOf(i) < 0) list.push(i);
      });
    } else {
      var c = num(v, DEFAULTS.holes, 1, COURSE.length);
      for (var k = 0; k < c; k++) list.push(k);
    }
    if (!list.length) list = [0, 1, 2];
    return list;
  }

  function inRect(r, x, z) { return x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]; }

  function onFloor(H, x, z) {
    for (var i = 0; i < H.floor.length; i++) if (inRect(H.floor[i], x, z)) return true;
    return false;
  }

  // ── Physik (wird vom Spiel und von der Zielvorschau benutzt) ──
  function collideSeg(b, x1, z1, x2, z2, rest, svx, svz) {
    var ex = x2 - x1, ez = z2 - z1, L2 = ex * ex + ez * ez;
    var t = L2 > 0 ? clamp(((b.x - x1) * ex + (b.z - z1) * ez) / L2, 0, 1) : 0;
    var px = x1 + ex * t, pz = z1 + ez * t;
    var dx = b.x - px, dz = b.z - pz, d = Math.sqrt(dx * dx + dz * dz);
    var R = BALL_R + 0.06;
    if (d >= R || d < 1e-7) return 0;
    var nx = dx / d, nz = dz / d;
    b.x = px + nx * R;
    b.z = pz + nz * R;
    var rvx = b.vx - svx, rvz = b.vz - svz, vn = rvx * nx + rvz * nz;
    if (vn >= 0) return 0;
    rvx -= (1 + rest) * vn * nx;
    rvz -= (1 + rest) * vn * nz;
    b.vx = rvx + svx;
    b.vz = rvz + svz;
    return -vn;
  }

  function physicsStep(H, b, dt, t, ev) {
    var i, sp;
    if (b.air) {
      b.vy -= GRAV * dt;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y += b.vy * dt;
      if (b.y < WALL_H) collideAll(H, b, t, ev);
      if (b.y <= 0) {
        b.y = 0;
        if (!onFloor(H, b.x, b.z)) { b.fall = true; if (ev) ev('fall'); return; }
        if (b.vy < -3.5) { b.vy = -b.vy * 0.28; if (ev) ev('land', 1); }
        else { b.vy = 0; b.air = false; if (ev) ev('land', 0); }
      }
      return;
    }

    // Rampe: hochrollen, oben abheben
    var R = H.ramp, onRamp = false;
    if (R && b.x > R.x0 && b.x < R.x1 && b.z > R.z0 && b.z < R.z1) {
      onRamp = true;
      b.vz -= 4.5 * dt;
      b.y = (b.z - R.z0) / (R.z1 - R.z0) * R.h;
    } else {
      b.y = 0;
    }
    b.onRamp = onRamp;

    // Beschleuniger-Felder
    var onPad = false;
    for (i = 0; i < H.pads.length; i++) {
      var p = H.pads[i];
      if (inRect(p, b.x, b.z)) {
        onPad = true;
        b.vx += p[4] * 16 * dt;
        b.vz += p[5] * 16 * dt;
      }
    }

    // Loch: leichte Anziehung, Einlochen bei passendem Tempo
    var hx = H.hole[0] - b.x, hz = H.hole[1] - b.z, hd = Math.sqrt(hx * hx + hz * hz);
    sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (hd < 0.85 && sp < 6 && hd > 1e-4) {
      var a = 3.2 * (1 - hd / 0.85);
      b.vx += hx / hd * a * dt;
      b.vz += hz / hd * a * dt;
    }
    if (hd < HOLE_R && sp < 5) { b.sunk = true; if (ev) ev('sink'); return; }
    if (hd < HOLE_R * 0.8 && sp >= 5 && !b.lip) {
      // zu schnell: rutscht über die Kante und wird abgelenkt
      b.lip = true;
      var ang = (hx * b.vz - hz * b.vx > 0 ? 1 : -1) * 0.35;
      var c = Math.cos(ang), s = Math.sin(ang);
      var nvx = (b.vx * c - b.vz * s) * 0.8, nvz = (b.vx * s + b.vz * c) * 0.8;
      b.vx = nvx; b.vz = nvz;
      if (ev) ev('lip');
    }
    if (hd > HOLE_R * 1.5) b.lip = false;

    // Rollreibung
    sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (sp > 0) {
      var ns = Math.max(0, (sp - DECEL * dt) * (1 - DRAG * dt));
      b.vx *= ns / sp;
      b.vz *= ns / sp;
    }
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    collideAll(H, b, t, ev);

    if (b.tp > 0) b.tp -= dt;
    // Oben über die Schanzenkante: abheben (vor der Absturz-Prüfung)
    if (R && onRamp && b.z >= R.z1 && b.vz > 0) {
      b.air = true;
      b.y = R.h;
      b.vy = b.vz * 0.55 + 0.8;
      b.onRamp = false;
      if (ev) ev('jump');
      return;
    }
    if (!onFloor(H, b.x, b.z)) { b.fall = true; if (ev) ev('fall'); return; }

    sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    b.rest = sp < 0.06 && !onPad && !onRamp;
    if (b.rest) { b.vx = 0; b.vz = 0; }
  }

  function collideAll(H, b, t, ev) {
    var i, hit;
    for (i = 0; i < H.walls.length; i++) {
      var w = H.walls[i];
      hit = collideSeg(b, w[0], w[1], w[2], w[3], REST_WALL, 0, 0);
      if (hit > 1.2 && ev) ev('wall', hit);
    }
    if (b.y < 0.5) {
      for (i = 0; i < H.bumpers.length; i++) {
        var u = H.bumpers[i], dx = b.x - u[0], dz = b.z - u[1], d = Math.sqrt(dx * dx + dz * dz), R = u[2] + BALL_R;
        if (d < R && d > 1e-6) {
          var nx = dx / d, nz = dz / d;
          b.x = u[0] + nx * R;
          b.z = u[1] + nz * R;
          var vn = b.vx * nx + b.vz * nz;
          if (vn < 0) {
            b.vx -= 2 * vn * nx;
            b.vz -= 2 * vn * nz;
            // Bumper gibt Schwung dazu
            b.vx += nx * 2.5;
            b.vz += nz * 2.5;
            var sp = Math.sqrt(b.vx * b.vx + b.vz * b.vz), cap = MAXV * 1.1;
            if (sp > cap) { b.vx *= cap / sp; b.vz *= cap / sp; }
            if (ev) ev('bump', i);
          }
        }
      }
    }
    var M = H.windmill;
    if (M) {
      var an = M.speed * t, ux = Math.cos(an) * M.len, uz = Math.sin(an) * M.len;
      // Nabe
      var hx = b.x - M.x, hz = b.z - M.z, hd = Math.sqrt(hx * hx + hz * hz), HR = 0.22 + BALL_R;
      if (hd < HR && hd > 1e-6) {
        var mx = hx / hd, mz = hz / hd, mv = b.vx * mx + b.vz * mz;
        b.x = M.x + mx * HR; b.z = M.z + mz * HR;
        if (mv < 0) { b.vx -= 1.7 * mv * mx; b.vz -= 1.7 * mv * mz; }
      }
      // Flügel: Kontaktpunkt bewegt sich mit der Drehung
      var ex = 2 * ux, ez = 2 * uz, x1 = M.x - ux, z1 = M.z - uz, L2 = ex * ex + ez * ez;
      var tt = clamp(((b.x - x1) * ex + (b.z - z1) * ez) / L2, 0, 1);
      var px = x1 + ex * tt, pz = z1 + ez * tt;
      var svx = -M.speed * (pz - M.z), svz = M.speed * (px - M.x);
      hit = collideSeg(b, x1, z1, x1 + ex, z1 + ez, 0.6, svx, svz);
      if (hit > 0.8 && ev) ev('mill', hit);
    }
    if (H.portals && !(b.tp > 0)) {
      for (i = 0; i < H.portals.length; i++) {
        var P = H.portals[i], ends = [[P.a, P.b], [P.b, P.a]];
        for (var k = 0; k < 2; k++) {
          var from = ends[k][0], to = ends[k][1];
          var qx = b.x - from[0], qz = b.z - from[1];
          if (qx * qx + qz * qz < 0.42 * 0.42) {
            var s2 = Math.sqrt(b.vx * b.vx + b.vz * b.vz) || 1;
            var fx = b.x, fz = b.z;
            b.x = to[0] + b.vx / s2 * 0.6;
            b.z = to[1] + b.vz / s2 * 0.6;
            b.tp = 0.6;
            if (ev) ev('tp', [fx, fz, to[0], to[1]]);
            return;
          }
        }
      }
    }
  }

  function mount(container, options) {
    options = options || {};
    var params = (options.params && typeof options.params === 'object') ? options.params : {};
    var onWin = typeof options.onWin === 'function' ? options.onWin : function () {};
    var onFail = typeof options.onFail === 'function' ? options.onFail : function () {};

    var cfg = {
      holes: pickHoles(params.holes),
      extra: num(params.extraStrokes, DEFAULTS.extraStrokes, 1, 20),
      title: str(params.title, DEFAULTS.title),
      label: str(params.label, DEFAULTS.label),
      intro: str(params.intro, DEFAULTS.intro),
      winText: str(params.winText, DEFAULTS.winText),
      startText: str(params.startText, DEFAULTS.startText)
    };
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    addStyle();

    // ── DOM ──
    var root = el('div', 'sg-golf');
    root.setAttribute('lang', 'de');
    var canvas = el('canvas', 'sg-golf__canvas');
    canvas.setAttribute('aria-label', 'Minigolf-Bahn');
    root.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var hud = el('div', 'sg-golf__hud is-hidden');
    var hudL = el('div');
    var hudHole = el('div', 'sg-golf__lbl');
    var hudName = el('div', 'sg-golf__name');
    hudL.appendChild(hudHole);
    hudL.appendChild(hudName);
    var hudR = el('div', 'sg-golf__score');
    hudR.appendChild(el('div', 'sg-golf__lbl', 'Schläge'));
    var hudNum = el('div', 'sg-golf__num');
    var hudStrokes = el('span', null, '0');
    var hudPar = el('span', 'sg-golf__of');
    hudNum.appendChild(hudStrokes);
    hudNum.appendChild(hudPar);
    hudR.appendChild(hudNum);
    hud.appendChild(hudL);
    hud.appendChild(hudR);
    root.appendChild(hud);

    var banner = el('div', 'sg-golf__banner');
    var bnLbl = el('div', 'sg-golf__lbl');
    var bnTitle = el('div', 'sg-golf__title');
    var bnPar = el('div', 'sg-golf__meta');
    banner.appendChild(bnLbl);
    banner.appendChild(bnTitle);
    banner.appendChild(bnPar);
    root.appendChild(banner);

    var pop = el('div', 'sg-golf__pop');
    pop.setAttribute('aria-live', 'assertive');
    root.appendChild(pop);

    var hint = el('div', 'sg-golf__hint');
    hint.appendChild(svg(ICONS.drag));
    hint.appendChild(el('span', null, 'Ziehen, zielen, loslassen'));
    root.appendChild(hint);

    var overlay = el('div', 'sg-golf__overlay');
    var card = el('div', 'sg-golf__card');
    card.setAttribute('role', 'dialog');
    overlay.appendChild(card);
    root.appendChild(overlay);

    container.appendChild(root);

    // ── Zustand ──
    var W = 1, H = 1, dpr = 1, F = 1, cy0 = 0;
    var bg = null;
    var spr = {
      cyan: glowSprite(64, 220, 255),
      mag: glowSprite(255, 63, 180),
      white: glowSprite(220, 245, 255),
      green: glowSprite(74, 222, 128),
      yellow: glowSprite(255, 211, 107),
      violet: glowSprite(170, 80, 255)
    };
    var cam = { x: 0, z: 0, d: CAM_D, tx: 0, tz: 0, td: CAM_D };
    var CP = Math.cos(PITCH), SP = Math.sin(PITCH);
    var camPos = { x: 0, y: 0, z: 0 };

    var state = 'intro', stateT = 0, prevState = null;
    var time = 0, simT = 0, timeScale = 1;
    var holeIdx = 0, hole = COURSE[cfg.holes[0]];
    var strokes = 0, results = [], firstShot = true;
    var ball = newBall(hole.tee[0], hole.tee[1]);
    var lastRest = { x: ball.x, z: ball.z };
    var rot = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    var restT = 0, blinkT = 0, nextBlink = 2;
    var aim = null;           // { sx, sy, cx, cy, id, p, dx, dz }
    var preview = [];
    var particles = [], rockets = [], rings = [], trail = [];
    var bumpFlash = [], shake = 0, flash = 0, flashCol = '255,255,255';
    var sinkT = 0, fallT = 0;
    var raf = 0, last = 0, destroyed = false, hidden = false;
    var cardShown = false, cardAction = null, winSent = false;
    var resizeObs = null;
    var perfFrames = 0, perfSum = 0, perfChecked = false;
    var P = { x: 0, y: 0, s: 0, z: 0 }, Q = { x: 0, y: 0, s: 0, z: 0 };
    var floaters = [];
    var fr = seeded(7);
    for (var fi = 0; fi < 7; fi++) {
      floaters.push({ x: (fr() - 0.5) * 22, y: -3 - fr() * 3, z: fr() * 24 - 2, s: 0.5 + fr() * 0.9, r: fr() * 6, v: 0.3 + fr() * 0.5, c: fr() < 0.5 });
    }

    function newBall(x, z) {
      return { x: x, z: z, y: 0, vx: 0, vz: 0, vy: 0, air: false, rest: true, sunk: false, fall: false, tp: 0, onRamp: false, lip: false };
    }

    // ── Kamera & Projektion ──
    function updateCamPos() {
      camPos.x = cam.x;
      camPos.y = cam.d * SP;
      camPos.z = cam.z - cam.d * CP;
    }

    function proj(x, y, z, out) {
      var dx = x - camPos.x, dy = y - camPos.y, dz = z - camPos.z;
      var yc = dy * CP + dz * SP;
      var zc = -dy * SP + dz * CP;
      if (zc < 0.2) zc = 0.2;
      var s = F / zc;
      out.x = W / 2 + dx * s;
      out.y = cy0 - yc * s;
      out.s = s;
      out.z = zc;
      return out;
    }

    // Bildschirmpunkt → Punkt auf der Bodenebene
    function unproject(sx, sy) {
      var xc = (sx - W / 2) / F, yc = -(sy - cy0) / F;
      var dx = xc, dy = yc * CP - SP, dz = yc * SP + CP;
      if (dy > -0.02) dy = -0.02;
      var t = -camPos.y / dy;
      return { x: camPos.x + dx * t, z: camPos.z + dz * t };
    }

    function depth(x, y, z) {
      var dy = y - camPos.y, dz = z - camPos.z;
      return -dy * SP + dz * CP;
    }

    // ── Größe & Hintergrund ──
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
      F = Math.min(W * 1.05, H * 0.62);
      cy0 = H * 0.5;
      buildBackground();
      if (hidden || state === 'paused') render();
    }

    function buildBackground() {
      var rand = seeded(20261002);
      var c = document.createElement('canvas');
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      var g = c.getContext('2d');
      g.scale(dpr, dpr);
      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b0820');
      sky.addColorStop(0.45, '#070a18');
      sky.addColorStop(1, '#03050a');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      var neb = g.createRadialGradient(W * 0.8, H * 0.12, 0, W * 0.8, H * 0.12, W * 0.9);
      neb.addColorStop(0, 'rgba(255,63,180,0.16)');
      neb.addColorStop(1, 'rgba(255,63,180,0)');
      g.fillStyle = neb;
      g.fillRect(0, 0, W, H);
      var neb2 = g.createRadialGradient(W * 0.1, H * 0.85, 0, W * 0.1, H * 0.85, W);
      neb2.addColorStop(0, 'rgba(64,220,255,0.10)');
      neb2.addColorStop(1, 'rgba(64,220,255,0)');
      g.fillStyle = neb2;
      g.fillRect(0, 0, W, H);
      for (var i = 0; i < 170; i++) {
        g.globalAlpha = 0.25 + rand() * 0.7;
        g.fillStyle = rand() < 0.25 ? '#9fe9ff' : (rand() < 0.15 ? '#ffb3e1' : '#ffffff');
        g.beginPath();
        g.arc(rand() * W, rand() * H, rand() * 1.1 + 0.25, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      bg = c;
    }

    // ── Karten & Anzeigen ──
    function showCard(o) {
      while (card.firstChild) card.removeChild(card.firstChild);
      if (o.label) card.appendChild(el('div', 'sg-golf__lbl', o.label));
      card.appendChild(el('h2', 'sg-golf__title' + (o.titleClass ? ' ' + o.titleClass : ''), o.title));
      if (o.text) card.appendChild(el('p', 'sg-golf__text', o.text));
      if (o.meta) card.appendChild(el('div', 'sg-golf__meta', o.meta));
      if (o.rows) {
        var ul = el('ul', 'sg-golf__rows');
        o.rows.forEach(function (rw) {
          var li = el('li');
          li.appendChild(svg(ICONS[rw[0]]));
          li.appendChild(el('span', null, rw[1]));
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      if (o.table) card.appendChild(o.table);
      cardAction = o.action || null;
      if (o.button) {
        var b = el('button', 'sg-golf__btn', o.button);
        b.type = 'button';
        card.appendChild(b);
      }
      overlay.classList.add('is-show');
      cardShown = true;
      if (o.button) {
        try { card.querySelector('.sg-golf__btn').focus({ preventScroll: true }); } catch (e) { /* alt */ }
      }
    }

    function hideCard() {
      overlay.classList.remove('is-show');
      cardShown = false;
      cardAction = null;
    }

    function onCardClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('.sg-golf__btn') : null;
      if (!b || !cardAction) return;
      var a = cardAction;
      hideCard();
      a();
    }

    function showPop(txt, kind) {
      pop.textContent = txt;
      pop.className = 'sg-golf__pop' + (kind ? ' ' + kind : '');
      void pop.offsetWidth;
      pop.classList.add('is-go');
    }

    function limit() { return hole.par + cfg.extra; }

    function updateHud() {
      hudHole.textContent = 'Bahn ' + (holeIdx + 1) + ' / ' + cfg.holes.length;
      hudName.textContent = hole.name;
      hudStrokes.textContent = String(strokes);
      hudPar.textContent = ' / Par ' + hole.par;
      hudNum.classList.toggle('is-warn', strokes >= limit() - 1 && strokes > 0);
    }

    function rating(s, par) {
      if (s === 1) return ['Hole in One!', 'is-ok'];
      var d = s - par;
      if (d <= -2) return ['Eagle!', 'is-ok'];
      if (d === -1) return ['Birdie!', 'is-ok'];
      if (d === 0) return ['Par', ''];
      if (d === 1) return ['Bogey', ''];
      return ['Eingelocht', ''];
    }

    function safeCall(fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    }

    // ── Ablauf ──
    function startGame() {
      holeIdx = 0;
      results = [];
      startHole(false);
    }

    function startHole(quick) {
      hole = COURSE[cfg.holes[holeIdx]];
      strokes = 0;
      ball = newBall(hole.tee[0], hole.tee[1]);
      lastRest = { x: ball.x, z: ball.z };
      bumpFlash = hole.bumpers.map(function () { return 0; });
      trail = [];
      preview = [];
      aim = null;
      restT = 0;
      updateHud();
      hud.classList.remove('is-hidden');
      state = 'fly';
      stateT = quick ? 1.2 : 0;
      bnLbl.textContent = 'Bahn ' + (holeIdx + 1) + ' / ' + cfg.holes.length;
      bnTitle.textContent = hole.name;
      bnPar.textContent = 'Par ' + hole.par;
      banner.classList.add('is-show');
      cam.x = hole.hole[0] * 0.4;
      cam.z = hole.hole[1] - 1;
      cam.d = 15;
    }

    function shoot(p, dx, dz) {
      var v = MAXV * (0.06 + 0.94 * p);
      ball.vx = dx * v;
      ball.vz = dz * v;
      ball.rest = false;
      lastRest = { x: ball.x, z: ball.z };
      strokes++;
      updateHud();
      state = 'roll';
      stateT = 0;
      restT = 0;
      preview = [];
      hint.classList.remove('is-show');
      firstShot = false;
      burst(ball.x, 0.15, ball.z, 10, spr.cyan, 3, 0.35);
      rings.push({ x: ball.x, y: 0.02, z: ball.z, t: 0, c: '64,220,255' });
    }

    function holeDone() {
      results.push({ name: hole.name, par: hole.par, strokes: strokes });
      if (holeIdx + 1 < cfg.holes.length) {
        holeIdx++;
        startHole(false);
      } else {
        finish();
      }
    }

    function finish() {
      state = 'done';
      stateT = 0;
      hud.classList.add('is-hidden');
      var tbl = el('table', 'sg-golf__table');
      var tb = el('tbody');
      var tot = 0, totPar = 0;
      results.forEach(function (r, i) {
        tot += r.strokes;
        totPar += r.par;
        var tr = el('tr');
        tr.appendChild(el('td', null, (i + 1) + '  ' + r.name));
        tr.appendChild(el('td', 'sg-golf__dim', 'Par ' + r.par));
        tr.appendChild(el('td', null, String(r.strokes)));
        tb.appendChild(tr);
      });
      var trT = el('tr', 'is-total');
      trT.appendChild(el('td', null, 'Gesamt'));
      trT.appendChild(el('td', 'sg-golf__dim', 'Par ' + totPar));
      trT.appendChild(el('td', null, String(tot)));
      tb.appendChild(trT);
      tbl.appendChild(tb);
      var diff = tot - totPar;
      showCard({
        label: cfg.label,
        title: 'Geschafft',
        titleClass: 'is-ok',
        text: cfg.winText,
        meta: diff < 0 ? (-diff) + ' unter Par' : (diff === 0 ? 'Genau Par' : diff + ' über Par'),
        table: tbl
      });
      for (var k = 0; k < 4; k++) {
        rockets.push({ x: ball.x + rnd(-2, 2), y: 0, z: ball.z + rnd(-1, 3), vy: rnd(7, 10), fuse: rnd(0.4, 1.1) + k * 0.25 });
      }
    }

    function failHole() {
      state = 'fail';
      stateT = 0;
      safeCall(onFail);
      showCard({
        label: 'Bahn ' + (holeIdx + 1) + ' · ' + hole.name,
        title: 'Zu viele Schläge',
        titleClass: 'is-err',
        text: 'Nach ' + limit() + ' Schlägen ist der Lurch noch nicht im Loch. Probier die Bahn nochmal – er ist bereit.',
        button: 'Nochmal',
        action: function () { startHole(true); }
      });
    }

    // ── Ereignisse aus der Physik ──
    function onEvent(type, d) {
      if (type === 'bump') {
        bumpFlash[d] = 1;
        shake = Math.max(shake, 0.18);
        var u = hole.bumpers[d];
        burst(ball.x, 0.3, ball.z, 14, spr.mag, 5, 0.45);
        rings.push({ x: u[0], y: 0.5, z: u[1], t: 0, c: '255,63,180', r0: u[2] });
      } else if (type === 'wall') {
        if (d > 3) burst(ball.x, 0.2, ball.z, Math.min(10, Math.round(d)), spr.cyan, 2.5, 0.3);
      } else if (type === 'mill') {
        shake = Math.max(shake, 0.12);
        burst(ball.x, 0.3, ball.z, 10, spr.mag, 4, 0.4);
      } else if (type === 'tp') {
        flash = 0.6;
        flashCol = '170,80,255';
        burst(d[0], 0.3, d[1], 18, spr.violet, 4, 0.5);
        burst(d[2], 0.3, d[3], 22, spr.cyan, 5, 0.6);
        rings.push({ x: d[2], y: 0.05, z: d[3], t: 0, c: '170,80,255' });
        trail = [];
      } else if (type === 'jump') {
        burst(ball.x, 0.5, ball.z, 16, spr.cyan, 4, 0.5);
      } else if (type === 'land') {
        shake = Math.max(shake, 0.14);
        burst(ball.x, 0.05, ball.z, 12, spr.cyan, 3, 0.4);
        rings.push({ x: ball.x, y: 0.02, z: ball.z, t: 0, c: '64,220,255' });
      } else if (type === 'lip') {
        burst(ball.x, 0.1, ball.z, 8, spr.yellow, 3, 0.35);
      }
    }

    function burst(x, y, z, n, sprite, force, life) {
      if (reduceMotion) n = Math.ceil(n / 3);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI / 2;
        var f = force * (0.3 + Math.random() * 0.7);
        particles.push({
          x: x, y: y, z: z,
          vx: Math.cos(a) * Math.cos(b) * f, vy: Math.sin(b) * f + force * 0.3, vz: Math.sin(a) * Math.cos(b) * f,
          life: life * (0.5 + Math.random() * 0.5), max: life, sp: sprite, size: 0.07 + Math.random() * 0.1, g: 9
        });
      }
    }

    function firework(x, y, z) {
      var cols = [spr.cyan, spr.mag, spr.yellow, spr.green, spr.violet];
      var c1 = cols[Math.floor(Math.random() * cols.length)], c2 = cols[Math.floor(Math.random() * cols.length)];
      var n = reduceMotion ? 18 : 54;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
        var f = rnd(3.5, 5.5);
        particles.push({
          x: x, y: y, z: z,
          vx: Math.sin(b) * Math.cos(a) * f, vy: Math.cos(b) * f, vz: Math.sin(b) * Math.sin(a) * f,
          life: rnd(0.9, 1.5), max: 1.5, sp: i % 2 ? c1 : c2, size: rnd(0.08, 0.15), g: 4
        });
      }
      flash = Math.max(flash, 0.25);
      flashCol = '255,255,255';
    }

    // ── Zielvorschau: echte Physik ein Stück vorausrechnen ──
    function computePreview(p, dx, dz) {
      var v = MAXV * (0.06 + 0.94 * p);
      var b = newBall(ball.x, ball.z);
      b.vx = dx * v; b.vz = dz * v; b.rest = false;
      var pts = [], t = simT, len = 0, maxLen = 2.2 + p * 5.5, px = b.x, pz = b.z, acc = 0;
      for (var i = 0; i < 1200 && len < maxLen; i++) {
        physicsStep(hole, b, SUB, t, null);
        t += SUB;
        var sx = b.x - px, sz = b.z - pz, dd = Math.sqrt(sx * sx + sz * sz);
        len += dd; acc += dd;
        px = b.x; pz = b.z;
        if (acc > 0.32) { pts.push([b.x, b.y, b.z]); acc = 0; }
        if (b.rest || b.sunk || b.fall || b.air || b.tp > 0) break;
      }
      preview = pts;
    }

    // Ganze Bahn bis zum Stillstand (für automatische Tests)
    function predictFull(angle, p) {
      var b = newBall(ball.x, ball.z), v = MAXV * (0.06 + 0.94 * p);
      b.vx = Math.sin(angle) * v; b.vz = Math.cos(angle) * v; b.rest = false;
      var t = simT;
      for (var i = 0; i < 240 * 20; i++) {
        physicsStep(hole, b, SUB, t, null);
        t += SUB;
        if (b.sunk || b.fall) break;
        if (b.rest && !b.air) break;
      }
      return { x: b.x, z: b.z, sunk: b.sunk, fall: b.fall };
    }

    // ── Update ──
    function update(dt) {
      time += dt;
      stateT += dt;
      if (state === 'paused') return;

      // Zeitlupe beim Flug über den Abgrund
      var tsT = (ball.air && !onFloor(hole, ball.x, ball.z) && !reduceMotion) ? 0.45 : 1;
      timeScale += (tsT - timeScale) * Math.min(1, dt * 8);
      var gdt = dt * timeScale;
      simT += gdt;

      if (state === 'fly') {
        var k = clamp(stateT / 2.4, 0, 1), e = ease(k);
        cam.tx = hole.hole[0] * 0.4 + (ball.x * 0.5 - hole.hole[0] * 0.4) * e;
        cam.tz = (hole.hole[1] - 1) + (ball.z + 2.6 - (hole.hole[1] - 1)) * e;
        cam.td = 15 + (CAM_D - 15) * e;
        if (stateT > 1.9) banner.classList.remove('is-show');
        if (k >= 1) {
          state = 'aim';
          stateT = 0;
          if (firstShot) hint.classList.add('is-show');
        }
        cam.x = cam.tx; cam.z = cam.tz; cam.d = cam.td;
      } else if (state === 'intro') {
        cam.x = Math.sin(time * 0.3) * 0.8;
        cam.z = 6 + Math.sin(time * 0.2) * 1.5;
        cam.d = 15;
      } else {
        // Kamera folgt dem Ball mit Vorausblick
        var look = state === 'roll' ? 0.22 : 0;
        cam.tx = ball.x * 0.5 + ball.vx * look * 0.5;
        cam.tz = ball.z + 2.6 + ball.vz * look;
        cam.td = ball.air ? CAM_D * 1.12 : CAM_D;
        var f = Math.min(1, dt * 3.2);
        cam.x += (cam.tx - cam.x) * f;
        cam.z += (cam.tz - cam.z) * f;
        cam.d += (cam.td - cam.d) * f;
      }
      updateCamPos();

      if (state === 'roll') {
        var steps = Math.ceil(gdt / SUB), sd = gdt / steps;
        for (var i = 0; i < steps; i++) {
          var px0 = ball.x, pz0 = ball.z;
          physicsStep(hole, ball, sd, simT - gdt + i * sd, onEvent);
          rollBall(ball.x - px0, ball.z - pz0);
          if (ball.sunk || ball.fall) break;
        }
        if (ball.sunk) {
          state = 'sink';
          stateT = 0;
          sinkT = 0;
        } else if (ball.fall) {
          state = 'fall';
          stateT = 0;
          fallT = 0;
          ball.vy = 0;
          showPop('Abgestürzt! +1', 'is-err');
        } else if (ball.rest && !ball.air) {
          if (strokes >= limit()) failHole();
          else {
            state = 'aim';
            stateT = 0;
            restT = 0;
          }
        }
        if (Math.abs(ball.vx) + Math.abs(ball.vz) > 2.5) {
          trail.unshift({ x: ball.x, y: ball.y, z: ball.z });
          if (trail.length > 26) trail.length = 26;
        } else if (trail.length) trail.pop();
      } else if (trail.length) trail.pop();

      if (state === 'sink') {
        // Ball rutscht spiralförmig ins Loch
        var hk = clamp(stateT / 0.45, 0, 1);
        ball.x += (hole.hole[0] - ball.x) * Math.min(1, dt * 14);
        ball.z += (hole.hole[1] - ball.z) * Math.min(1, dt * 14);
        ball.y = -hk * 0.6;
        if (stateT >= 0.45 && sinkT === 0) {
          sinkT = 1;
          var rt = rating(strokes, hole.par);
          showPop(rt[0], rt[1] || 'is-go');
          flash = 0.7;
          flashCol = '160,240,255';
          rings.push({ x: hole.hole[0], y: 0.02, z: hole.hole[1], t: 0, c: '74,222,128', big: true });
          burst(hole.hole[0], 0.2, hole.hole[1], 40, spr.green, 6, 0.9);
          var nR = strokes <= hole.par ? 4 : 2;
          for (var r = 0; r < nR; r++) {
            rockets.push({ x: hole.hole[0] + rnd(-0.6, 0.6), y: 0, z: hole.hole[1] + rnd(-0.4, 0.6), vy: rnd(7, 10), fuse: rnd(0.35, 0.7) + r * 0.22 });
          }
        }
        if (stateT > 2.6) holeDone();
      }

      if (state === 'fall') {
        ball.vy -= GRAV * 0.6 * dt;
        ball.y += ball.vy * dt;
        ball.x += ball.vx * dt * 0.6;
        ball.z += ball.vz * dt * 0.6;
        if (stateT > 1.1) {
          strokes++;
          updateHud();
          ball = newBall(lastRest.x, lastRest.z);
          burst(ball.x, 0.2, ball.z, 16, spr.cyan, 4, 0.5);
          rings.push({ x: ball.x, y: 0.02, z: ball.z, t: 0, c: '64,220,255' });
          if (strokes >= limit()) failHole();
          else { state = 'aim'; stateT = 0; restT = 0; }
        }
      }

      if (state === 'done' && stateT > 2.4 && !winSent) {
        winSent = true;
        safeCall(onWin);
      }

      if (state === 'aim') {
        restT += dt;
        blinkT -= dt;
        nextBlink -= dt;
        if (nextBlink <= 0) { blinkT = 0.14; nextBlink = rnd(1.8, 4.2); }
      }

      // Bumper-Leuchten abklingen
      for (var bi = 0; bi < bumpFlash.length; bi++) bumpFlash[bi] = Math.max(0, bumpFlash[bi] - dt * 3);

      // Raketen und Partikel
      rockets = rockets.filter(function (rk) {
        rk.fuse -= dt;
        if (rk.fuse > 0.3) return true;
        rk.y += rk.vy * dt;
        rk.vy -= 6 * dt;
        if (Math.random() < 0.7) {
          particles.push({ x: rk.x, y: rk.y, z: rk.z, vx: rnd(-0.3, 0.3), vy: -0.5, vz: rnd(-0.3, 0.3), life: 0.4, max: 0.4, sp: spr.yellow, size: 0.06, g: 2 });
        }
        if (rk.fuse <= 0 || rk.vy < 1) { firework(rk.x, rk.y, rk.z); return false; }
        return true;
      });
      var drag = Math.exp(-dt * 1.4);
      particles = particles.filter(function (p) {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vy -= p.g * dt;
        p.vx *= drag; p.vz *= drag;
        return true;
      });
      rings = rings.filter(function (r) { r.t += dt; return r.t < (r.big ? 0.9 : 0.5); });
      shake = Math.max(0, shake - dt * 1.6);
      flash = Math.max(0, flash - dt * 2);
      floaters.forEach(function (f) { f.r += dt * f.v; });
    }

    // Rollen: Drehung der Kugel aus der zurückgelegten Strecke
    function rollBall(dx, dz) {
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1e-6) return;
      var ax = dz / d, az = -dx / d, a = d / BALL_R;
      var c = Math.cos(a), s = Math.sin(a), t = 1 - c;
      // Rodrigues: Drehachse (ax, 0, az)
      var r00 = t * ax * ax + c, r01 = -s * az, r02 = t * ax * az;
      var r10 = s * az, r11 = c, r12 = -s * ax;
      var r20 = t * ax * az, r21 = s * ax, r22 = t * az * az + c;
      var m = rot, n = [];
      for (var i = 0; i < 3; i++) {
        n[i * 3] = (i === 0 ? r00 : i === 1 ? r10 : r20) * m[0] + (i === 0 ? r01 : i === 1 ? r11 : r21) * m[3] + (i === 0 ? r02 : i === 1 ? r12 : r22) * m[6];
        n[i * 3 + 1] = (i === 0 ? r00 : i === 1 ? r10 : r20) * m[1] + (i === 0 ? r01 : i === 1 ? r11 : r21) * m[4] + (i === 0 ? r02 : i === 1 ? r12 : r22) * m[7];
        n[i * 3 + 2] = (i === 0 ? r00 : i === 1 ? r10 : r20) * m[2] + (i === 0 ? r01 : i === 1 ? r11 : r21) * m[5] + (i === 0 ? r02 : i === 1 ? r12 : r22) * m[8];
      }
      rot = n;
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

    function circlePath(x, y, z, r, n) {
      for (var i = 0; i <= n; i++) {
        var a = i / n * Math.PI * 2;
        proj(x + Math.cos(a) * r, y, z + Math.sin(a) * r, P);
        if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y);
      }
    }

    function drawAbyss() {
      // Leuchtgitter tief unter den Bahnen
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;
      var Y = -8, step = 2.5;
      var cx = Math.round(cam.x / step) * step, cz = Math.round(cam.z / step) * step;
      for (var i = -12; i <= 12; i++) {
        var x = cx + i * step;
        proj(x, Y, cz - 14, P); proj(x, Y, cz + 40, Q);
        ctx.strokeStyle = 'rgba(170,80,255,0.16)';
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
      }
      for (var k = -6; k <= 16; k++) {
        var z = cz + k * step;
        proj(cx - 30, Y, z, P); proj(cx + 30, Y, z, Q);
        ctx.strokeStyle = 'rgba(170,80,255,' + (0.2 * clamp(1 - (z - cam.z) / 40, 0, 1)) + ')';
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
      }
      // Schwebende Drahtkörper (Parallaxe)
      for (var f = 0; f < floaters.length; f++) {
        var o = floaters[f], s = o.s, a = o.r;
        var pts = [[0, s, 0], [0, -s, 0], [s, 0, 0], [-s, 0, 0], [0, 0, s], [0, 0, -s]].map(function (p) {
          var x2 = p[0] * Math.cos(a) - p[2] * Math.sin(a), z2 = p[0] * Math.sin(a) + p[2] * Math.cos(a);
          return proj(o.x + x2, o.y + p[1], o.z + z2, { x: 0, y: 0, s: 0, z: 0 });
        });
        var ed = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
        ctx.beginPath();
        ed.forEach(function (e) { ctx.moveTo(pts[e[0]].x, pts[e[0]].y); ctx.lineTo(pts[e[1]].x, pts[e[1]].y); });
        glowStroke(o.c ? '64,220,255' : '255,63,180', 0.8, 0.45);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function quad(a, b, c, d) {
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
    }

    var Q4 = [{ x: 0, y: 0, s: 0, z: 0 }, { x: 0, y: 0, s: 0, z: 0 }, { x: 0, y: 0, s: 0, z: 0 }, { x: 0, y: 0, s: 0, z: 0 }];

    function drawFloor() {
      var i, r;
      // Unterseite / Dicke der schwebenden Platten
      for (i = 0; i < hole.floor.length; i++) {
        r = hole.floor[i];
        proj(r[0], -0.35, r[1], Q4[0]); proj(r[2], -0.35, r[1], Q4[1]); proj(r[2], 0, r[1], Q4[2]); proj(r[0], 0, r[1], Q4[3]);
        ctx.beginPath(); quad(Q4[0], Q4[1], Q4[2], Q4[3]);
        ctx.fillStyle = 'rgba(20,60,80,0.9)';
        ctx.fill();
      }
      for (i = 0; i < hole.floor.length; i++) {
        r = hole.floor[i];
        proj(r[0], 0, r[1], Q4[0]); proj(r[2], 0, r[1], Q4[1]); proj(r[2], 0, r[3], Q4[2]); proj(r[0], 0, r[3], Q4[3]);
        ctx.beginPath(); quad(Q4[0], Q4[1], Q4[2], Q4[3]);
        ctx.fillStyle = '#071a24';
        ctx.fill();
      }
      // Gitter auf dem Glasboden
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(64,220,255,0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = 0; i < hole.floor.length; i++) {
        r = hole.floor[i];
        for (var x = Math.ceil(r[0]); x < r[2]; x++) { proj(x, 0, r[1], P); proj(x, 0, r[3], Q); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); }
        for (var z = Math.ceil(r[1]); z < r[3]; z++) { proj(r[0], 0, z, P); proj(r[2], 0, z, Q); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); }
      }
      ctx.stroke();
      // Abbruchkanten (Abgrund) warnend in Magenta
      for (i = 0; i < hole.drops.length; i++) {
        var d = hole.drops[i];
        proj(d[0], 0, d[1], P); proj(d[2], 0, d[3], Q);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y);
        glowStroke('255,63,180', 1.6, 0.6 + 0.3 * Math.sin(time * 5));
      }
      // Beschleuniger-Felder mit wandernden Pfeilen
      for (i = 0; i < hole.pads.length; i++) {
        var p = hole.pads[i];
        proj(p[0], 0.01, p[1], Q4[0]); proj(p[2], 0.01, p[1], Q4[1]); proj(p[2], 0.01, p[3], Q4[2]); proj(p[0], 0.01, p[3], Q4[3]);
        ctx.beginPath(); quad(Q4[0], Q4[1], Q4[2], Q4[3]);
        ctx.fillStyle = 'rgba(64,220,255,0.10)';
        ctx.fill();
        glowStroke('64,220,255', 1, 0.5);
        var cxp = (p[0] + p[2]) / 2, len = p[3] - p[1], hw = (p[2] - p[0]) * 0.35;
        for (var c = 0; c < 3; c++) {
          var zz = p[1] + ((time * 1.6 + c / 3) % 1) * len;
          var a = Math.sin(((zz - p[1]) / len) * Math.PI);
          ctx.beginPath();
          proj(cxp - hw, 0.02, zz - 0.25, P); ctx.moveTo(P.x, P.y);
          proj(cxp, 0.02, zz + 0.1, P); ctx.lineTo(P.x, P.y);
          proj(cxp + hw, 0.02, zz - 0.25, P); ctx.lineTo(P.x, P.y);
          glowStroke('64,220,255', 1.3, a);
        }
      }
      // Portale
      if (hole.portals) {
        hole.portals.forEach(function (pp) { drawPortal(pp.a, 0); drawPortal(pp.b, 1); });
      }
      drawCup();
      // Lichtschein der Kugel auf dem Boden
      if (state !== 'fall' && ball.y > -0.1) {
        proj(ball.x, 0, ball.z, P);
        var gs = BALL_R * 4 * P.s * clamp(1 - ball.y * 0.3, 0.3, 1);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(spr.cyan, P.x - gs, P.y - gs * 0.62, gs * 2, gs * 1.24);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawPortal(pos, which) {
      var col = which ? '170,80,255' : '64,220,255';
      ctx.beginPath(); circlePath(pos[0], 0.01, pos[1], 0.5, 24);
      ctx.fillStyle = 'rgba(' + col + ',0.12)';
      ctx.fill();
      for (var k = 0; k < 3; k++) {
        var r = 0.5 - k * 0.12, rot2 = time * (2 + k) * (k % 2 ? -1 : 1);
        ctx.beginPath();
        for (var i = 0; i <= 18; i++) {
          var a = rot2 + i / 18 * Math.PI * 1.4;
          proj(pos[0] + Math.cos(a) * r, 0.02, pos[1] + Math.sin(a) * r, P);
          if (i) ctx.lineTo(P.x, P.y); else ctx.moveTo(P.x, P.y);
        }
        glowStroke(col, 1.2, 0.9 - k * 0.2);
      }
      // hineingesogene Funken
      var sp = which ? spr.violet : spr.cyan;
      for (var j = 0; j < 8; j++) {
        var f = (time * 0.9 + j / 8) % 1, an = j * 2.3 + time * 3;
        proj(pos[0] + Math.cos(an) * 0.6 * (1 - f), 0.05 + f * 0.4, pos[1] + Math.sin(an) * 0.6 * (1 - f), P);
        var s = Math.max(2, P.s * 0.08);
        ctx.globalAlpha = 1 - f;
        ctx.drawImage(sp, P.x - s, P.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
    }

    function drawCup() {
      var hx = hole.hole[0], hz = hole.hole[1];
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); circlePath(hx, 0.005, hz, HOLE_R, 24);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); circlePath(hx, 0.01, hz, HOLE_R, 24);
      glowStroke('64,220,255', 1.4, 1);
      // pulsierende Ringe
      for (var k = 0; k < 2; k++) {
        var f = (time * 0.7 + k * 0.5) % 1;
        ctx.beginPath(); circlePath(hx, 0.01, hz, HOLE_R + f * 0.7, 24);
        ctx.strokeStyle = 'rgba(64,220,255,' + (0.5 * (1 - f)) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Lichtsäule + Hologramm-Fahne über dem Loch
    function drawBeacon() {
      var hx = hole.hole[0], hz = hole.hole[1];
      proj(hx - HOLE_R, 0, hz, P); proj(hx + HOLE_R, 0, hz, Q);
      var T1 = proj(hx + HOLE_R * 0.6, 7, hz, { x: 0, y: 0, s: 0, z: 0 }), T0 = proj(hx - HOLE_R * 0.6, 7, hz, { x: 0, y: 0, s: 0, z: 0 });
      var g = ctx.createLinearGradient(0, P.y, 0, T0.y);
      var pulse = 0.75 + 0.25 * Math.sin(time * 3);
      g.addColorStop(0, 'rgba(64,220,255,' + (0.38 * pulse) + ')');
      g.addColorStop(1, 'rgba(64,220,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); quad(P, Q, T1, T0);
      ctx.fillStyle = g;
      ctx.fill();
      // Fahne
      var px = hx + HOLE_R * 0.8;
      proj(px, 0, hz, P); proj(px, 1.7, hz, Q);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y);
      glowStroke('234,246,251', 1.1, 0.9);
      ctx.beginPath();
      ctx.moveTo(Q.x, Q.y);
      var n = 8;
      for (var i = 1; i <= n; i++) {
        var u = i / n, wave = Math.sin(time * 6 - u * 3) * 0.08 * u;
        proj(px + u * 0.75, 1.7 - u * 0.22 + wave, hz + wave, P);
        ctx.lineTo(P.x, P.y);
      }
      for (i = n; i >= 0; i--) {
        var u2 = i / n, wave2 = Math.sin(time * 6 - u2 * 3) * 0.08 * u2;
        proj(px + u2 * 0.75, 1.25 + u2 * 0.22 + wave2, hz + wave2, P);
        ctx.lineTo(P.x, P.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,63,180,0.45)';
      ctx.fill();
      glowStroke('255,63,180', 1, 0.9);
      // Bahnnummer auf der Fahne
      proj(px + 0.3, 1.47, hz, P);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 ' + Math.max(9, Math.round(P.s * 0.32)) + 'px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(holeIdx + 1), P.x, P.y);
    }

    function drawWall(w) {
      proj(w[0], 0, w[1], Q4[0]); proj(w[2], 0, w[3], Q4[1]); proj(w[2], WALL_H, w[3], Q4[2]); proj(w[0], WALL_H, w[1], Q4[3]);
      ctx.beginPath(); quad(Q4[0], Q4[1], Q4[2], Q4[3]);
      ctx.fillStyle = 'rgba(10,46,62,0.62)';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.moveTo(Q4[3].x, Q4[3].y); ctx.lineTo(Q4[2].x, Q4[2].y);
      glowStroke('64,220,255', clamp(Q4[3].s * 0.035, 1, 2.6), 1);
      ctx.beginPath(); ctx.moveTo(Q4[0].x, Q4[0].y); ctx.lineTo(Q4[1].x, Q4[1].y);
      ctx.strokeStyle = 'rgba(64,220,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawCylinder(x, z, r, h, col, fillTop, fl) {
      var n = 20, i, a;
      var bot = [], top = [];
      for (i = 0; i < n; i++) {
        a = i / n * Math.PI * 2;
        bot.push(proj(x + Math.cos(a) * r, 0, z + Math.sin(a) * r, { x: 0, y: 0, s: 0, z: 0 }));
        top.push(proj(x + Math.cos(a) * r, h, z + Math.sin(a) * r, { x: 0, y: 0, s: 0, z: 0 }));
      }
      ctx.fillStyle = 'rgba(40,8,40,0.95)';
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n;
        ctx.beginPath(); quad(bot[i], bot[j], top[j], top[i]); ctx.fill();
      }
      ctx.beginPath();
      for (i = 0; i < n; i++) { if (i) ctx.lineTo(top[i].x, top[i].y); else ctx.moveTo(top[i].x, top[i].y); }
      ctx.closePath();
      ctx.fillStyle = fillTop;
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      if (fl > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * fl) + ')';
        ctx.fill();
      }
      glowStroke(col, clamp(top[0].s * 0.035, 1, 2.6), 1);
      ctx.beginPath();
      for (i = 0; i < n; i++) { if (i) ctx.lineTo(bot[i].x, bot[i].y); else ctx.moveTo(bot[i].x, bot[i].y); }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(' + col + ',0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawBumper(i) {
      var u = hole.bumpers[i], fl = bumpFlash[i] || 0;
      var grow = 1 + fl * 0.12;
      drawCylinder(u[0], u[1], u[2] * grow, 0.5, '255,63,180', 'rgba(255,63,180,0.35)', fl);
      proj(u[0], 0.5, u[1], P);
      var s = u[2] * P.s * (1.6 + fl);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + fl * 0.5;
      ctx.drawImage(spr.mag, P.x - s, P.y - s * 0.7, s * 2, s * 1.4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawWindmill() {
      var M = hole.windmill, an = M.speed * simT, ux = Math.cos(an), uz = Math.sin(an), vx = -uz * 0.09, vz = ux * 0.09;
      var c = [], y0 = 0.16, y1 = 0.36;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
        var x = M.x + ux * M.len * k[0] + vx * k[1], z = M.z + uz * M.len * k[0] + vz * k[1];
        c.push(proj(x, y0, z, { x: 0, y: 0, s: 0, z: 0 }), proj(x, y1, z, { x: 0, y: 0, s: 0, z: 0 }));
      });
      // Seitenflächen
      ctx.fillStyle = 'rgba(40,8,40,0.95)';
      for (var i = 0; i < 4; i++) {
        var j = (i + 1) % 4;
        ctx.beginPath(); quad(c[i * 2], c[j * 2], c[j * 2 + 1], c[i * 2 + 1]); ctx.fill();
      }
      ctx.beginPath(); quad(c[1], c[3], c[5], c[7]);
      ctx.fillStyle = 'rgba(255,63,180,0.4)';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke('255,63,180', clamp(c[1].s * 0.035, 1, 2.6), 1);
      // Lichter an den Flügelspitzen
      for (var e = -1; e <= 1; e += 2) {
        proj(M.x + ux * M.len * e, y1, M.z + uz * M.len * e, P);
        var s = Math.max(4, P.s * 0.3);
        ctx.drawImage(spr.mag, P.x - s, P.y - s, s * 2, s * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      drawCylinder(M.x, M.z, 0.22, 0.55, '64,220,255', 'rgba(64,220,255,0.4)', 0);
    }

    function drawRamp() {
      var R = hole.ramp;
      var a = proj(R.x0, 0, R.z0, { x: 0, y: 0, s: 0, z: 0 }), b = proj(R.x1, 0, R.z0, { x: 0, y: 0, s: 0, z: 0 });
      var c = proj(R.x1, R.h, R.z1, { x: 0, y: 0, s: 0, z: 0 }), d = proj(R.x0, R.h, R.z1, { x: 0, y: 0, s: 0, z: 0 });
      var e = proj(R.x1, 0, R.z1, { x: 0, y: 0, s: 0, z: 0 }), f = proj(R.x0, 0, R.z1, { x: 0, y: 0, s: 0, z: 0 });
      ctx.fillStyle = 'rgba(10,46,62,0.9)';
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(e.x, e.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(f.x, f.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); quad(a, b, c, d);
      ctx.fillStyle = 'rgba(64,220,255,0.16)';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke('64,220,255', 1.4, 1);
      for (var k = 0; k < 3; k++) {
        var u = (time * 1.4 + k / 3) % 1, zz = R.z0 + u * (R.z1 - R.z0), yy = u * R.h, cx = (R.x0 + R.x1) / 2, hw = (R.x1 - R.x0) * 0.3;
        ctx.beginPath();
        proj(cx - hw, yy + 0.02, zz - 0.25, P); ctx.moveTo(P.x, P.y);
        proj(cx, yy + 0.02, zz + 0.05, P); ctx.lineTo(P.x, P.y);
        proj(cx + hw, yy + 0.02, zz - 0.25, P); ctx.lineTo(P.x, P.y);
        glowStroke('255,211,107', 1.2, Math.sin(u * Math.PI));
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    var SPOTS = [[0, 1, 0], [0.7, 0.5, 0.5], [-0.6, 0.3, 0.74], [0.2, -0.4, 0.9], [-0.8, -0.3, -0.5], [0.5, -0.8, -0.3], [0.1, 0.4, -0.9], [-0.2, -0.95, 0.2], [0.9, 0.1, -0.4]];
    SPOTS = SPOTS.map(function (v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); return [v[0] / l, v[1] / l, v[2] / l]; });

    function drawBall() {
      if (state === 'sink' && stateT > 0.45) return;
      var by = ball.y + BALL_R;
      var shrink = state === 'sink' ? 1 - clamp(stateT / 0.45, 0, 1) * 0.5 : 1;
      var fade = state === 'fall' ? clamp(1 - stateT / 1.0, 0, 1) : 1;
      if (fade <= 0) return;
      proj(ball.x, by, ball.z, P);
      var r = BALL_R * P.s * shrink * (state === 'fall' ? 0.6 + 0.4 * fade : 1);
      var cx = P.x, cy = P.y;
      // Schatten im Flug
      if (ball.air && ball.y > 0.05) {
        proj(ball.x, 0, ball.z, Q);
        if (onFloor(hole, ball.x, ball.z)) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(Q.x, Q.y, BALL_R * Q.s, BALL_R * Q.s * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(spr.cyan, cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
      ctx.globalCompositeOperation = 'source-over';
      var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#1d6f86');
      g.addColorStop(0.55, '#0a3443');
      g.addColorStop(1, '#03151c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Leuchtflecken des eingerollten Lurchs drehen sich mit
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < SPOTS.length; i++) {
        var v = SPOTS[i], m = rot;
        var dx = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
        var dy = m[3] * v[0] + m[4] * v[1] + m[5] * v[2];
        var dz = m[6] * v[0] + m[7] * v[1] + m[8] * v[2];
        var zc = -dy * SP + dz * CP;
        if (zc > 0.15) continue; // Rückseite
        var yc = dy * CP + dz * SP;
        var face = clamp(-zc, 0, 1);
        var sx = cx + dx * r * 0.82, sy = cy - yc * r * 0.82, sr = r * 0.17 * (0.5 + 0.5 * face);
        ctx.globalAlpha = fade * (0.4 + 0.6 * face);
        ctx.drawImage(spr.yellow, sx - sr * 2.4, sy - sr * 2.4, sr * 4.8, sr * 4.8);
      }
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      glowStroke('64,220,255', Math.max(1, r * 0.08), fade);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // In Ruhe guckt der Lurch mit Kulleraugen heraus
      if (state === 'aim' && restT > 0.15) drawEyes(cx, cy, r);
    }

    function drawEyes(cx, cy, r) {
      var pop = clamp((restT - 0.15) / 0.2, 0, 1);
      var dir = aim ? [aim.dx, aim.dz] : [hole.hole[0] - ball.x, hole.hole[1] - ball.z];
      var dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]) || 1;
      dir = [dir[0] / dl, dir[1] / dl];
      // Pupillen-Blickrichtung auf dem Bildschirm
      proj(ball.x + dir[0], BALL_R, ball.z + dir[1], Q);
      var lx = Q.x - cx, ly = Q.y - cy, ll = Math.sqrt(lx * lx + ly * ly) || 1;
      lx /= ll; ly /= ll;
      var er = r * 0.42 * pop;
      for (var e = -1; e <= 1; e += 2) {
        var ex = cx + e * r * 0.48, ey = cy - r * (0.55 + 0.3 * pop);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.4;
        ctx.drawImage(spr.white, ex - er * 2.2, ey - er * 2.2, er * 4.4, er * 4.4);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        var open = blinkT > 0 ? 0.12 : 1;
        ctx.fillStyle = '#eafcff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, er, er * open, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#40dcff';
        ctx.lineWidth = Math.max(1, er * 0.15);
        ctx.stroke();
        if (open > 0.5) {
          var pr = er * 0.48;
          ctx.fillStyle = '#04121a';
          ctx.beginPath();
          ctx.arc(ex + lx * er * 0.42, ey + ly * er * 0.42, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(ex + lx * er * 0.42 - pr * 0.35, ey + ly * er * 0.42 - pr * 0.35, pr * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawTrail() {
      if (trail.length < 2) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (var i = 1; i < trail.length; i++) {
        var a = trail[i - 1], b = trail[i];
        proj(a.x, a.y + BALL_R, a.z, P); proj(b.x, b.y + BALL_R, b.z, Q);
        var f = 1 - i / trail.length;
        ctx.strokeStyle = 'rgba(64,220,255,' + (0.5 * f) + ')';
        ctx.lineWidth = Math.max(1, BALL_R * 1.4 * Q.s * f);
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawAim() {
      if (!aim || state !== 'aim') return;
      ctx.globalCompositeOperation = 'lighter';
      // Vorschau-Punkte
      for (var i = 0; i < preview.length; i++) {
        var pt = preview[i];
        proj(pt[0], pt[1] + 0.05, pt[2], P);
        var f = 1 - i / (preview.length + 2);
        var s = Math.max(2, P.s * 0.07);
        ctx.globalAlpha = f;
        ctx.drawImage(spr.white, P.x - s * 2, P.y - s * 2, s * 4, s * 4);
      }
      ctx.globalAlpha = 1;
      // Kraft-Ring um den Ball
      proj(ball.x, 0.02, ball.z, P);
      var col = aim.p > 0.75 ? '255,63,180' : (aim.p > 0.4 ? '255,211,107' : '64,220,255');
      ctx.beginPath();
      circlePath(ball.x, 0.02, ball.z, BALL_R + 0.25, 28);
      ctx.strokeStyle = 'rgba(' + col + ',0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      var n = Math.max(2, Math.round(28 * aim.p)), base = Math.atan2(-aim.dz, -aim.dx);
      for (var k = 0; k <= n; k++) {
        var a = base + (k / 28 - aim.p / 2) * Math.PI * 2;
        proj(ball.x + Math.cos(a) * (BALL_R + 0.25), 0.02, ball.z + Math.sin(a) * (BALL_R + 0.25), Q);
        if (k) ctx.lineTo(Q.x, Q.y); else ctx.moveTo(Q.x, Q.y);
      }
      glowStroke(col, 2, 1);
      // Gummiband nach hinten
      proj(ball.x - aim.dx * (0.4 + aim.p * 1.4), 0.05, ball.z - aim.dz * (0.4 + aim.p * 1.4), Q);
      proj(ball.x, BALL_R, ball.z, P);
      ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y);
      glowStroke(col, 1.2, 0.7);
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawParticles() {
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        proj(p.x, p.y, p.z, P);
        var s = p.size * P.s;
        if (s < 0.4) continue;
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.drawImage(p.sp, P.x - s * 2, P.y - s * 2, s * 4, s * 4);
      }
      ctx.globalAlpha = 1;
      for (var r = 0; r < rings.length; r++) {
        var g = rings[r], dur = g.big ? 0.9 : 0.5, rr = (g.r0 || 0.3) + g.t * (g.big ? 4 : 2.2);
        ctx.beginPath(); circlePath(g.x, g.y, g.z, rr, 28);
        ctx.strokeStyle = 'rgba(' + g.c + ',' + (1 - g.t / dur) + ')';
        ctx.lineWidth = g.big ? 3 : 2;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (bg) ctx.drawImage(bg, 0, 0, W, H);
      else { ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, W, H); }
      if (shake > 0 && !reduceMotion) {
        ctx.translate((Math.random() - 0.5) * shake * 18, (Math.random() - 0.5) * shake * 18);
      }
      drawAbyss();

      // Ball unter der Bahn (Absturz) vor dem Boden zeichnen
      var below = state === 'fall' && ball.y < -0.2;
      if (below) drawBall();
      drawFloor();

      // Aufbauten nach Tiefe sortiert
      var items = [], i;
      for (i = 0; i < hole.walls.length; i++) {
        var w = hole.walls[i];
        items.push({ t: 'w', w: w, d: depth((w[0] + w[2]) / 2, 0.2, (w[1] + w[3]) / 2) });
      }
      for (i = 0; i < hole.bumpers.length; i++) items.push({ t: 'b', i: i, d: depth(hole.bumpers[i][0], 0.25, hole.bumpers[i][1]) });
      if (hole.windmill) items.push({ t: 'm', d: depth(hole.windmill.x, 0.3, hole.windmill.z) });
      if (hole.ramp) items.push({ t: 'r', d: depth((hole.ramp.x0 + hole.ramp.x1) / 2, 0.2, hole.ramp.z1) });
      items.push({ t: 'f', d: depth(hole.hole[0], 0.5, hole.hole[1] + 0.1) });
      if (!below) items.push({ t: 'ball', d: depth(ball.x, ball.y + BALL_R, ball.z) - 0.05 });
      items.sort(function (a, b) { return b.d - a.d; });
      for (i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.t === 'w') drawWall(it.w);
        else if (it.t === 'b') drawBumper(it.i);
        else if (it.t === 'm') drawWindmill();
        else if (it.t === 'r') drawRamp();
        else if (it.t === 'f') drawBeacon();
        else { drawTrail(); drawBall(); }
      }
      drawAim();
      drawParticles();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (flash > 0) {
        ctx.fillStyle = 'rgba(' + flashCol + ',' + (flash * 0.3) + ')';
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
      if (state !== 'intro' && !perfChecked && raw < 0.2) {
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
        aim = null;
        preview = [];
        if (state === 'roll' || state === 'fly' || state === 'aim' || state === 'fall' || state === 'sink') {
          prevState = state;
          state = 'paused';
          showCard({
            label: cfg.label, title: 'Pause', text: 'Der Lurch wartet auf dich.', button: 'Weiter',
            action: function () { state = prevState; }
          });
        }
      } else {
        hidden = false;
        startLoop();
      }
    }

    // ── Eingabe: ziehen und loslassen (Steinschleuder) ──
    function onDown(e) {
      if (state !== 'aim' || cardShown) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      aim = { id: e.pointerId, sx: e.clientX, sy: e.clientY, p: 0, dx: 0, dz: 1 };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    }
    function onMove(e) {
      if (!aim || e.pointerId !== aim.id || state !== 'aim') return;
      var mx = e.clientX - aim.sx, my = e.clientY - aim.sy;
      var len = Math.sqrt(mx * mx + my * my);
      aim.p = clamp(len / (Math.min(W, H) * 0.42), 0, 1);
      if (len < 4) { aim.p = 0; preview = []; return; }
      // Bodenpunkt des Balls als Bezug: Geraden auf dem Bildschirm bleiben Geraden auf dem Boden
      proj(ball.x, 0, ball.z, P);
      var t = unproject(P.x - mx / len * 60, P.y - my / len * 60);
      var dx = t.x - ball.x, dz = t.z - ball.z, dl = Math.sqrt(dx * dx + dz * dz) || 1;
      aim.dx = dx / dl;
      aim.dz = dz / dl;
      if (aim.p >= 0.05) computePreview(aim.p, aim.dx, aim.dz);
      else preview = [];
    }
    function onUp(e) {
      if (!aim || e.pointerId !== aim.id) return;
      var a = aim;
      aim = null;
      preview = [];
      if (state === 'aim' && a.p >= 0.05) shoot(a.p, a.dx, a.dz);
    }
    function onCancel() { aim = null; preview = []; }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    card.addEventListener('click', onCardClick);
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof ResizeObserver === 'function') {
      resizeObs = new ResizeObserver(function () { if (!destroyed) resize(); });
      resizeObs.observe(root);
    }

    resize();
    updateCamPos();
    showCard({
      label: cfg.label,
      title: cfg.title,
      text: cfg.intro,
      meta: cfg.holes.length + (cfg.holes.length === 1 ? ' Bahn' : ' Bahnen') + ' · Par ' + cfg.holes.reduce(function (s, i) { return s + COURSE[i].par; }, 0),
      rows: [
        ['drag', 'Irgendwo ziehen – je weiter, desto fester'],
        ['hole', 'Loslassen schießt in Gegenrichtung'],
        ['jump', 'Bumper, Portale und Schanzen nutzen']
      ],
      button: cfg.startText,
      action: startGame
    });
    hidden = !!document.hidden;
    render();
    startLoop();

    return {
      // Nur lesend bzw. ohne Seiteneffekt, für automatisierte Tests (Testseite)
      _snapshot: function () {
        proj(ball.x, BALL_R, ball.z, P);
        return {
          state: state, hole: holeIdx, strokes: strokes, par: hole.par,
          ball: { x: ball.x, z: ball.z, y: ball.y, air: ball.air },
          target: hole.hole.slice(), screen: { x: P.x, y: P.y },
          results: results.slice()
        };
      },
      _predict: function (angle, p) { return predictFull(angle, p); },
      _screenOf: function (x, z) { proj(x, 0, z, Q); return { x: Q.x, y: Q.y }; },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (resizeObs) resizeObs.disconnect();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onCancel);
        card.removeEventListener('click', onCardClick);
        document.removeEventListener('visibilitychange', onVisibility);
        if (root.parentNode) root.parentNode.removeChild(root);
        particles = []; rockets = []; rings = []; trail = [];
        canvas.width = canvas.height = 0;
        removeStyle();
      }
    };
  }

  window.SchnitzelGames = window.SchnitzelGames || {};
  window.SchnitzelGames[NAME] = {
    title: 'Lurch-Golf',
    mount: mount
  };
})();
