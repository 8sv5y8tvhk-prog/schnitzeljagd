/* ── Schnitzeljagd – App-Logik (Gerüst, unabhängig von der Stadt) ──
 *
 * Ablauf: Stadt wählen → Intro → pro Station: hinlaufen (GPS)
 * → Rätsel lösen → Zwischenstory (+ optionales Foto) → … → Finale
 * mit Album und Urkunde.
 * Fortschritt liegt im localStorage, Fotos in IndexedDB.
 */

const $ = (id) => document.getElementById(id);

const state = {
  cities: [],        // aus data/cities.json
  hunt: null,        // aktuell geladene Stadt-Daten
  cityId: null,
  stationIndex: 0,
  watchId: null,
  testMode: false,
  simulatedPos: null,
  arrived: false,
  wrongCount: 0,     // Fehlversuche an der aktuellen Station
  closeEnough: false, // war schon mal in der Nähe (für Notfallknopf)
  manualTimer: null,
  wakeLock: null,
  albumReturn: 'screen-start',
};

/* ── Fortschritt speichern/lesen ── */
const progressKey = (cityId) => `schnitzeljagd:${cityId}`;

function loadProgress(cityId) {
  try {
    return JSON.parse(localStorage.getItem(progressKey(cityId))) || {};
  } catch {
    return {};
  }
}

function saveProgress(cityId, patch) {
  const prog = { ...loadProgress(cityId), ...patch };
  localStorage.setItem(progressKey(cityId), JSON.stringify(prog));
  return prog;
}

/* ── Fotos in IndexedDB ── */
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('schnitzeljagd', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePhoto(key, blob) {
  // Als ArrayBuffer ablegen: Blobs in IndexedDB scheitern in manchen
  // Safari-/WebView-Versionen, Rohdaten funktionieren überall
  const record = { type: blob.type || 'image/jpeg', data: await blob.arrayBuffer() };
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(record, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen'));
  });
}

function recordToBlob(value) {
  if (value instanceof Blob) return value; // ältere Einträge
  return new Blob([value.data], { type: value.type });
}

async function getPhotos(prefix) {
  const db = await openDb();
  return new Promise((resolve) => {
    const out = [];
    const req = db.transaction('photos').objectStore('photos').openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (String(cursor.key).startsWith(prefix)) {
          out.push({ key: String(cursor.key), blob: recordToBlob(cursor.value) });
        }
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => resolve([]);
  });
}

/* Fotos vor dem Speichern verkleinern (Handykameras liefern riesige Dateien) */
async function shrinkImage(file, max = 1600) {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.85)
    );
  } catch {
    return file; // z. B. exotisches Format – dann eben in Originalgröße
  }
}

/* ── Navigation zwischen Screens ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ── Bildschirm wachhalten, solange die Jagd läuft ── */
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* z. B. Energiesparmodus – nicht schlimm */ }
}

function releaseWakeLock() {
  if (state.wakeLock) {
    state.wakeLock.release().catch(() => {});
    state.wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  // Nach Tab-Wechsel/Sperren geht der Wake Lock verloren → neu anfordern
  if (document.visibilityState === 'visible' && state.hunt &&
      !$('screen-start').classList.contains('active')) {
    acquireWakeLock();
  }
});

/* ── Konfetti 🎉 ── */
function confettiBurst(count = 60) {
  const cv = $('confetti');
  const ctx = cv.getContext('2d');
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  cv.classList.remove('hidden');

  // Sparsam und einfarbig: nur Cyan-Töne
  const colors = ['#40dcff', '#7ee8ff', '#0e9cbf', '#eaf6fb'];
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * cv.width,
    y: -20 - Math.random() * cv.height * 0.25,
    vx: (Math.random() - 0.5) * 3,
    vy: 2.5 + Math.random() * 3.5,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vrot: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (t - t0 < 2600) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, cv.width, cv.height);
      cv.classList.add('hidden');
    }
  })(t0);
}

