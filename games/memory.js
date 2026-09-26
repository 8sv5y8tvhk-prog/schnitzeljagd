/* Schnitzeljagd-Minispiel „Memory"
 * Paare aufdecken. Registriert sich als window.SchnitzelGames.memory.
 * Vertrag: siehe games/README.md
 */
(function () {
  'use strict';

  var NAME = 'memory';
  var MIN_PAIRS = 2;
  var MAX_PAIRS = 10;

  var DEFAULTS = {
    pairs: ['Kompass', 'Karte', 'Schatz', 'Route', 'Rätsel', 'Laterne'],
    columns: 0,
    title: 'Memory',
    label: 'Minispiel',
    intro: 'Tippe zwei Karten an. Findest du alle Paare, die zusammengehören?',
    successText: 'Alle Paare gefunden',
    previewMs: 0,
    flipBackMs: 1200
  };

  var CSS = [
    '.sg-memory{width:100%;height:100%;display:flex;flex-direction:column;gap:14px;padding:16px 16px 18px;box-sizing:border-box;',
    'font-family:"Space Grotesk",-apple-system,sans-serif;color:var(--text,#eaf6fb);background:var(--bg,#0a0e14);overflow:hidden;',
    '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '.sg-memory *{box-sizing:border-box;margin:0;padding:0}',
    '.sg-memory__head{flex:0 0 auto}',
    '.sg-memory__label{font-size:11px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan,#40dcff)}',
    '.sg-memory__title{font-size:26px;font-weight:700;letter-spacing:-.02em;text-transform:uppercase;line-height:1.1;margin-top:6px}',
    '.sg-memory__intro{font-size:15px;line-height:1.45;color:rgba(234,246,251,.72);margin-top:6px}',
    '.sg-memory__status{flex:0 0 auto;display:flex;align-items:center;gap:12px;min-height:24px}',
    '.sg-memory__count{font-size:12px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan,#40dcff);white-space:nowrap}',
    '.sg-memory__bar{flex:1;display:flex;gap:4px}',
    '.sg-memory__seg{flex:1;height:4px;border-radius:99px;background:rgba(64,220,255,.14);transition:background .3s ease}',
    '.sg-memory__seg.is-on{background:var(--cyan,#40dcff)}',
    '.sg-memory__msg{font-size:15px;font-weight:700;color:var(--ok,#4ade80);display:none;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:-.01em}',
    '.sg-memory__msg svg{width:20px;height:20px;flex:0 0 auto}',
    '.sg-memory.is-won .sg-memory__msg{display:flex}',
    '.sg-memory.is-won .sg-memory__count,.sg-memory.is-won .sg-memory__bar{display:none}',
    '.sg-memory__board{flex:1 1 auto;min-height:0;display:grid;gap:10px;touch-action:manipulation}',
    '.sg-memory__card{position:relative;min-width:44px;min-height:44px;cursor:pointer;outline:none;-webkit-perspective:700px;perspective:700px;touch-action:manipulation}',
    '.sg-memory__inner{position:absolute;inset:0;-webkit-transform-style:preserve-3d;transform-style:preserve-3d;transition:transform .38s cubic-bezier(.2,.7,.2,1)}',
    '.sg-memory__card.is-open .sg-memory__inner{transform:rotateY(180deg)}',
    '.sg-memory__card:focus-visible .sg-memory__inner{outline:2px solid var(--cyan,#40dcff);outline-offset:3px;border-radius:14px}',
    '.sg-memory__face{position:absolute;inset:0;border-radius:14px;display:flex;align-items:center;justify-content:center;padding:6px;',
    '-webkit-backface-visibility:hidden;backface-visibility:hidden;overflow:hidden}',
    '.sg-memory__back{border:1px solid rgba(64,220,255,.3);background:linear-gradient(160deg,rgba(64,220,255,.08),rgba(64,220,255,.02));color:var(--cyan,#40dcff)}',
    '.sg-memory__back svg{width:42%;max-width:44px;height:auto;opacity:.85}',
    '.sg-memory__card:active .sg-memory__back{border-color:rgba(64,220,255,.6)}',
    '.sg-memory__front{transform:rotateY(180deg);background:#fff;color:#10151c;border:3px solid #fff;transition:border-color .2s ease,opacity .3s ease}',
    '.sg-memory__text{display:block;width:100%;font-weight:700;line-height:1.12;text-align:center;letter-spacing:-.01em;-webkit-hyphens:manual;hyphens:manual}',
    '.sg-memory__board.is-tight .sg-memory__text{-webkit-hyphens:auto;hyphens:auto;overflow-wrap:break-word;word-wrap:break-word}',
    '.sg-memory__tick{position:absolute;top:5px;right:5px;width:18px;height:18px;color:var(--ok,#4ade80);display:none}',
    '.sg-memory__card.is-matched .sg-memory__front{border-color:var(--ok,#4ade80)}',
    '.sg-memory__card.is-matched .sg-memory__tick{display:block}',
    '.sg-memory__card.is-wrong .sg-memory__front{border-color:var(--err,#fb7185)}',
    '.sg-memory__card.is-wrong{animation:sg-memory-shake .36s ease}',
    '.sg-memory.is-won .sg-memory__card{animation:sg-memory-glow .9s ease both}',
    '.sg-memory.is-paused .sg-memory__card,.sg-memory.is-paused .sg-memory__inner{animation-play-state:paused}',
    '@keyframes sg-memory-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}',
    '@keyframes sg-memory-glow{0%{transform:scale(1);filter:drop-shadow(0 0 0 rgba(74,222,128,0))}',
    '40%{transform:scale(1.06);filter:drop-shadow(0 0 14px rgba(74,222,128,.7))}100%{transform:scale(1);filter:drop-shadow(0 0 0 rgba(74,222,128,0))}}',
    '@media (prefers-reduced-motion: reduce){',
    '.sg-memory__inner,.sg-memory__front,.sg-memory__seg{transition:none}',
    '.sg-memory__card.is-wrong,.sg-memory.is-won .sg-memory__card{animation:none}}'
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

  // Schlichte Linien-Icons (nur feste Pfade, keine Parameter)
  function svg(paths, viewBox) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', viewBox || '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < paths.length; i++) {
      var p = document.createElementNS(SVG_NS, paths[i][0]);
      for (var k in paths[i][1]) p.setAttribute(k, paths[i][1][k]);
      s.appendChild(p);
    }
    return s;
  }

  function routeIcon() {
    return svg([
      ['circle', { cx: '6', cy: '19', r: '2' }],
      ['path', { d: 'M8 18c5-1 1-7 6-8s4-3 3-5', 'stroke-dasharray': '2.5 3' }],
      ['circle', { cx: '18', cy: '5', r: '2.5' }]
    ]);
  }

  function checkIcon() {
    return svg([['path', { d: 'M5 12.5l4.5 4.5L19 7.5', 'stroke-width': '2.6' }]]);
  }

  function str(v, fallback) {
    return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
  }

  function num(v, fallback, min, max) {
    var n = Number(v);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  // Einträge: "Wort" → zwei gleiche Karten, ["Begriff", "Gegenstück"] → zwei zusammengehörige Karten
  function readPairs(raw) {
    var out = [];
    var seen = {};
    if (!Array.isArray(raw)) return null;
    for (var i = 0; i < raw.length && out.length < MAX_PAIRS; i++) {
      var e = raw[i], a, b;
      if (typeof e === 'string' || typeof e === 'number') {
        a = b = String(e).trim();
      } else if (Array.isArray(e) && e.length >= 2) {
        a = String(e[0] == null ? '' : e[0]).trim();
        b = String(e[1] == null ? '' : e[1]).trim();
      } else if (Array.isArray(e) && e.length === 1) {
        a = b = String(e[0] == null ? '' : e[0]).trim();
      } else {
        continue;
      }
      if (!a || !b) continue;
      var key = a.toLowerCase() + '\u0000' + b.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push([a, b]);
    }
    return out.length >= MIN_PAIRS ? out : null;
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  // Spaltenzahl so wählen, dass wenige Lücken bleiben und die Karten etwa hochkant sind
  // (need = nötige Kartenbreite für das längste Wort bei 15 px; zu schmale oder flache Karten werden bestraft)
  function autoColumns(total, w, h, need) {
    var best = 3, bestScore = Infinity;
    for (var c = 2; c <= 5; c++) {
      var rows = Math.ceil(total / c);
      if (rows > 7) continue;
      var empty = rows * c - total;
      var cw = (w - (c - 1) * 10) / c;
      var ch = (h - (rows - 1) * 10) / rows;
      var score = empty * 1.2 + Math.abs(Math.log((cw / ch) / 0.85)) +
        (cw < need ? 1.5 : 0) + (ch < 60 ? 3 : 0);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  function mount(container, options) {
    options = options || {};
    var params = (options.params && typeof options.params === 'object') ? options.params : {};
    var onWin = typeof options.onWin === 'function' ? options.onWin : function () {};
    var onFail = typeof options.onFail === 'function' ? options.onFail : function () {};

    var pairs = readPairs(params.pairs) || readPairs(DEFAULTS.pairs);
    var cfg = {
      title: str(params.title, DEFAULTS.title),
      label: str(params.label, DEFAULTS.label),
      intro: str(params.intro, DEFAULTS.intro),
      successText: str(params.successText, DEFAULTS.successText),
      columns: num(params.columns, 0, 0, 5),
      previewMs: num(params.previewMs, DEFAULTS.previewMs, 0, 10000),
      flipBackMs: num(params.flipBackMs, DEFAULTS.flipBackMs, 400, 4000)
    };
    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    addStyle();

    // ── DOM ──
    var root = el('div', 'sg-memory');
    root.setAttribute('lang', 'de');
    var head = el('div', 'sg-memory__head');
    head.appendChild(el('div', 'sg-memory__label', cfg.label));
    head.appendChild(el('h2', 'sg-memory__title', cfg.title));
    head.appendChild(el('p', 'sg-memory__intro', cfg.intro));
    root.appendChild(head);

    var status = el('div', 'sg-memory__status');
    status.setAttribute('aria-live', 'polite');
    var count = el('div', 'sg-memory__count');
    var bar = el('div', 'sg-memory__bar');
    var segs = [];
    for (var s = 0; s < pairs.length; s++) {
      var seg = el('span', 'sg-memory__seg');
      segs.push(seg);
      bar.appendChild(seg);
    }
    var msg = el('div', 'sg-memory__msg');
    msg.appendChild(checkIcon());
    msg.appendChild(el('span', null, cfg.successText));
    status.appendChild(count);
    status.appendChild(bar);
    status.appendChild(msg);
    root.appendChild(status);

    var board = el('div', 'sg-memory__board');
    root.appendChild(board);

    var words = [];
    pairs.forEach(function (p) { words = words.concat((p[0] + ' ' + p[1]).split(/\s+/)); });

    // Breite des längsten Wortes bei 15 px (Canvas-Messung, Schätzung als Rückfall)
    function neededWidth() {
      var max = 0, ctx = null;
      try { ctx = document.createElement('canvas').getContext('2d'); } catch (e) { ctx = null; }
      if (ctx) ctx.font = '700 15px "Space Grotesk", -apple-system, sans-serif';
      words.forEach(function (w) {
        max = Math.max(max, ctx ? ctx.measureText(w).width : w.length * 9);
      });
      return max + 18;
    }

    var cards = [];
    pairs.forEach(function (p, i) {
      cards.push({ pair: i, text: p[0] });
      cards.push({ pair: i, text: p[1] });
    });
    shuffle(cards);
    cards.forEach(function (c, i) {
      var n = el('div', 'sg-memory__card');
      n.setAttribute('role', 'button');
      n.setAttribute('tabindex', '0');
      n.setAttribute('data-index', String(i));
      n.setAttribute('aria-label', 'Karte ' + (i + 1) + ', verdeckt');
      var inner = el('div', 'sg-memory__inner');
      var back = el('div', 'sg-memory__face sg-memory__back');
      back.appendChild(routeIcon());
      var front = el('div', 'sg-memory__face sg-memory__front');
      var txt = el('span', 'sg-memory__text', c.text);
      var tick = checkIcon();
      tick.setAttribute('class', 'sg-memory__tick');
      front.appendChild(txt);
      front.appendChild(tick);
      inner.appendChild(back);
      inner.appendChild(front);
      n.appendChild(inner);
      board.appendChild(n);
      c.node = n;
      c.textNode = txt;
      c.open = false;
      c.matched = false;
    });

    container.appendChild(root);

    // ── Zustand ──
    var destroyed = false;
    var won = false;
    var winSent = false;
    var previewing = false;
    var found = 0;
    var openCards = [];
    var flipTimer = null;
    var downCard = null;
    var downId = null;
    var fitFrame = 0;
    var resizeObs = null;
    var timers = [];
    var paused = false;

    // Pausierbare Timer (bei App im Hintergrund angehalten)
    function schedule(fn, ms) {
      var t = { fn: fn, remaining: ms, start: 0, id: 0 };
      timers.push(t);
      if (!paused) run(t);
      return t;
    }
    function run(t) {
      t.start = Date.now();
      t.id = setTimeout(function () {
        cancel(t);
        if (!destroyed) t.fn();
      }, t.remaining);
    }
    function cancel(t) {
      if (!t) return;
      clearTimeout(t.id);
      var i = timers.indexOf(t);
      if (i >= 0) timers.splice(i, 1);
    }
    function onVisibility() {
      if (document.hidden && !paused) {
        paused = true;
        root.classList.add('is-paused');
        timers.forEach(function (t) {
          clearTimeout(t.id);
          t.remaining = Math.max(0, t.remaining - (Date.now() - t.start));
        });
      } else if (!document.hidden && paused) {
        paused = false;
        root.classList.remove('is-paused');
        timers.slice().forEach(run);
      }
    }

    // ── Layout ──
    function layout() {
      var w = board.clientWidth || 360;
      var h = board.clientHeight || 520;
      var cols = cfg.columns >= 2 ? cfg.columns : autoColumns(cards.length, w, h, neededWidth());
      var rows = Math.ceil(cards.length / cols);
      board.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
      board.style.gridTemplateRows = 'repeat(' + rows + ', minmax(0, 1fr))';
      fitText();
    }

    // Einheitliche Schriftgröße für alle Karten, so groß wie möglich (mind. 15 px).
    // Wörter werden nur getrennt, wenn sie selbst bei 15 px nicht in eine Zeile passen.
    function fitText() {
      if (!cards.length) return;
      var face = cards[0].node;
      var fw = face.clientWidth - 18;
      var fh = face.clientHeight - 18;
      if (fw <= 0 || fh <= 0) return;
      var size = Math.max(15, Math.min(26, Math.floor(Math.min(fw / 4.2, fh / 2.6))));
      function fits(sz) {
        for (var i = 0; i < cards.length; i++) {
          var t = cards[i].textNode;
          t.style.fontSize = sz + 'px';
          if (t.scrollWidth > fw + 1 || t.scrollHeight > fh + 1) return false;
        }
        return true;
      }
      board.classList.remove('is-tight');
      while (size > 15 && !fits(size)) size--;
      if (!fits(size)) board.classList.add('is-tight');
      cards.forEach(function (c) { c.textNode.style.fontSize = size + 'px'; });
    }

    function requestLayout() {
      if (fitFrame || destroyed) return;
      fitFrame = requestAnimationFrame(function () {
        fitFrame = 0;
        if (!destroyed) layout();
      });
    }

    // ── Spiellogik ──
    function updateStatus() {
      count.textContent = 'Paare ' + found + ' / ' + pairs.length;
      segs.forEach(function (sg, i) { sg.classList.toggle('is-on', i < found); });
    }

    function setOpen(c, open) {
      c.open = open;
      c.node.classList.toggle('is-open', open);
      c.node.setAttribute('aria-label', 'Karte ' + (cards.indexOf(c) + 1) + ', ' +
        (open ? c.text + (c.matched ? ', gefunden' : '') : 'verdeckt'));
    }

    function closeMismatch() {
      cancel(flipTimer);
      flipTimer = null;
      openCards.forEach(function (c) {
        c.node.classList.remove('is-wrong');
        setOpen(c, false);
      });
      openCards = [];
    }

    function safeCall(fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    }

    function activate(c) {
      if (destroyed || won || previewing || !c || c.matched) return;
      if (openCards.length === 2) closeMismatch(); // nicht warten müssen
      if (c.open) return;
      setOpen(c, true);
      openCards.push(c);
      if (openCards.length < 2) return;

      var a = openCards[0], b = openCards[1];
      if (a.pair === b.pair) {
        a.matched = b.matched = true;
        setOpen(a, true);
        setOpen(b, true);
        a.node.classList.add('is-matched');
        b.node.classList.add('is-matched');
        openCards = [];
        found++;
        updateStatus();
        if (found === pairs.length) win();
      } else {
        a.node.classList.add('is-wrong');
        b.node.classList.add('is-wrong');
        flipTimer = schedule(closeMismatch, cfg.flipBackMs);
        safeCall(onFail);
      }
    }

    function win() {
      won = true;
      cards.forEach(function (c, i) {
        c.node.style.animationDelay = (reduceMotion ? 0 : i * 45) + 'ms';
        c.node.removeAttribute('tabindex');
      });
      root.classList.add('is-won');
      schedule(function () {
        if (winSent) return;
        winSent = true;
        safeCall(onWin);
      }, reduceMotion ? 500 : 1100 + cards.length * 45);
    }

    function cardFromEvent(e) {
      var n = e.target && e.target.closest ? e.target.closest('.sg-memory__card') : null;
      if (!n || !board.contains(n)) return null;
      return cards[Number(n.getAttribute('data-index'))] || null;
    }

    function onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      downCard = cardFromEvent(e);
      downId = e.pointerId;
    }
    function onPointerUp(e) {
      var c = cardFromEvent(e);
      if (c && c === downCard && e.pointerId === downId) activate(c);
      downCard = null;
    }
    function onPointerCancel() { downCard = null; }
    function onKeyDown(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var c = cardFromEvent(e);
      if (!c) return;
      e.preventDefault();
      activate(c);
    }

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerCancel);
    root.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);

    if (typeof ResizeObserver === 'function') {
      resizeObs = new ResizeObserver(requestLayout);
      resizeObs.observe(board);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(requestLayout, function () {});
    }

    updateStatus();
    layout();

    // Optional: zu Beginn alle Karten kurz zeigen
    if (cfg.previewMs > 0) {
      previewing = true;
      cards.forEach(function (c) { setOpen(c, true); });
      schedule(function () {
        cards.forEach(function (c) { setOpen(c, false); });
        previewing = false;
      }, cfg.previewMs);
    }
    if (document.hidden) onVisibility();

    return {
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        timers.slice().forEach(cancel);
        if (fitFrame) cancelAnimationFrame(fitFrame);
        if (resizeObs) resizeObs.disconnect();
        root.removeEventListener('pointerdown', onPointerDown);
        root.removeEventListener('pointerup', onPointerUp);
        root.removeEventListener('pointercancel', onPointerCancel);
        root.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('visibilitychange', onVisibility);
        if (root.parentNode) root.parentNode.removeChild(root);
        cards = [];
        openCards = [];
        removeStyle();
      }
    };
  }

  window.SchnitzelGames = window.SchnitzelGames || {};
  window.SchnitzelGames[NAME] = {
    title: 'Memory',
    mount: mount
  };
})();
