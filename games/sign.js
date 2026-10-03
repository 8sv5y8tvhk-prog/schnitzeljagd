/* Schnitzeljagd-Minispiel „Leuchtreklame"
 * Kabel-Puzzle im Schaltkasten: Jeder geschlossene Stromkreis bringt Buchstaben
 * eines Neon-Schilds zum Leuchten. Am Ende steht das Lösungswort.
 * Registriert sich als window.SchnitzelGames.sign. Vertrag: games/README.md
 */
(function () {
  'use strict';

  var NAME = 'sign';

  var DEFAULTS = {
    word: 'LURCH',
    subtitle: '',
    circle: false,
    rounds: 4,
    hintAfter: 40,
    rain: true,
    title: 'Leuchtreklame',
    label: 'Minispiel',
    intro: 'Dreh die Kabelstücke, bis der Strom vom Stecker zur Klemme fließt. Jeder Stromkreis bringt Buchstaben zum Leuchten.',
    winText: 'Das Schild leuchtet – folge dem Licht!',
    startText: 'Strom an'
  };

  // Kabel-Anschlüsse als Bitmaske
  var BN = 1, BE = 2, BS = 4, BW = 8;
  var DIRS = [[BN, 0, -1, BS], [BE, 1, 0, BW], [BS, 0, 1, BN], [BW, -1, 0, BE]];
  // Puzzle-Größen je Runde (Spalten × Zeilen), werden an den Platz angepasst
  var SIZES = [[4, 4], [4, 5], [5, 5], [5, 6], [5, 6], [6, 6], [6, 6], [6, 7]];

  var CYAN = '64,220,255', MAG = '255,63,180', YEL = '255,211,107';

  var CSS = [
    '.sg-sign{position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg,#0a0e14);',
    'font-family:"Space Grotesk",-apple-system,sans-serif;color:var(--text,#eaf6fb);-webkit-user-select:none;user-select:none;',
    '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:none}',
    '.sg-sign *{box-sizing:border-box;margin:0;padding:0}',
    '.sg-sign__canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}',
    '.sg-sign__hud{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:10px;',
    'padding:0 26px;pointer-events:none;transition:opacity .3s ease}',
    '.sg-sign__hud.is-hidden{opacity:0}',
    '.sg-sign__lbl{font-size:11px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan,#40dcff);white-space:nowrap}',
    '.sg-sign__tip{font-size:12px;letter-spacing:.04em;color:rgba(234,246,251,.6);white-space:nowrap}',
    '.sg-sign__overlay{position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:center;',
    'padding:16px 16px 22px;pointer-events:none;opacity:0;transition:opacity .4s ease}',
    '.sg-sign__overlay.is-show{opacity:1;pointer-events:auto}',
    '.sg-sign__card{width:100%;max-width:420px;padding:22px 20px 20px;border-radius:18px;border:1px solid rgba(64,220,255,.3);',
    'background:linear-gradient(160deg,rgba(64,220,255,.10),rgba(64,220,255,.03)),rgba(10,14,20,.78);',
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.6);',
    'transform:translateY(18px);transition:transform .45s cubic-bezier(.2,1.2,.4,1)}',
    '.sg-sign__overlay.is-show .sg-sign__card{transform:none}',
    '.sg-sign__title{font-size:34px;font-weight:700;letter-spacing:-.02em;text-transform:uppercase;line-height:1.02;margin-top:6px}',
    '.sg-sign__title.is-ok{color:var(--ok,#4ade80);text-shadow:0 0 18px rgba(74,222,128,.5)}',
    '.sg-sign__text{font-size:15px;line-height:1.5;color:rgba(234,246,251,.74);margin-top:8px}',
    '.sg-sign__meta{margin-top:12px;font-size:12px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan,#40dcff)}',
    '.sg-sign__rows{list-style:none;margin-top:14px;display:grid;gap:8px}',
    '.sg-sign__rows li{display:flex;align-items:center;gap:12px;font-size:15px;color:rgba(234,246,251,.88)}',
    '.sg-sign__rows svg{width:30px;height:30px;color:var(--cyan,#40dcff);flex:0 0 auto}',
    '.sg-sign__btn{display:block;margin-top:18px;width:100%;height:52px;border:0;border-radius:14px;background:var(--cyan,#40dcff);',
    'color:#04121a;font:700 16px "Space Grotesk",-apple-system,sans-serif;box-shadow:0 6px 28px rgba(64,220,255,.45);cursor:pointer;',
    'touch-action:manipulation;-webkit-appearance:none;appearance:none}',
    '.sg-sign__btn:active{transform:scale(.98)}',
    '@media (prefers-reduced-motion: reduce){.sg-sign__card,.sg-sign__overlay,.sg-sign__hud{transition:none}}'
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
    rotate: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'],
    plug: ['M9 3v5', 'M15 3v5', 'M6 8h12v3a6 6 0 0 1-12 0z', 'M12 17v4'],
    sign: ['M4 6h16v10H4z', 'M8 10h8', 'M9 2l3 4 3-4', 'M12 16v5']
  };

  function str(v, fallback) {
    return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
  }
  function num(v, fallback, min, max) {
    var n = Number(v);
    if (v === null || v === '' || typeof v === 'boolean' || !isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }
  function bool(v, fallback) { return typeof v === 'boolean' ? v : fallback; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rint(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rotCW(m) { return ((m << 1) | (m >> 3)) & 15; }
  function bits(m) { return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function glowSprite(rgb) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var x = c.getContext('2d');
    var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(' + rgb + ',0.9)');
    gr.addColorStop(0.45, 'rgba(' + rgb + ',0.28)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
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

  // ── Puzzle-Erzeugung: zufälliger Spannbaum (Prim), dann verdrehen ──
  function genPuzzle(cols, rows, minWrong) {
    var n = cols * rows, mask = [], inTree = [], frontier = [], i;
    for (i = 0; i < n; i++) { mask.push(0); inTree.push(false); }
    var s = rint(rows), t = rint(rows);
    if (rows > 2) while (Math.abs(s - t) < 1) t = rint(rows);
    function add(c) {
      inTree[c] = true;
      var x = c % cols, y = (c / cols) | 0;
      for (var d = 0; d < 4; d++) {
        var nx = x + DIRS[d][1], ny = y + DIRS[d][2];
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !inTree[ny * cols + nx]) frontier.push([c, d, ny * cols + nx]);
      }
    }
    add(s * cols);
    while (frontier.length) {
      var k = rint(frontier.length), f = frontier[k];
      frontier[k] = frontier[frontier.length - 1];
      frontier.pop();
      if (inTree[f[2]]) continue;
      mask[f[0]] |= DIRS[f[1]][0];
      mask[f[2]] |= DIRS[f[1]][3];
      add(f[2]);
    }
    var src = s * cols, dst = t * cols + cols - 1;
    mask[src] |= BW;
    mask[dst] |= BE;
    // Lösungsweg im Baum (für Tipps)
    var prev = [], q = [src], seen = [];
    for (i = 0; i < n; i++) { prev.push(-1); seen.push(false); }
    seen[src] = true;
    while (q.length) {
      var c = q.shift(), cx = c % cols, cy = (c / cols) | 0;
      for (var d2 = 0; d2 < 4; d2++) {
        if (!(mask[c] & DIRS[d2][0])) continue;
        var nx2 = cx + DIRS[d2][1], ny2 = cy + DIRS[d2][2];
        if (nx2 < 0 || ny2 < 0 || nx2 >= cols || ny2 >= rows) continue;
        var nc = ny2 * cols + nx2;
        if (!seen[nc]) { seen[nc] = true; prev[nc] = c; q.push(nc); }
      }
    }
    var path = [];
    for (var p = dst; p !== -1; p = prev[p]) path.unshift(p);
    // Verdrehen
    var cur = mask.map(function (m) {
      var r = rint(4), v = m;
      for (var j = 0; j < r; j++) v = rotCW(v);
      return v;
    });
    var P = { cols: cols, rows: rows, s: s, t: t, sol: mask, cur: cur, path: path, ang: [], tgt: [], hintAt: 0 };
    for (i = 0; i < n; i++) { P.ang.push(0); P.tgt.push(0); }
    // Mindestens so viele Kacheln auf dem Lösungsweg falsch drehen (Schwierigkeit)
    var turnable = path.filter(function (c) { return bits(mask[c]) < 4; });
    var wrongN = turnable.filter(function (c) { return cur[c] !== mask[c]; }).length;
    var want = Math.min(minWrong || 0, turnable.length);
    for (var tries = 0; wrongN < want && tries < 50; tries++) {
      var pick = turnable[rint(turnable.length)];
      if (cur[pick] === mask[pick]) { cur[pick] = rotCW(cur[pick]); wrongN++; }
    }
    // Nie schon gelöst starten
    var guard = 0;
    while (solved(P).ok && guard++ < 20) {
      var pc = path[rint(path.length)];
      if (bits(cur[pc]) < 4) cur[pc] = rotCW(cur[pc]);
    }
    return P;
  }

  function solved(P) {
    var cols = P.cols, rows = P.rows, n = cols * rows, on = [], i;
    for (i = 0; i < n; i++) on.push(false);
    var src = P.s * cols;
    if (!(P.cur[src] & BW)) return { on: on, ok: false };
    var q = [src];
    on[src] = true;
    while (q.length) {
      var c = q.shift(), x = c % cols, y = (c / cols) | 0;
      for (var d = 0; d < 4; d++) {
        if (!(P.cur[c] & DIRS[d][0])) continue;
        var nx = x + DIRS[d][1], ny = y + DIRS[d][2];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        var nc = ny * cols + nx;
        if (!on[nc] && (P.cur[nc] & DIRS[d][3])) { on[nc] = true; q.push(nc); }
      }
    }
    var dst = P.t * cols + cols - 1;
    return { on: on, ok: on[dst] && !!(P.cur[dst] & BE) };
  }

  function mount(container, options) {
    options = options || {};
    var params = (options.params && typeof options.params === 'object') ? options.params : {};
    var onWin = typeof options.onWin === 'function' ? options.onWin : function () {};

    var word = str(params.word, DEFAULTS.word).slice(0, 24);
    var cfg = {
      word: word,
      subtitle: str(params.subtitle, DEFAULTS.subtitle).slice(0, 32),
      circle: bool(params.circle, DEFAULTS.circle),
      hintAfter: num(params.hintAfter, DEFAULTS.hintAfter, 5, 600),
      rain: bool(params.rain, DEFAULTS.rain),
      title: str(params.title, DEFAULTS.title),
      label: str(params.label, DEFAULTS.label),
      intro: str(params.intro, DEFAULTS.intro),
      winText: str(params.winText, DEFAULTS.winText),
      startText: str(params.startText, DEFAULTS.startText)
    };
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Buchstaben auf Runden verteilen
    var chars = Array.from ? Array.from(cfg.word) : cfg.word.split('');
    var letterIdx = [];
    chars.forEach(function (ch, i) { if (ch.trim()) letterIdx.push(i); });
    var R = clamp(num(params.rounds, DEFAULTS.rounds, 1, 8), 1, Math.max(1, letterIdx.length));
    var groups = [];
    for (var g = 0; g < R; g++) {
      var a0 = Math.round(g * letterIdx.length / R), a1 = Math.round((g + 1) * letterIdx.length / R);
      groups.push(letterIdx.slice(a0, a1));
    }

    addStyle();

    // ── DOM ──
    var root = el('div', 'sg-sign');
    root.setAttribute('lang', 'de');
    var canvas = el('canvas', 'sg-sign__canvas');
    canvas.setAttribute('aria-label', 'Leuchtschild und Schaltkasten');
    root.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var hud = el('div', 'sg-sign__hud is-hidden');
    var hudL = el('div', 'sg-sign__lbl');
    var hudR = el('div', 'sg-sign__tip', 'Tippen = drehen');
    hud.appendChild(hudL);
    hud.appendChild(hudR);
    root.appendChild(hud);

    var live = el('div');
    live.setAttribute('aria-live', 'polite');
    live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
    root.appendChild(live);

    var overlay = el('div', 'sg-sign__overlay');
    var card = el('div', 'sg-sign__card');
    card.setAttribute('role', 'dialog');
    overlay.appendChild(card);
    root.appendChild(overlay);
    container.appendChild(root);

    // ── Zustand ──
    var W = 1, H = 1, dpr = 1, S = 1;
    var wall = null;
    var spr = { cyan: glowSprite(CYAN), mag: glowSprite(MAG), yel: glowSprite(YEL), white: glowSprite('220,245,255'), green: glowSprite('74,222,128') };
    var lay = {};                // Layout (Schild, Schaltkasten, Kabel)
    var glyphs = [];             // je Zeichen: { ch, x, lit, unlit, on, at, glitch }
    var ring = null, sub = null; // vorgerenderte Sprites
    var state = 'intro', stateT = 0, time = 0, round = 0;
    var P = null, power = null;
    var anim = null;             // Stromstoß-Animation
    var particles = [], drops = [], zs = [];
    var lurch = { mode: 'sleep', hop: 0, look: 0, blink: 0, nextBlink: 2.5, wake: 0 };
    var finaleT = -1, ringP = 0, subOn = -1, winSent = false, cardShown = false, cardAction = null;
    var raf = 0, last = 0, destroyed = false, hidden = false;
    var downTile = -1, downId = null, taps = 0;
    var resizeObs = null;
    var Pt = { x: 0, y: 0 };

    // ── Layout & Vorrendern ──
    function resize() {
      var r = root.getBoundingClientRect();
      var nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
      var nd = Math.min(window.devicePixelRatio || 1, 2);
      if (nw === W && nh === H && nd === dpr && wall) return;
      W = nw; H = nh; dpr = nd;
      S = Math.min(W / 390, H / 844);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      lay.signTop = H * 0.04 + 46 * S; // oben Platz für den Lurch auf dem Schild
      lay.signBot = H * 0.42;
      lay.boxX = 14;
      lay.boxW = W - 28;
      lay.boxTop = H * 0.47;
      lay.boxBot = H - 16;
      hud.style.top = (lay.boxTop + 14) + 'px';
      buildWall();
      buildSign();
      layoutBoard();
      render();
    }

    function buildWall() {
      var rand = seeded(1312);
      var c = document.createElement('canvas');
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      var g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = '#07060d';
      g.fillRect(0, 0, W, H);
      var bh = Math.max(14, 22 * S), bw = bh * 2.3;
      for (var y = 0, row = 0; y < H; y += bh, row++) {
        for (var x = (row % 2 ? -bw / 2 : 0); x < W; x += bw) {
          var v = 14 + rand() * 12;
          g.fillStyle = 'rgb(' + Math.round(v * 1.05) + ',' + Math.round(v * 0.85) + ',' + Math.round(v * 1.5) + ')';
          g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
          // feuchter Glanz oben an manchen Steinen
          if (rand() < 0.3) {
            g.fillStyle = 'rgba(120,160,255,' + (0.03 + rand() * 0.04) + ')';
            g.fillRect(x + 3, y + 2, (bw - 6) * rand(), 1.5);
          }
        }
      }
      var vg = g.createRadialGradient(W / 2, H * 0.28, W * 0.1, W / 2, H * 0.4, Math.max(W, H) * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
      wall = c;
    }

    function fontPx(fs) { return '700 ' + fs + 'px "Space Grotesk", -apple-system, sans-serif'; }

    // Neon-Röhre (leuchtend oder aus) für einen Text vorrendern
    function tube(text, fs, rgb, lit, widthMul) {
      var m = document.createElement('canvas').getContext('2d');
      m.font = fontPx(fs);
      var w = m.measureText(text).width, pad = fs * 0.55;
      var cw = w + pad * 2, ch = fs * 1.25 + pad * 2;
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(cw * dpr));
      c.height = Math.max(1, Math.round(ch * dpr));
      var g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.font = fontPx(fs);
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      var x = pad, y = ch / 2, lw = fs * 0.07 * (widthMul || 1);
      if (lit) {
        g.shadowColor = 'rgba(' + rgb + ',1)';
        g.shadowBlur = fs * 0.45;
        g.strokeStyle = 'rgba(' + rgb + ',0.9)';
        g.lineWidth = lw * 1.4;
        g.strokeText(text, x, y);
        g.shadowBlur = fs * 0.18;
        g.strokeText(text, x, y);
        g.shadowBlur = fs * 0.06;
        g.strokeStyle = 'rgba(255,255,255,0.95)';
        g.lineWidth = lw * 0.45;
        g.strokeText(text, x, y);
      } else {
        g.strokeStyle = 'rgba(18,24,34,0.95)';
        g.lineWidth = lw * 1.5;
        g.strokeText(text, x, y);
        g.strokeStyle = 'rgba(' + rgb + ',0.16)';
        g.lineWidth = lw * 0.9;
        g.strokeText(text, x, y);
        g.strokeStyle = 'rgba(200,220,235,0.18)';
        g.lineWidth = lw * 0.25;
        g.strokeText(text, x, y);
      }
      return { c: c, w: cw, h: ch, pad: pad, tw: w };
    }

    function buildSign() {
      var m = document.createElement('canvas').getContext('2d');
      var areaH = lay.signBot - lay.signTop;
      var fs = Math.round(areaH * (cfg.circle ? 0.26 : 0.32));
      m.font = fontPx(fs);
      var maxW = W * (cfg.circle ? 0.66 : 0.82);
      var tw = m.measureText(cfg.word).width;
      if (tw > maxW) { fs = Math.floor(fs * maxW / tw); m.font = fontPx(fs); tw = m.measureText(cfg.word).width; }
      fs = Math.max(14, fs);
      lay.fs = fs;
      lay.cx = W / 2;
      lay.cy = lay.signTop + areaH * (cfg.subtitle ? 0.44 : 0.5);
      var x0 = W / 2 - tw / 2, prefix = '';
      var old = glyphs;
      glyphs = chars.map(function (ch, i) {
        var x = x0 + m.measureText(prefix).width;
        prefix += ch;
        var o = old[i] || {};
        return {
          ch: ch, x: x, space: !ch.trim(),
          lit: ch.trim() ? tube(ch, fs, CYAN, true) : null,
          unlit: ch.trim() ? tube(ch, fs, CYAN, false) : null,
          on: !!o.on, at: o.at != null ? o.at : -1, glitch: o.glitch || rnd(4, 9), w: m.measureText(ch).width
        };
      });
      lay.wordW = tw;
      lay.wordL = x0;
      // Pinselkreis
      if (cfg.circle) {
        var Rr = Math.min((areaH - 28) / 2.3, W * 0.42); // feste Größe: verrät nichts über die Wortlänge; Rahmen passt in den Bereich
        lay.er = Rr;
        ring = buildBrushRing(Rr);
      }
      if (cfg.subtitle) {
        var sfs = Math.max(12, Math.round(fs * 0.3));
        sub = { on: tube(cfg.subtitle, sfs, YEL, true, 1.3), off: tube(cfg.subtitle, sfs, YEL, false, 1.3) };
        lay.subY = lay.cy + fs * 0.62 + sfs * 0.7;
      }
      // Rahmen um das Schild
      var fw = Math.max(cfg.circle ? lay.er * 2 + 30 : tw + fs * 0.9, W * 0.84);
      lay.frameW = Math.min(W - 24, fw);
      lay.frameL = W / 2 - lay.frameW / 2;
      var cpad = cfg.circle ? 14 + lay.er * 0.14 : 0;
      if (cfg.circle) lay.frameW = Math.min(W - 24, Math.max(lay.er * 2 + cpad * 2, W * 0.84));
      lay.frameL = W / 2 - lay.frameW / 2;
      lay.frameT = cfg.circle ? lay.cy - lay.er - cpad : lay.cy - fs * 0.85;
      lay.frameB = cfg.circle ? lay.cy + lay.er + cpad : (cfg.subtitle ? lay.subY + fs * 0.42 : lay.cy + fs * 0.85);
    }

    // Pinselkreis: dicker Ansatz, dünn auslaufend, kleine Lücke
    function buildBrushRing(Rr) {
      var pad = Rr * 0.3, size = Rr * 2 + pad * 2;
      var c = document.createElement('canvas');
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
      var g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.lineCap = 'round';
      var cx = size / 2, cy = size / 2, n = 140, a0 = -Math.PI * 0.62, sweep = Math.PI * 1.86;
      var rand = seeded(88);
      var pts = [];
      for (var i = 0; i <= n; i++) {
        var t = i / n, a = a0 + sweep * t;
        var r = Rr * (1 + 0.025 * Math.sin(t * 9) + 0.012 * (rand() - 0.5));
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, Rr * 0.11 * Math.pow(1 - t * 0.82, 0.9) + 1.5]);
      }
      function pass(blur, col, mul) {
        g.shadowBlur = blur;
        g.shadowColor = 'rgba(' + MAG + ',1)';
        g.strokeStyle = col;
        for (var k = 1; k < pts.length; k++) {
          g.lineWidth = pts[k][2] * mul;
          g.beginPath();
          g.moveTo(pts[k - 1][0], pts[k - 1][1]);
          g.lineTo(pts[k][0], pts[k][1]);
          g.stroke();
        }
      }
      pass(Rr * 0.18, 'rgba(' + MAG + ',0.85)', 1);
      pass(Rr * 0.05, 'rgba(255,200,235,0.9)', 0.35);
      return { c: c, size: size, a0: a0, sweep: sweep };
    }

    function layoutBoard() {
      if (!P) return;
      var side = Math.max(26, 30 * S);
      var head = 44;
      var gw = lay.boxW - side * 2 - 12, gh = lay.boxBot - lay.boxTop - head - 18;
      lay.tile = Math.floor(Math.min(gw / P.cols, gh / P.rows, 84 * S + 10));
      lay.gx = W / 2 - (lay.tile * P.cols) / 2;
      lay.gy = lay.boxTop + head + (gh - lay.tile * P.rows) / 2;
      lay.side = side;
    }

    function fitSize(spec) {
      // Spalten/Zeilen so wählen, dass Kacheln mindestens 46 px groß sind
      var side = Math.max(26, 30 * S);
      var gw = lay.boxW - side * 2 - 12, gh = lay.boxBot - lay.boxTop - 44 - 18;
      var cols = spec[0], rows = spec[1];
      while (cols > 3 && gw / cols < 46) cols--;
      while (rows > 3 && gh / rows < 46) rows--;
      return [cols, rows];
    }

    // ── Karten ──
    function showCard(o) {
      while (card.firstChild) card.removeChild(card.firstChild);
      if (o.label) card.appendChild(el('div', 'sg-sign__lbl', o.label));
      card.appendChild(el('h2', 'sg-sign__title' + (o.titleClass ? ' ' + o.titleClass : ''), o.title));
      if (o.text) card.appendChild(el('p', 'sg-sign__text', o.text));
      if (o.meta) card.appendChild(el('div', 'sg-sign__meta', o.meta));
      if (o.rows) {
        var ul = el('ul', 'sg-sign__rows');
        o.rows.forEach(function (rw) {
          var li = el('li');
          li.appendChild(svg(ICONS[rw[0]]));
          li.appendChild(el('span', null, rw[1]));
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      cardAction = o.action || null;
      if (o.button) {
        var b = el('button', 'sg-sign__btn', o.button);
        b.type = 'button';
        card.appendChild(b);
      }
      overlay.classList.add('is-show');
      cardShown = true;
      if (o.button) { try { card.querySelector('.sg-sign__btn').focus({ preventScroll: true }); } catch (e) { /* alt */ } }
    }
    function hideCard() { overlay.classList.remove('is-show'); cardShown = false; cardAction = null; }
    function onCardClick(e) {
      var b = e.target && e.target.closest ? e.target.closest('.sg-sign__btn') : null;
      if (!b || !cardAction) return;
      var a = cardAction;
      hideCard();
      a();
    }

    function safeCall(fn) { try { fn(); } catch (e) { if (window.console) console.error(e); } }

    // ── Ablauf ──
    function startGame() {
      round = 0;
      newRound();
      hud.classList.remove('is-hidden');
    }

    function newRound() {
      var sz = fitSize(SIZES[Math.min(round, SIZES.length - 1)]);
      P = genPuzzle(sz[0], sz[1], 3 + round);
      P.born = time;
      P.hintAt = time + cfg.hintAfter;
      P.hints = [];
      layoutBoard();
      power = solved(P);
      state = 'play';
      stateT = 0;
      hudL.textContent = 'Stromkreis ' + (round + 1) + ' / ' + groups.length;
      live.textContent = 'Stromkreis ' + (round + 1) + ' von ' + groups.length;
    }

    function tileAt(x, y) {
      if (!P) return -1;
      var cx = Math.floor((x - lay.gx) / lay.tile), cy = Math.floor((y - lay.gy) / lay.tile);
      if (cx < 0 || cy < 0 || cx >= P.cols || cy >= P.rows) return -1;
      return cy * P.cols + cx;
    }

    function rotateTile(i) {
      if (state !== 'play' || i < 0) return;
      P.cur[i] = rotCW(P.cur[i]);
      P.tgt[i] += Math.PI / 2;
      taps++;
      var c = tileCenter(i);
      sparks(c.x, c.y, 3, spr.cyan, 60);
      power = solved(P);
      P.hints = P.hints.filter(function (h) { return P.cur[h] !== P.sol[h]; });
      if (power.ok) circuitClosed();
    }

    function tileCenter(i) {
      return { x: lay.gx + (i % P.cols + 0.5) * lay.tile, y: lay.gy + (((i / P.cols) | 0) + 0.5) * lay.tile };
    }

    function circuitClosed() {
      state = 'surge';
      stateT = 0;
      // Stromstoß: entlang der leuchtenden Kabel zur Klemme, dann das Kabel hoch zum Schild
      var pts = [[lay.gx - lay.side * 0.55, lay.gy + (P.s + 0.5) * lay.tile]];
      var path = shortestOnPath();
      path.forEach(function (i) { var c = tileCenter(i); pts.push([c.x, c.y]); });
      var tx = lay.gx + P.cols * lay.tile + lay.side * 0.55, ty = lay.gy + (P.t + 0.5) * lay.tile;
      pts.push([tx, ty]);
      var cableX = W - 22;
      pts.push([cableX, ty], [cableX, lay.frameB + 10]);
      var grp = groups[round];
      var lx = 0;
      grp.forEach(function (gi) { lx += glyphs[gi].x + glyphs[gi].w / 2; });
      lx /= Math.max(1, grp.length);
      pts.push([lx, lay.frameB + 10], [lx, lay.cy]);
      var len = 0, seg = [];
      for (var k = 1; k < pts.length; k++) {
        var d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        seg.push(d);
        len += d;
      }
      anim = { pts: pts, seg: seg, len: len, dur: reduceMotion ? 0.4 : 1.15 };
      live.textContent = 'Stromkreis geschlossen';
      sparks(tx, ty, 18, spr.cyan, 220);
    }

    // Kürzester Weg durch die aktuell verbundenen Kacheln (für den Stromstoß)
    function shortestOnPath() {
      var cols = P.cols, rows = P.rows, src = P.s * cols, dst = P.t * cols + cols - 1;
      var prev = {}, q = [src], seen = {};
      seen[src] = true;
      while (q.length) {
        var c = q.shift();
        if (c === dst) break;
        var x = c % cols, y = (c / cols) | 0;
        for (var d = 0; d < 4; d++) {
          if (!(P.cur[c] & DIRS[d][0])) continue;
          var nx = x + DIRS[d][1], ny = y + DIRS[d][2];
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          var nc = ny * cols + nx;
          if (!seen[nc] && (P.cur[nc] & DIRS[d][3])) { seen[nc] = true; prev[nc] = c; q.push(nc); }
        }
      }
      var out = [];
      for (var p = dst; p !== undefined; p = prev[p]) { out.unshift(p); if (p === src) break; }
      return out;
    }

    function animPos(t) {
      var d = t * anim.len;
      for (var k = 0; k < anim.seg.length; k++) {
        if (d <= anim.seg[k] || k === anim.seg.length - 1) {
          var f = anim.seg[k] ? clamp(d / anim.seg[k], 0, 1) : 1;
          var a = anim.pts[k], b = anim.pts[k + 1];
          return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
        }
        d -= anim.seg[k];
      }
      return { x: anim.pts[0][0], y: anim.pts[0][1] };
    }

    function ignite() {
      var grp = groups[round];
      grp.forEach(function (gi, k) { glyphs[gi].at = time + k * 0.16; glyphs[gi].on = true; });
      grp.forEach(function (gi) {
        sparks(glyphs[gi].x + glyphs[gi].w / 2, lay.cy, reduceMotion ? 6 : 22, spr.cyan, 260);
      });
      lurch.mode = 'awake';
      lurch.hop = 1;
      lurch.wake = time;
      live.textContent = 'Buchstabe leuchtet: ' + grp.map(function (gi) { return glyphs[gi].ch; }).join('');
      round++;
      if (round >= groups.length) startFinale();
      else { state = 'next'; stateT = 0; }
    }

    function startFinale() {
      state = 'finale';
      stateT = 0;
      finaleT = 0;
      hud.classList.add('is-hidden');
      lurch.mode = 'party';
    }

    // ── Partikel ──
    function sparks(x, y, n, sp, force) {
      if (reduceMotion) n = Math.ceil(n / 3);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, f = force * (0.3 + Math.random() * 0.7);
        particles.push({ x: x, y: y, vx: Math.cos(a) * f, vy: Math.sin(a) * f - force * 0.3, life: rnd(0.3, 0.8), max: 0.8, sp: sp, size: rnd(2, 5) * S + 1, g: 700 });
      }
    }

    // ── Update ──
    function update(dt) {
      time += dt;
      stateT += dt;

      // Drehanimation der Kacheln
      if (P) {
        for (var i = 0; i < P.ang.length; i++) {
          var d = P.tgt[i] - P.ang[i];
          if (d) P.ang[i] = Math.abs(d) < 0.01 ? P.tgt[i] : P.ang[i] + d * Math.min(1, dt * (reduceMotion ? 60 : 18));
        }
      }

      if (state === 'play' && time > P.hintAt) {
        // Tipp: eine falsch gedrehte Kachel auf dem Lösungsweg pulsiert
        var wrong = P.path.filter(function (c) { return P.cur[c] !== P.sol[c] && P.hints.indexOf(c) < 0; });
        if (wrong.length) P.hints.push(wrong[0]);
        P.hintAt = time + 15;
      }

      if (state === 'surge' && anim && stateT >= anim.dur) {
        anim = null;
        ignite();
      }
      if (state === 'next' && stateT > (reduceMotion ? 0.4 : 1.0)) newRound();

      if (state === 'finale') {
        finaleT += dt;
        if (cfg.circle) ringP = clamp((finaleT - 0.5) / 1.3, 0, 1);
        if (sub && subOn < 0 && finaleT > (cfg.circle ? 1.9 : 0.7)) {
          subOn = time;
          sparks(W / 2, lay.subY, 30, spr.yel, 240);
        }
        var showAt = (cfg.circle ? 2.4 : 1.2) + (sub ? 0.5 : 0);
        if (finaleT > showAt && !cardShown) {
          showCard({ label: cfg.label, title: 'Es leuchtet', titleClass: 'is-ok', text: cfg.winText });
          for (var k = 0; k < 3; k++) sparks(rnd(W * 0.2, W * 0.8), rnd(lay.signTop, lay.signBot), 26, [spr.cyan, spr.mag, spr.yel][k], 280);
        }
        if (finaleT > showAt + 2.2 && !winSent) {
          winSent = true;
          safeCall(onWin);
        }
      }

      // Lurch
      lurch.hop = Math.max(0, lurch.hop - dt * 2.2);
      if (lurch.mode === 'party' && !reduceMotion && lurch.hop <= 0) lurch.hop = 1;
      lurch.nextBlink -= dt;
      if (lurch.nextBlink <= 0) { lurch.blink = 0.14; lurch.nextBlink = rnd(2, 4.5); }
      lurch.blink = Math.max(0, lurch.blink - dt);
      if (lurch.mode === 'sleep' && Math.random() < dt * 0.9) zs.push({ t: 0, x: rnd(-4, 4) });
      zs = zs.filter(function (z) { z.t += dt; return z.t < 2.2 && lurch.mode === 'sleep'; });

      // Gelegentliches Flackern leuchtender Buchstaben (wie echte Neonröhren)
      glyphs.forEach(function (gl) {
        if (gl.on && gl.at >= 0 && time - gl.at > 1 && !reduceMotion) {
          gl.glitch -= dt;
          if (gl.glitch < -0.3) gl.glitch = rnd(5, 11);
        }
      });

      // Regen
      if (cfg.rain && !reduceMotion) {
        while (drops.length < 70) drops.push({ x: rnd(-40, W), y: rnd(-H, 0), v: rnd(700, 1100) * S + 300, l: rnd(10, 22) * S + 6, a: rnd(0.08, 0.22) });
        drops.forEach(function (r) {
          r.y += r.v * dt;
          r.x += r.v * 0.12 * dt;
          if (r.y > H) { r.y = rnd(-80, -10); r.x = rnd(-40, W); }
        });
      }

      var dr = Math.exp(-dt * 2);
      particles = particles.filter(function (p) {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += p.g * dt;
        p.vx *= dr;
        return true;
      });
    }

    // Helligkeit eines Buchstabens: Zündflackern, danach ruhig mit leichtem Summen
    var FLICK = [[0.05, 1], [0.07, 0], [0.04, 1], [0.12, 0], [0.05, 1], [0.05, 0.2], [0.08, 1], [0.04, 0.4]];
    function glyphAlpha(gl) {
      if (!gl.on || gl.at < 0) return 0;
      var t = time - gl.at;
      if (t < 0) return 0;
      if (reduceMotion) return 1;
      var acc = 0;
      for (var i = 0; i < FLICK.length; i++) {
        acc += FLICK[i][0];
        if (t < acc) return FLICK[i][1];
      }
      if (gl.glitch < 0) return (Math.sin(time * 70) > 0 ? 0.25 : 1);
      return 0.92 + 0.08 * Math.sin(time * 120 + gl.x);
    }

    // ── Zeichnen ──
    function glowStroke(col, lw, a) {
      ctx.strokeStyle = 'rgba(' + col + ',' + (0.16 * a) + ')';
      ctx.lineWidth = lw * 4.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + col + ',' + (0.42 * a) + ')';
      ctx.lineWidth = lw * 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * a) + ')';
      ctx.lineWidth = Math.max(0.8, lw * 0.6);
      ctx.stroke();
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawSign() {
      var lit = 0, i;
      glyphs.forEach(function (gl) { lit += glyphAlpha(gl); });
      // Licht fällt auf die Wand
      ctx.globalCompositeOperation = 'lighter';
      glyphs.forEach(function (gl) {
        var a = glyphAlpha(gl);
        if (a <= 0) return;
        var r = lay.fs * 2.2;
        ctx.globalAlpha = 0.28 * a;
        ctx.drawImage(spr.cyan, gl.x + gl.w / 2 - r, lay.cy - r, r * 2, r * 2);
      });
      if (ringP > 0) {
        ctx.globalAlpha = 0.35 * ringP;
        var er = lay.er * 1.7;
        ctx.drawImage(spr.mag, lay.cx - er, lay.cy - er, er * 2, er * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // Halterungen und Rahmen
      ctx.strokeStyle = 'rgba(150,170,190,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lay.frameL + 18, 0); ctx.lineTo(lay.frameL + 18, lay.frameT);
      ctx.moveTo(lay.frameL + lay.frameW - 18, 0); ctx.lineTo(lay.frameL + lay.frameW - 18, lay.frameT);
      ctx.stroke();
      roundRect(lay.frameL, lay.frameT, lay.frameW, lay.frameB - lay.frameT, 12);
      ctx.fillStyle = 'rgba(8,10,18,0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,180,200,' + (0.18 + 0.1 * Math.min(1, lit)) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Schrauben
      ctx.fillStyle = 'rgba(170,190,210,0.35)';
      [[lay.frameL + 8, lay.frameT + 8], [lay.frameL + lay.frameW - 8, lay.frameT + 8], [lay.frameL + 8, lay.frameB - 8], [lay.frameL + lay.frameW - 8, lay.frameB - 8]].forEach(function (s) {
        ctx.beginPath(); ctx.arc(s[0], s[1], 2.2, 0, Math.PI * 2); ctx.fill();
      });

      // Pinselkreis malt sich wie ein Pinselstrich
      if (ring && ringP > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(lay.cx, lay.cy);
        ctx.arc(lay.cx, lay.cy, ring.size, ring.a0 - 0.15, ring.a0 + (ring.sweep + 0.3) * easeOut(ringP));
        ctx.closePath();
        ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(ring.c, lay.cx - ring.size / 2, lay.cy - ring.size / 2, ring.size, ring.size);
        ctx.restore();
        // Pinselspitze
        if (ringP < 1) {
          var ang = ring.a0 + ring.sweep * easeOut(ringP);
          var px = lay.cx + Math.cos(ang) * lay.er, py = lay.cy + Math.sin(ang) * lay.er, s = 26 * S + 8;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(spr.white, px - s, py - s, s * 2, s * 2);
          ctx.globalCompositeOperation = 'source-over';
          if (Math.random() < 0.6) sparks(px, py, 1, spr.mag, 80);
        }
      }

      // Buchstaben-Röhren
      for (i = 0; i < glyphs.length; i++) {
        var gl = glyphs[i];
        if (gl.space) continue;
        // Überraschung: Buchstaben sind erst nach dem Zünden sichtbar
        if (!gl.on || gl.at < 0 || time < gl.at) continue;
        var dx = gl.x - gl.unlit.pad, dy = lay.cy - gl.unlit.h / 2;
        ctx.drawImage(gl.unlit.c, dx, dy, gl.unlit.w, gl.unlit.h);
        var a = glyphAlpha(gl);
        if (a > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = a;
          ctx.drawImage(gl.lit.c, dx, dy, gl.lit.w, gl.lit.h);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // Untertitel
      if (sub) {
        var so = sub.off;
        if (subOn >= 0) {
          ctx.drawImage(so.c, W / 2 - so.w / 2, lay.subY - so.h / 2, so.w, so.h);
          var t = time - subOn, sa = reduceMotion ? 1 : (t < 0.5 ? (Math.sin(t * 60) > 0 ? 1 : 0.15) : 0.95 + 0.05 * Math.sin(time * 90));
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = sa;
          ctx.drawImage(sub.on.c, W / 2 - so.w / 2, lay.subY - so.h / 2, so.w, so.h);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }

    // Der Lurch sitzt oben auf dem Schild (Seitenansicht)
    function drawLurch() {
      var k = 1.15 * S + 0.25;
      var hop = lurch.mode === 'party' ? Math.sin(lurch.hop * Math.PI) * 26 * k : Math.sin(lurch.hop * Math.PI) * 10 * k;
      var bx = lay.frameL + lay.frameW - 46 * k, by = lay.frameT - 13 * k - hop;
      var breathe = lurch.mode === 'sleep' ? 1 + Math.sin(time * 2) * 0.04 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Schwanz hängt über die Kante und schwingt
      var sway = Math.sin(time * (lurch.mode === 'party' ? 8 : 1.6)) * 8 * k;
      ctx.beginPath();
      ctx.moveTo(22 * k, 2 * k);
      ctx.bezierCurveTo(40 * k, 6 * k, 42 * k + sway * 0.3, 26 * k + hop, 34 * k + sway, 42 * k + hop);
      ctx.strokeStyle = '#041a22';
      ctx.lineWidth = 9 * k;
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(CYAN, 1.2, 0.8);
      ctx.drawImage(spr.cyan, 34 * k + sway - 7 * k, 42 * k + hop - 7 * k, 14 * k, 14 * k);
      ctx.globalCompositeOperation = 'source-over';
      // Beinchen
      ctx.strokeStyle = '#41dcff';
      ctx.lineWidth = 3 * k;
      [[-14, 1], [-4, 1], [8, 1], [16, 1]].forEach(function (l, i) {
        var lift = lurch.mode === 'party' && hop > 2 ? -4 * k : 0;
        ctx.beginPath();
        ctx.moveTo(l[0] * k, 8 * k);
        ctx.lineTo((l[0] + (i % 2 ? 3 : -3)) * k, 14 * k + lift);
        ctx.stroke();
      });
      // Körper
      ctx.save();
      ctx.scale(1, breathe);
      ctx.beginPath();
      ctx.ellipse(0, 0, 26 * k, 12 * k, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#041a22';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(CYAN, 1.3, 1);
      ctx.restore();
      // Leuchtflecken
      [[-10, -4], [2, -6], [13, -3], [-2, 3]].forEach(function (s, i) {
        var r = (3.2 + (i % 2)) * k;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(spr.yel, s[0] * k - r * 2, s[1] * k - r * 2, r * 4, r * 4);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // Kopf
      var hx = -28 * k, hy = -6 * k;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 14 * k, 11 * k, -0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#041a22';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(CYAN, 1.3, 1);
      ctx.globalCompositeOperation = 'source-over';
      // Augen
      var sleeping = lurch.mode === 'sleep';
      var lookX = -1.5 * k, lookY = lurch.mode === 'party' ? 1.5 * k : 0;
      [[-34, -15], [-23, -16]].forEach(function (e) {
        var ex = e[0] * k, ey = e[1] * k, r = 6 * k;
        if (sleeping || lurch.blink > 0) {
          ctx.strokeStyle = '#eafcff';
          ctx.lineWidth = 2 * k;
          ctx.beginPath();
          ctx.arc(ex, ey + 1 * k, r * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
          return;
        }
        ctx.fillStyle = '#eafcff';
        ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#40dcff'; ctx.lineWidth = 1.2 * k; ctx.stroke();
        ctx.fillStyle = '#04121a';
        ctx.beginPath(); ctx.arc(ex + lookX, ey + lookY, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + lookX - r * 0.18, ey + lookY - r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill();
      });
      // Mund + Bäckchen
      ctx.strokeStyle = '#eafcff';
      ctx.lineWidth = 1.6 * k;
      ctx.beginPath();
      if (lurch.mode === 'party') ctx.arc(-33 * k, -3 * k, 5 * k, 0.15 * Math.PI, 0.85 * Math.PI);
      else { ctx.moveTo(-38 * k, -1 * k); ctx.quadraticCurveTo(-33 * k, 1 * k, -29 * k, -1 * k); }
      ctx.stroke();
      if (lurch.mode !== 'sleep') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.8;
        ctx.drawImage(spr.mag, -26 * k - 5 * k, -4 * k - 5 * k, 10 * k, 10 * k);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      // Zzz
      ctx.font = '700 ' + Math.round(11 * k) + 'px "Space Grotesk", sans-serif';
      zs.forEach(function (z) {
        ctx.fillStyle = 'rgba(64,220,255,' + (1 - z.t / 2.2) * 0.8 + ')';
        ctx.fillText('z', -36 * k + z.x + z.t * 10 * k, -24 * k - z.t * 22 * k);
      });
      ctx.restore();
    }

    function drawCable() {
      // Stromkabel von der Klemme die Wand hoch zum Schild (im Finale weg, der Kasten ist dann ausgeblendet)
      if (!P || state === 'finale') return;
      var cableX = W - 22, ty = lay.gy + (P.t + 0.5) * lay.tile, tx = lay.gx + P.cols * lay.tile + lay.side * 0.55;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(cableX, ty);
      ctx.lineTo(cableX, lay.frameB + 10);
      ctx.lineTo(lay.frameL + lay.frameW - 30, lay.frameB + 10);
      ctx.lineTo(lay.frameL + lay.frameW - 30, lay.frameB);
      ctx.strokeStyle = '#0b1820';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(64,220,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    function drawBox() {
      var x = lay.boxX, y = lay.boxTop, w = lay.boxW, h = lay.boxBot - lay.boxTop;
      var fade = state === 'finale' ? clamp(1 - finaleT * 1.5, 0, 1) : 1;
      if (fade <= 0) return;
      ctx.globalAlpha = fade;
      roundRect(x, y, w, h, 18);
      var gr = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
      gr.addColorStop(0, 'rgba(64,220,255,0.08)');
      gr.addColorStop(1, 'rgba(64,220,255,0.02)');
      ctx.fillStyle = 'rgba(9,13,22,0.88)';
      ctx.fill();
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = 'rgba(64,220,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Warnstreifen oben
      ctx.save();
      roundRect(x, y, w, 6, 3);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,211,107,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (var sx = x - 10; sx < x + w + 10; sx += 12) { ctx.moveTo(sx, y + 8); ctx.lineTo(sx + 8, y - 2); }
      ctx.stroke();
      ctx.restore();
      if (P) drawBoard();
      ctx.globalAlpha = 1;
    }

    function drawBoard() {
      var T = lay.tile, i, born = clamp((time - P.born) / 0.5, 0, 1);
      var pow = power ? power.on : [];
      var surge = state === 'surge' || state === 'next';
      // Stecker links und Klemme rechts
      var sy = lay.gy + (P.s + 0.5) * T, ty = lay.gy + (P.t + 0.5) * T;
      var sx = lay.gx - lay.side * 0.55, tx = lay.gx + P.cols * T + lay.side * 0.55;
      drawPlug(sx, sy, true);
      drawTerminal(tx, ty, power && power.ok);
      for (i = 0; i < P.cols * P.rows; i++) {
        var cx = lay.gx + (i % P.cols + 0.5) * T, cy = lay.gy + (((i / P.cols) | 0) + 0.5) * T;
        var appear = reduceMotion ? 1 : easeOut(clamp(born * 1.6 - ((i % P.cols) + ((i / P.cols) | 0)) * 0.06, 0, 1));
        if (appear <= 0) continue;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(appear, appear);
        // Kachel
        roundRect(-T / 2 + 3, -T / 2 + 3, T - 6, T - 6, 10);
        ctx.fillStyle = pow[i] ? 'rgba(64,220,255,0.07)' : 'rgba(255,255,255,0.025)';
        ctx.fill();
        var hinted = P.hints.indexOf(i) >= 0;
        ctx.strokeStyle = hinted ? 'rgba(255,211,107,' + (0.5 + 0.4 * Math.sin(time * 6)) + ')' : 'rgba(64,220,255,0.14)';
        ctx.lineWidth = hinted ? 2.5 : 1;
        ctx.stroke();
        ctx.rotate(P.ang[i] - P.tgt[i]);
        drawPiece(P.cur[i], T, !!pow[i], surge && !!pow[i]);
        ctx.restore();
      }
      // Stromstoß-Licht
      if (anim) {
        var tt = clamp(stateT / anim.dur, 0, 1), p = animPos(tt);
        ctx.globalCompositeOperation = 'lighter';
        var s = 30 * S + 10;
        ctx.drawImage(spr.white, p.x - s, p.y - s, s * 2, s * 2);
        ctx.drawImage(spr.cyan, p.x - s * 1.8, p.y - s * 1.8, s * 3.6, s * 3.6);
        if (!reduceMotion && Math.random() < 0.8) sparks(p.x, p.y, 1, spr.cyan, 90);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function drawPiece(m, T, on, surge) {
      var L = T / 2 - 3, i;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (i = 0; i < 4; i++) {
        if (!(m & DIRS[i][0])) continue;
        ctx.moveTo(0, 0);
        ctx.lineTo(DIRS[i][1] * L, DIRS[i][2] * L);
      }
      ctx.strokeStyle = '#0a2531';
      ctx.lineWidth = T * 0.24;
      ctx.stroke();
      if (on) {
        ctx.globalCompositeOperation = 'lighter';
        glowStroke(CYAN, T * 0.05 * (surge ? 1.4 : 1), 1);
        // fließender Strom
        if (!reduceMotion) {
          ctx.setLineDash([T * 0.08, T * 0.16]);
          ctx.lineDashOffset = -time * T * 0.9;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = T * 0.03;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.strokeStyle = 'rgba(140,170,190,0.45)';
        ctx.lineWidth = T * 0.06;
        ctx.stroke();
      }
      // Knoten in der Mitte; Endstück als Lämpchen
      var n = bits(m);
      ctx.beginPath();
      ctx.arc(0, 0, T * (n === 1 ? 0.13 : 0.1), 0, Math.PI * 2);
      ctx.fillStyle = on ? '#dffaff' : '#16303c';
      ctx.fill();
      if (on && n === 1) {
        ctx.globalCompositeOperation = 'lighter';
        var s = T * 0.5;
        ctx.drawImage(spr.cyan, -s, -s, s * 2, s * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function drawPlug(x, y) {
      var s = lay.side * 0.42;
      roundRect(x - s, y - s, s * 2, s * 2, 6);
      ctx.fillStyle = '#0b2330';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(CYAN, 1.2, 0.9);
      // Blitz
      ctx.beginPath();
      ctx.moveTo(x + s * 0.1, y - s * 0.6);
      ctx.lineTo(x - s * 0.35, y + s * 0.1);
      ctx.lineTo(x + s * 0.05, y + s * 0.1);
      ctx.lineTo(x - s * 0.1, y + s * 0.6);
      ctx.lineTo(x + s * 0.4, y - s * 0.12);
      ctx.lineTo(x, y - s * 0.12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,211,107,' + (0.75 + 0.25 * Math.sin(time * 8)) + ')';
      ctx.fill();
      var gs = s * 2.6;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(spr.yel, x - gs, y - gs, gs * 2, gs * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(x + s, y);
      ctx.lineTo(lay.gx + 2, y);
      ctx.strokeStyle = '#0a2531';
      ctx.lineWidth = lay.tile * 0.24;
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(CYAN, lay.tile * 0.05, 1);
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawTerminal(x, y, on) {
      var s = lay.side * 0.42;
      ctx.beginPath();
      ctx.moveTo(lay.gx + P.cols * lay.tile - 2, y);
      ctx.lineTo(x - s, y);
      ctx.strokeStyle = '#0a2531';
      ctx.lineWidth = lay.tile * 0.24;
      ctx.stroke();
      if (on) { ctx.globalCompositeOperation = 'lighter'; glowStroke(CYAN, lay.tile * 0.05, 1); ctx.globalCompositeOperation = 'source-over'; }
      roundRect(x - s, y - s, s * 2, s * 2, 6);
      ctx.fillStyle = on ? 'rgba(64,220,255,0.35)' : '#0b2330';
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glowStroke(on ? CYAN : '120,140,160', 1.2, on ? 1 : 0.5);
      ctx.globalCompositeOperation = 'source-over';
      // Buchstaben dieser Runde auf der Klemme
      var txt = '?'; // die nächsten Buchstaben bleiben eine Überraschung
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? '#ffffff' : 'rgba(234,246,251,0.55)';
      ctx.font = '700 ' + Math.round(Math.max(11, s * 1.05)) + 'px "Space Grotesk", sans-serif';
      ctx.fillText(txt, x, y + 1);
    }

    function drawRain() {
      if (!cfg.rain || reduceMotion) return;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(180,210,255,0.16)';
      ctx.beginPath();
      drops.forEach(function (r) {
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - r.l * 0.12, r.y - r.l);
      });
      ctx.stroke();
    }

    function drawParticles() {
      ctx.globalCompositeOperation = 'lighter';
      particles.forEach(function (p) {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.drawImage(p.sp, p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Im Finale fährt die Kamera auf das Schild zu (groß in der Bildmitte)
    function zoomTransform() {
      if (state !== 'finale') return null;
      var f = reduceMotion ? 1 : easeOut(clamp(finaleT / 1.2, 0, 1));
      var sh = lay.frameB - lay.frameT + 70 * S;
      var z = Math.min(1.45, (W - 20) / lay.frameW, (H * 0.6) / sh);
      z = Math.max(1, z);
      var scy = (lay.frameT + lay.frameB) / 2;
      var ty = H * 0.36;
      return { s: 1 + (z - 1) * f, cx: W / 2, cy: scy, dy: (ty - scy) * f };
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (wall) ctx.drawImage(wall, 0, 0, W, H);
      var zt = zoomTransform();
      if (zt) {
        ctx.translate(zt.cx, zt.cy + zt.dy);
        ctx.scale(zt.s, zt.s);
        ctx.translate(-zt.cx, -zt.cy);
      }
      drawCable();
      drawSign();
      drawLurch();
      if (zt) drawParticles();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRain();
      drawBox();
      if (!zt) drawParticles();
    }

    // ── Schleife ──
    function frame(t) {
      raf = 0;
      if (destroyed || hidden) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }
    function startLoop() {
      if (!raf && !destroyed && !hidden) { last = 0; raf = requestAnimationFrame(frame); }
    }
    function onVisibility() {
      if (document.hidden) {
        hidden = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else {
        hidden = false;
        startLoop();
      }
    }

    // ── Eingabe ──
    function onDown(e) {
      if (state !== 'play' || cardShown) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var r = canvas.getBoundingClientRect();
      downTile = tileAt(e.clientX - r.left, e.clientY - r.top);
      downId = e.pointerId;
    }
    function onUp(e) {
      if (e.pointerId !== downId) return;
      var r = canvas.getBoundingClientRect();
      var t = tileAt(e.clientX - r.left, e.clientY - r.top);
      if (t >= 0 && t === downTile) rotateTile(t);
      downTile = -1;
      downId = null;
    }
    function onCancel() { downTile = -1; downId = null; }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    card.addEventListener('click', onCardClick);
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof ResizeObserver === 'function') {
      resizeObs = new ResizeObserver(function () { if (!destroyed) resize(); });
      resizeObs.observe(root);
    }
    // Schrift erst nach dem Laden in die Röhren rendern
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (!destroyed) { buildSign(); render(); } }, function () {});
    }

    resize();
    showCard({
      label: cfg.label,
      title: cfg.title,
      text: cfg.intro,
      meta: groups.length + (groups.length === 1 ? ' Stromkreis' : ' Stromkreise'),
      rows: [
        ['rotate', 'Tippe ein Kabelstück an, um es zu drehen'],
        ['plug', 'Verbinde den Stecker links mit der Klemme rechts'],
        ['sign', 'Jeder Stromkreis bringt Buchstaben zum Leuchten']
      ],
      button: cfg.startText,
      action: startGame
    });
    hidden = !!document.hidden;
    startLoop();

    return {
      // Nur lesend bzw. ohne Seiteneffekt, für automatisierte Tests (Testseite)
      _snapshot: function () {
        return {
          state: state, round: round, rounds: groups.length, taps: taps,
          lit: glyphs.filter(function (g2) { return g2.on; }).map(function (g2) { return g2.ch; }).join(''),
          cols: P ? P.cols : 0, rows: P ? P.rows : 0, hints: P ? P.hints.length : 0
        };
      },
      // Klickpunkte, mit denen sich die aktuelle Runde lösen lässt (für Tests)
      _solutionTaps: function () {
        if (!P) return [];
        var out = [];
        P.path.forEach(function (c) {
          var m = P.cur[c], k = 0;
          while (m !== P.sol[c] && k < 4) { m = rotCW(m); k++; }
          var cc = tileCenter(c);
          for (var j = 0; j < k; j++) out.push({ x: cc.x, y: cc.y });
        });
        return out;
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (resizeObs) resizeObs.disconnect();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onCancel);
        card.removeEventListener('click', onCardClick);
        document.removeEventListener('visibilitychange', onVisibility);
        if (root.parentNode) root.parentNode.removeChild(root);
        particles = []; drops = []; glyphs = [];
        canvas.width = canvas.height = 0;
        removeStyle();
      }
    };
  }

  window.SchnitzelGames = window.SchnitzelGames || {};
  window.SchnitzelGames[NAME] = {
    title: 'Leuchtreklame',
    mount: mount
  };
})();