/* ── Start: Städte laden und anzeigen ── */
async function init() {
  try {
    const res = await fetch('data/cities.json', { cache: 'no-cache' });
    state.cities = (await res.json()).cities;
  } catch (e) {
    $('city-list').innerHTML = '<p class="footnote">Konnte data/cities.json nicht laden.</p>';
    return;
  }
  renderCityList();
  $('btn-games').classList.toggle('hidden', availableGames().length === 0);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function renderCityList() {
  const list = $('city-list');
  list.innerHTML = '';
  state.cities.forEach((city) => {
    const prog = loadProgress(city.id);
    const btn = document.createElement('button');
    btn.className = 'city-card';
    btn.innerHTML = `
      <div class="city-name">${city.name}</div>
      <div class="city-tagline">${city.tagline || ''}</div>
      <div class="city-progress">${
        prog.done ? 'Abgeschlossen – nochmal spielen'
        : prog.station > 0 ? `Fortsetzen bei Station ${prog.station + 1}`
        : 'Neues Abenteuer starten'
      }</div>`;
    btn.addEventListener('click', () => selectCity(city.id));
    list.appendChild(btn);

    // Album-Link anzeigen, wenn für diese Stadt Fotos existieren
    // (geht auch ohne Startcode – die Fotos liegen ja lokal auf dem Handy)
    getPhotos(`${city.id}:`).then((photos) => {
      if (photos.length === 0) return;
      const albumBtn = document.createElement('button');
      albumBtn.className = 'btn btn-ghost album-link';
      albumBtn.textContent = `Album ${city.name} ansehen (${photos.length})`;
      albumBtn.addEventListener('click', () => openAlbum('screen-start', city.id, city.name));
      btn.insertAdjacentElement('afterend', albumBtn);
    });
  });
}

/* ── Stadt laden, ggf. Startcode abfragen ── */
const codeKey = (cityId) => `schnitzeljagd:code:${cityId}`;

async function selectCity(cityId) {
  const city = state.cities.find((c) => c.id === cityId);
  const res = await fetch(`data/${city.file}`, { cache: 'no-cache' });
  const raw = await res.json();

  if (HuntCrypto.isEncrypted(raw)) {
    // Schon mal richtig eingegebener Code? Dann direkt entsiegeln.
    const saved = localStorage.getItem(codeKey(cityId));
    if (saved) {
      try {
        enterHunt(await HuntCrypto.decrypt(raw, saved), cityId);
        return;
      } catch {
        localStorage.removeItem(codeKey(cityId));
      }
    }
    state.pendingEnc = { cityId, raw };
    $('code-city-name').textContent = city.name;
    $('code-input').value = '';
    setCodeFeedback('');
    showScreen('screen-code');
    return;
  }
  enterHunt(raw, cityId);
}

async function submitCode() {
  const pending = state.pendingEnc;
  if (!pending || !$('code-input').value.trim()) return;
  const btn = $('btn-code-ok');
  btn.disabled = true;
  setCodeFeedback('Siegel wird geprüft …');
  try {
    const hunt = await HuntCrypto.decrypt(pending.raw, $('code-input').value);
    localStorage.setItem(codeKey(pending.cityId), $('code-input').value);
    setCodeFeedback('Siegel gebrochen!', 'ok');

    // Siegelbruch: Schloss zerspringt, kleiner Konfetti-Stoß, dann Intro
    const seal = document.querySelector('#screen-code .start-emblem');
    seal.classList.add('seal-break');
    confettiBurst(40);
    setTimeout(() => {
      seal.classList.remove('seal-break');
      enterHunt(hunt, pending.cityId);
    }, 750);
  } catch {
    setCodeFeedback('Falscher Code – versuch es noch einmal.', 'err');
  }
  btn.disabled = false;
}

function setCodeFeedback(text, cls = '') {
  const el = $('code-feedback');
  el.textContent = text;
  el.className = `riddle-feedback ${cls}`;
}

function enterHunt(hunt, cityId) {
  state.hunt = hunt;
  state.cityId = cityId;

  let prog = loadProgress(cityId);
  if (prog.done) {
    // Abgeschlossene Jagd: von vorn beginnen (Fotos bleiben erhalten)
    localStorage.removeItem(progressKey(cityId));
    prog = {};
  }
  state.stationIndex = prog.station || 0;

  $('intro-title').textContent = state.hunt.title;
  $('intro-text').textContent = state.hunt.intro;
  $('btn-start-hunt').textContent =
    state.stationIndex > 0 ? 'Abenteuer fortsetzen' : 'Das Abenteuer beginnen';
  showScreen('screen-intro');
}

/* ── Station anzeigen ── */
function currentStation() {
  return state.hunt.stations[state.stationIndex];
}

function renderEmblems(container, solvedCount) {
  const total = state.hunt.stations.length;
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const el = document.createElement('span');
    // erledigt = gefüllter Ring, aktuell = Puls-Punkt, kommend = blasser Ring
    el.className = 'emblem' +
      (i < solvedCount ? ' earned'
       : i === solvedCount && solvedCount < total ? ' current'
       : '');
    container.appendChild(el);
  }
}

function showStation() {
  const st = currentStation();
  state.arrived = false;
  state.wrongCount = 0;
  state.closeEnough = false;
  clearTimeout(state.manualTimer);

  $('progress-label').textContent =
    `Station ${state.stationIndex + 1} von ${state.hunt.stations.length}`;
  $('progress-fill').style.width =
    `${(state.stationIndex / state.hunt.stations.length) * 100}%`;
  renderEmblems($('emblem-row'), state.stationIndex);

  $('station-title').textContent = st.title;
  $('station-story').textContent = st.story;

  $('phase-travel').classList.remove('hidden');
  $('phase-riddle').classList.add('hidden');
  $('hint-box').classList.add('hidden');
  $('riddle-hint-box').classList.add('hidden');
  $('btn-arrived-manual').classList.add('hidden');
  $('riddle-input').value = '';
  setFeedback('');

  const compass = document.querySelector('.compass-card');
  compass.classList.remove('near');
  compass.style.removeProperty('--pulse');

  // Notfallknopf spätestens nach 2 Minuten anbieten –
  // falls das GPS im Häusermeer partout nicht auslösen will
  state.manualTimer = setTimeout(showManualArrive, 120000);

  showScreen('screen-station');
  acquireWakeLock();
  startWatchingPosition();
}

function showManualArrive() {
  if (!state.arrived) $('btn-arrived-manual').classList.remove('hidden');
}

/* ── GPS ── */
function startWatchingPosition() {
  stopWatchingPosition();
  if (state.testMode) {
    updateDistanceLoop();
    return;
  }
  if (!('geolocation' in navigator)) {
    $('gps-status').textContent = 'Kein GPS verfügbar – nutze den Notfallknopf.';
    showManualArrive();
    return;
  }
  state.watchId = navigator.geolocation.watchPosition(
    (pos) => handlePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
    (err) => {
      if (err.code === 1) {
        $('gps-status').textContent =
          'GPS-Zugriff verweigert. Bitte Standort in den Browser-Einstellungen erlauben.';
        showManualArrive();
      } else {
        $('gps-status').textContent = 'GPS-Signal schwach … läuft weiter.';
      }
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
  );
}

function stopWatchingPosition() {
  if (state.watchId !== null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

function updateDistanceLoop() {
  // Im Testmodus gibt es keine echten GPS-Events; simulierte Position direkt anwenden
  if (state.simulatedPos) {
    handlePosition(state.simulatedPos.lat, state.simulatedPos.lng, 5);
  } else {
    $('gps-status').textContent = 'Testmodus: nutze "Zum Ziel teleportieren".';
  }
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function handlePosition(lat, lng, accuracy) {
  if (state.arrived) return;
  const st = currentStation();
  const dist = haversine(lat, lng, st.lat, st.lng);
  const radius = st.radius || state.hunt.defaultRadius || 80;

  $('distance-display').textContent =
    dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;
  $('gps-status').textContent =
    state.testMode
      ? 'Testmodus: simulierte Position, echtes GPS pausiert'
      : dist <= radius * 2
        ? 'Gleich geschafft – halte die Augen offen!'
        : `GPS aktiv (±${Math.round(accuracy)} m)`;

  // Puls-Ring wird schneller, je näher das Ziel kommt; bei Zielnähe grüner Glow
  const card = document.querySelector('.compass-card');
  const closeness = Math.min(1, dist / 500);
  card.style.setProperty('--pulse', `${(0.7 + closeness * 1.7).toFixed(2)}s`);
  card.classList.toggle('near', dist <= radius * 2);

  // Wer schon mal nah dran war, bekommt den Notfallknopf –
  // gegen GPS-Sprünge zwischen hohen Gebäuden
  if (dist <= radius * 2.5 && !state.closeEnough) {
    state.closeEnough = true;
    showManualArrive();
  }

  if (dist <= radius) {
    state.arrived = true;
    clearTimeout(state.manualTimer);
    stopWatchingPosition();
    showRiddle();
  }
}

/* ── Rätsel ── */
function showRiddle() {
  const st = currentStation();
  const riddle = st.riddle;
  $('phase-travel').classList.add('hidden');
  $('phase-riddle').classList.remove('hidden');
  $('riddle-text').textContent = riddle.question;

  const isChoice = riddle.type === 'choice';
  $('choice-buttons').classList.toggle('hidden', !isChoice);
  $('riddle-input').classList.toggle('hidden', isChoice);
  $('btn-check').classList.toggle('hidden', isChoice);

  if (isChoice) {
    const box = $('choice-buttons');
    box.innerHTML = '';
    riddle.options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'btn btn-choice';
      b.textContent = opt;
      b.addEventListener('click', () => evaluateAnswer(opt, b));
      box.appendChild(b);
    });
  } else if (riddle.type === 'number') {
    $('riddle-input').setAttribute('inputmode', 'numeric');
    $('riddle-input').placeholder = 'Zahl eingeben …';
  } else {
    $('riddle-input').setAttribute('inputmode', 'text');
    $('riddle-input').placeholder = 'Deine Antwort …';
  }

  if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
}

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

function checkAnswer() {
  const given = $('riddle-input').value;
  if (!normalize(given)) return;
  evaluateAnswer(given);
}

function evaluateAnswer(given, choiceBtn = null) {
  const st = currentStation();
  const correct = st.riddle.answers.some((a) => normalize(a) === normalize(given));

  if (correct) {
    setFeedback('Richtig!', 'ok');
    if (choiceBtn) choiceBtn.classList.add('choice-ok');
    if (navigator.vibrate) navigator.vibrate(150);
    confettiBurst();
    setTimeout(showSolved, 900);
    return;
  }

  state.wrongCount += 1;
  if (choiceBtn) choiceBtn.classList.add('choice-err');
  setFeedback(st.riddle.wrongText || 'Hmm, das ist es noch nicht. Schau genauer hin!', 'err');

  // Nach 3 Fehlversuchen den Tipp automatisch aufklappen
  if (state.wrongCount >= 3 && st.riddle.hint) {
    const box = $('riddle-hint-box');
    box.textContent = `Kleine Hilfe: ${st.riddle.hint}`;
    box.classList.remove('hidden');
  }
}

function setFeedback(text, cls = '') {
  const el = $('riddle-feedback');
  el.textContent = text;
  el.className = `riddle-feedback ${cls}`;
}

/* ── Foto-Momente ── */
function mountPhotoSection(slotId, station) {
  const section = $('photo-section');
  const slot = $(slotId);
  if (!station.photoTask) {
    section.classList.add('hidden');
    return;
  }
  slot.appendChild(section);
  section.classList.remove('hidden');
  $('photo-task').textContent = `Foto-Moment: ${station.photoTask}`;
  $('photo-preview').classList.add('hidden');
  $('photo-input').value = '';
}

async function handlePhotoInput() {
  const file = $('photo-input').files[0];
  if (!file) return;
  const task = $('photo-task');
  task.textContent = 'Foto wird gespeichert …';
  const key = `${state.cityId}:${String(state.stationIndex).padStart(2, '0')}`;
  try {
    const small = await shrinkImage(file);
    const img = $('photo-preview');
    img.src = URL.createObjectURL(small);
    img.classList.remove('hidden');
    await savePhoto(key, small);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    task.textContent = 'Gespeichert – ein Andenken mehr!';
  } catch (e) {
    task.textContent = `Foto konnte nicht gespeichert werden (${e && (e.name || e.message) || 'unbekannter Fehler'}). Bitte nochmal versuchen.`;
  }
}

/* ── Station gelöst ── */
function showSolved() {
  const st = currentStation();
  const isLast = state.stationIndex === state.hunt.stations.length - 1;

  if (isLast) {
    showFinale();
    return;
  }

  $('solved-text').textContent = st.solvedText;
  $('progress-fill').style.width =
    `${((state.stationIndex + 1) / state.hunt.stations.length) * 100}%`;
  saveProgress(state.cityId, { station: state.stationIndex + 1 });
  mountPhotoSection('solved-photo-slot', st);
  showScreen('screen-solved');
}

function nextStation() {
  state.stationIndex += 1;
  showStation();
}

/* ── Finale ── */
function showFinale() {
  const prog = saveProgress(state.cityId, { station: state.stationIndex, done: true });
  if (!prog.finishedAt) saveProgress(state.cityId, { finishedAt: Date.now() });

  $('finale-title').textContent = state.hunt.finale.title;
  $('finale-text').textContent = state.hunt.finale.text;

  const personal = $('finale-personal');
  if (state.hunt.finale.personalMessage) {
    personal.textContent = state.hunt.finale.personalMessage;
    personal.classList.remove('hidden');
  } else {
    personal.classList.add('hidden');
  }

  mountPhotoSection('finale-photo-slot', currentStation());
  showScreen('screen-finale');
  confettiBurst(110);
}

/* ── Album ── */
function stationTitle(cityId, idx) {
  const huntLoaded = state.hunt && state.cityId === cityId;
  return (huntLoaded && state.hunt.stations[idx]?.title) || `Station ${idx + 1}`;
}

async function openAlbum(returnScreen, cityId = state.cityId, cityName = '') {
  state.albumReturn = returnScreen;
  state.albumCityId = cityId;
  const huntLoaded = state.hunt && state.cityId === cityId;
  $('album-subtitle').textContent = huntLoaded ? state.hunt.title : cityName;
  const grid = $('album-grid');
  grid.innerHTML = '';

  const photos = await getPhotos(`${cityId}:`);
  if (photos.length === 0) {
    grid.innerHTML = '<p class="footnote">Noch keine Fotos – haltet eure Momente an den Stationen fest!</p>';
  }
  $('btn-album-download').classList.toggle('hidden', photos.length === 0);
  photos.sort((a, b) => a.key.localeCompare(b.key));
  for (const { key, blob } of photos) {
    const idx = parseInt(key.split(':')[1], 10);
    const title = stationTitle(cityId, idx);
    const fig = document.createElement('figure');
    fig.className = 'album-item';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.alt = '';
    const cap = document.createElement('figcaption');
    cap.textContent = title;
    const dl = document.createElement('a');
    dl.className = 'album-download';
    dl.textContent = 'Speichern';
    dl.href = img.src;
    dl.download = `${String(idx + 1).padStart(2, '0')}-${slugify(title)}.jpg`;
    fig.append(img, cap, dl);
    grid.appendChild(fig);
  }
  showScreen('screen-album');
}

/* ── Foto-Download (ZIP ohne Kompression, JPEGs sind schon komprimiert) ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) { // files: [{ name, data: Uint8Array }]
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);  // local file header
    local.setUint16(4, 20, true);          // version needed
    local.setUint16(6, 0x0800, true);      // UTF-8-Dateinamen
    local.setUint16(8, 0, true);           // store (keine Kompression)
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(local.buffer, name, f.data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);      // central directory entry
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, f.data.length, true);
    c.setUint32(24, f.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(c.buffer, name);

    offset += 30 + name.length + f.data.length;
  }

  const centralSize = central.reduce((s, b) => s + b.byteLength, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);     // end of central directory
  eocd.setUint16(8, files.length, true);
  eocd.setUint16(10, files.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, offset, true);

  return new Blob([...parts, ...central, eocd.buffer], { type: 'application/zip' });
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

async function downloadAlbum() {
  const cityId = state.albumCityId || state.cityId;
  const photos = await getPhotos(`${cityId}:`);
  if (photos.length === 0) return;
  photos.sort((a, b) => a.key.localeCompare(b.key));

  const files = [];
  for (const { key, blob } of photos) {
    const idx = parseInt(key.split(':')[1], 10);
    files.push({
      name: `${String(idx + 1).padStart(2, '0')}-${slugify(stationTitle(cityId, idx))}.jpg`,
      data: new Uint8Array(await blob.arrayBuffer()),
    });
  }
  triggerDownload(buildZip(files), `schnitzeljagd-${cityId}-fotos.zip`);
}

/* ── Urkunde ── */
function routeDistanceKm() {
  const s = state.hunt.stations;
  let m = 0;
  for (let i = 1; i < s.length; i++) {
    m += haversine(s[i - 1].lat, s[i - 1].lng, s[i].lat, s[i].lng);
  }
  return m / 1000;
}

function formatDuration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return min === 1 ? '1 Minute' : `${min} Minuten`;
  const h = Math.floor(min / 60);
  return `${h} Std. ${min % 60} Min.`;
}

function openCert() {
  const prog = loadProgress(state.cityId);
  const total = state.hunt.stations.length;

  $('cert-title').textContent = `»${state.hunt.title}«`;
  $('cert-city').textContent = state.cities.find((c) => c.id === state.cityId)?.name || '';

  const lines = [`${total} Stationen gemeistert · ${total} Rätsel gelöst`];
  lines.push(`Strecke: ca. ${routeDistanceKm().toFixed(1)} km (Luftlinie)`);
  if (prog.startedAt && prog.finishedAt) {
    lines.push(`Dauer: ${formatDuration(prog.finishedAt - prog.startedAt)}`);
  }
  $('cert-stats').innerHTML = lines.map((l) => `<div>${l}</div>`).join('');

  renderEmblems($('cert-emblems'), total);
  const when = new Date(prog.finishedAt || Date.now());
  $('cert-date').textContent = when.toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  showScreen('screen-cert');
}

/* ── Tipps ── */
function toggleHint() {
  const st = currentStation();
  const box = $('hint-box');
  if (!box.classList.contains('hidden')) {
    box.classList.add('hidden');
    return;
  }
  const mapsLink = `https://maps.google.com/?q=${st.lat},${st.lng}`;
  box.innerHTML = `${st.hint || 'Kein Tipp hinterlegt.'}<br><br>` +
    `<a href="${mapsLink}" target="_blank" rel="noopener">Notfall: Ort auf der Karte zeigen</a>`;
  box.classList.remove('hidden');
}

function toggleRiddleHint() {
  const st = currentStation();
  const box = $('riddle-hint-box');
  box.classList.toggle('hidden');
  box.textContent = st.riddle.hint || 'Kein Tipp hinterlegt.';
}

/* ── Testmodus (zum Ausprobieren ohne vor Ort zu sein) ── */
function setTestMode(on) {
  state.testMode = on;
  state.simulatedPos = null;
  $('testbar').classList.toggle('hidden', !on);
  if ($('screen-station').classList.contains('active')) {
    startWatchingPosition();
  }
}

function teleportToTarget() {
  const st = currentStation();
  state.simulatedPos = { lat: st.lat, lng: st.lng };
  handlePosition(st.lat, st.lng, 5);
}

/* ── Minispiele ──
 * Spiele registrieren sich in games/*.js unter window.SchnitzelGames
 * (Vertrag: games/README.md). openGame() zeigt sie im Vollbild-Rahmen.
 */
const game = {
  instance: null,
  name: null,
  params: null,
  fails: 0,
  onDone: null,
};

function availableGames() {
  return Object.entries(window.SchnitzelGames || {})
    .filter(([, g]) => g && typeof g.mount === 'function');
}

function renderGameList() {
  const list = $('game-list');
  list.innerHTML = '';
  availableGames().forEach(([name, g]) => {
    const btn = document.createElement('button');
    btn.className = 'city-card';
    const title = document.createElement('div');
    title.className = 'city-name';
    title.textContent = g.title || name;
    const badge = document.createElement('div');
    badge.className = 'city-progress';
    badge.textContent = 'Spielen';
    btn.append(title, badge);
    btn.addEventListener('click', () =>
      openGame(name, {}, { onDone: () => showScreen('screen-games') }));
    list.appendChild(btn);
  });
}

function setGameStatus() {
  $('game-status').textContent =
    game.fails === 1 ? '1 Fehlversuch' : `${game.fails} Fehlversuche`;
}

function openGame(name, params, { onDone } = {}) {
  unmountGame();
  const def = (window.SchnitzelGames || {})[name];
  if (!def) return;
  game.name = name;
  game.params = params || {};
  game.onDone = onDone || null;
  game.fails = 0;
  setGameStatus();
  $('game-result').classList.add('hidden');
  $('game-overlay').classList.remove('hidden');
  document.body.classList.add('game-open');
  try {
    game.instance = def.mount($('game-host'), {
      params: game.params,
      onWin: handleGameWin,
      onFail: () => { game.fails += 1; setGameStatus(); },
    });
  } catch (e) {
    $('game-status').textContent = 'Spiel konnte nicht gestartet werden';
    if (window.console) console.error(e);
  }
}

function handleGameWin() {
  confettiBurst(60);
  $('game-result-text').textContent =
    game.fails === 0 ? 'Fehlerfrei gelöst' : `Gelöst mit ${game.fails} ${game.fails === 1 ? 'Fehlversuch' : 'Fehlversuchen'}`;
  $('game-result').classList.remove('hidden');
}

function unmountGame() {
  if (game.instance) {
    try { game.instance.destroy(); } catch (e) { if (window.console) console.error(e); }
  }
  game.instance = null;
}

function closeGame() {
  unmountGame();
  $('game-overlay').classList.add('hidden');
  $('game-result').classList.add('hidden');
  document.body.classList.remove('game-open');
  const done = game.onDone;
  game.onDone = null;
  if (done) done();
}

/* ── Events ── */
$('btn-games').addEventListener('click', () => {
  renderGameList();
  showScreen('screen-games');
});
$('btn-games-back').addEventListener('click', () => showScreen('screen-start'));
$('btn-game-close').addEventListener('click', closeGame);
$('btn-game-done').addEventListener('click', closeGame);
$('btn-game-again').addEventListener('click', () =>
  openGame(game.name, game.params, { onDone: game.onDone }));

$('btn-start-hunt').addEventListener('click', () => {
  if (!loadProgress(state.cityId).startedAt) {
    saveProgress(state.cityId, { startedAt: Date.now() });
  }
  showStation();
});
$('btn-back-home').addEventListener('click', () => showScreen('screen-start'));
$('btn-code-ok').addEventListener('click', submitCode);
$('code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitCode();
});
$('btn-code-back').addEventListener('click', () => showScreen('screen-start'));
$('btn-menu-home').addEventListener('click', () => {
  stopWatchingPosition();
  clearTimeout(state.manualTimer);
  releaseWakeLock();
  renderCityList();
  showScreen('screen-start');
});
$('btn-check').addEventListener('click', checkAnswer);
$('riddle-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkAnswer();
});
$('btn-arrived-manual').addEventListener('click', () => {
  if (state.arrived) return;
  state.arrived = true;
  clearTimeout(state.manualTimer);
  stopWatchingPosition();
  showRiddle();
});
$('btn-next-station').addEventListener('click', nextStation);
$('btn-finish').addEventListener('click', () => {
  releaseWakeLock();
  renderCityList();
  showScreen('screen-start');
});
$('btn-hint').addEventListener('click', toggleHint);
$('btn-riddle-hint').addEventListener('click', toggleRiddleHint);
$('photo-input').addEventListener('change', handlePhotoInput);
$('btn-album').addEventListener('click', () => openAlbum('screen-finale'));
$('btn-album-back').addEventListener('click', () => showScreen(state.albumReturn));
$('btn-album-download').addEventListener('click', downloadAlbum);
$('btn-cert').addEventListener('click', openCert);
$('btn-cert-back').addEventListener('click', () => showScreen('screen-finale'));

// Testmodus: über das Zahnrad ein-/ausschalten (oder ?test=1 in der URL)
$('btn-testmode').addEventListener('click', () => setTestMode(!state.testMode));
$('btn-test-off').addEventListener('click', () => setTestMode(false));
$('btn-teleport').addEventListener('click', teleportToTarget);
if (new URLSearchParams(location.search).get('test') === '1') setTestMode(true);

init();
