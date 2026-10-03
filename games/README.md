# Minispiele

Jedes Spiel ist ein eigenständiges Script `games/<name>.js`, das sich unter
`window.SchnitzelGames['<name>']` registriert:

```js
var game = window.SchnitzelGames.memory.mount(container, {
  params: { /* Spielparameter, siehe unten */ },
  onWin: function () {},   // genau einmal, wenn gewonnen
  onFail: function () {}   // bei jedem Fehlversuch
});
game.destroy();            // räumt alles wieder ab
```

Testseiten: lokalen Server im Projektordner starten
(`python3 -m http.server 8123`) und `http://localhost:8123/games/<name>.html`
öffnen.

---

## Memory (`memory`)

Karten liegen verdeckt auf einem Raster. Die Spielerin deckt immer zwei auf;
gehören sie zusammen, bleiben sie offen (grüner Rand), sonst drehen sie sich
nach kurzer Zeit wieder um. Wer alle Paare gefunden hat, gewinnt. Das Spiel
ist immer gewinnbar, es gibt kein Zeitlimit.

- Ein Fehlversuch (zwei unpassende Karten) ruft `onFail` auf.
- Tippt man bei zwei falschen Karten gleich eine dritte an, drehen sich die
  falschen sofort zurück – man muss nicht warten.
- Nach dem letzten Paar: kurze Leucht-Animation, dann `onWin` (ca. 1,5 s).
- Wenn man bei zwei falschen Karten eine davon noch einmal antippt, bleibt
  diese offen und die andere dreht sich um.
- Schriftgröße und Spaltenzahl passen sich automatisch an Bildschirm und
  Wortlänge an. Wörter werden nur getrennt, wenn sie selbst in der kleinsten
  Schrift (15 px) nicht in eine Zeile passen.
- **Pech-Meldung:** Ab dem 2. Fehlversuch in Folge erscheint oben kurz
  „Uff...mieser Larry" (über dem Kopfbereich, die Karten bleiben sichtbar).
  Ein gefundenes Paar setzt die Zählung zurück.
- **Wirbelsturm:** Sind nur noch 2 Paare übrig, erscheint „Achtung, mieser
  Wind", und alle Karten fliegen 3 Sekunden lang wild durchs Spielfeld und
  landen auf neuen Plätzen. Jede noch verdeckte Karte bekommt garantiert einen
  anderen Platz. Währenddessen kann nichts angetippt werden. Passiert pro
  Spiel nur einmal. Bei „Bewegung reduzieren" (iPhone-Einstellung) werden die
  Karten stattdessen aus- und an neuer Stelle wieder eingeblendet.
- Im Hintergrund (App verlassen) pausieren Timer und Animationen, auch der
  Wirbelsturm.
- Datei: `games/memory.js` (ca. 27 KB), Testseite: `games/memory.html`.

### Parameter

| Parameter | Typ | Standard | Bedeutung |
|---|---|---|---|
| `pairs` | Liste | `["Lurch", "Maus", "Macher", "Masaaas", "Labor", "Wuff"]` | Die Paare, 2 bis 10 Einträge. Ein Text (`"Uhr"`) ergibt zwei gleiche Karten. Eine Liste mit zwei Texten (`["Uhr", "Zeiger"]`) ergibt zwei zusammengehörige Karten. Beides darf gemischt werden. Doppelte Einträge werden ignoriert. Kurze Begriffe lesen sich am besten: Bei 6 Paaren passen auf dem kleinsten iPhone Wörter bis ca. 9 Buchstaben ungetrennt, bei 8–10 Paaren eher bis 5–6 Buchstaben. |
| `columns` | Zahl | `0` (automatisch) | Spaltenzahl des Rasters, 2 bis 5. Bei `0` wählt das Spiel selbst passend zur Bildschirmgröße (6 Paare → meist 3 Spalten × 4 Reihen). |
| `title` | Text | `"Memory"` | Überschrift (wird in Großbuchstaben angezeigt). |
| `label` | Text | `"Minispiel"` | Kleine Zeile über der Überschrift. |
| `intro` | Text | `"Tippe zwei Karten an. Findest du alle Paare, die zusammengehören?"` | Kurze Anleitung (1–2 Sätze). |
| `successText` | Text | `"Alle Paare gefunden"` | Erfolgsmeldung nach dem letzten Paar. |
| `previewMs` | Zahl (ms) | `0` | Wenn größer als 0: Zu Beginn liegen alle Karten so lange offen (max. 10000), danach werden sie umgedreht. Erleichtert das Spiel. |
| `flipBackMs` | Zahl (ms) | `1200` | Wie lange zwei falsche Karten offen bleiben (400–4000). |
| `failStreak` | Zahl | `2` | Ab so vielen Fehlversuchen in Folge erscheint die Pech-Meldung. `0` = aus. |
| `failText` | Text | `"Uff...mieser Larry"` | Text der Pech-Meldung. |
| `shuffleAt` | Zahl | `2` | Wirbelsturm, sobald nur noch so viele Paare übrig sind. `0` = aus. |
| `shuffleText` | Text | `"Achtung, mieser Wind"` | Text der Wirbelsturm-Meldung. |
| `shuffleMs` | Zahl (ms) | `3000` | Dauer des Wirbelsturms (1000–8000). |

Ungültige oder fehlende Werte fallen stillschweigend auf den Standard zurück
(bei weniger als 2 gültigen Paaren auf die Standard-Paare).

### Beispiel für eine Stadt-Datei

```json
"riddle": {
  "type": "game",
  "game": "memory",
  "params": {
    "title": "Uhrmacher-Memory",
    "intro": "Jede Karte hat ein Gegenstück. Finde alle sechs Paare.",
    "pairs": [
      ["Uhr", "Zeiger"],
      ["Schloss", "Schlüssel"],
      ["Brunnen", "Wasser"],
      ["Turm", "Glocke"],
      "Kompass",
      "Karte"
    ],
    "columns": 3,
    "previewMs": 0,
    "flipBackMs": 1200,
    "failStreak": 2,
    "failText": "Uff...mieser Larry",
    "shuffleAt": 2,
    "shuffleText": "Achtung, mieser Wind",
    "shuffleMs": 3000,
    "successText": "Alles zusammengesetzt"
  },
  "question": "Die Hofuhrmacherin hat ihre Notizen durcheinandergebracht. Bring Ordnung hinein!",
  "hint": "Merk dir, wo die Karten liegen, die du schon einmal gesehen hast."
}
```

---

## Lurch-Runner (`runner`)

Endlos-Läufer im Synthwave-Look: Der **Neon-Lurch** – ein Feuersalamander
aus Licht – flitzt über eine Neon-Straße mit 3 Spuren auf eine gestreifte
Sonne zu. Pinke Hindernisse
kommen entgegen, cyanfarbene Lichter werden eingesammelt. Das Tempo steigt
mit der Zeit. Wer das Ziel an Lichtern erreicht, gewinnt.

- **Steuerung:** Wischen links/rechts = Spur wechseln, nach oben = springen,
  nach unten = ducken (in der Luft: schnell landen). Am Computer auch
  Pfeiltasten/WASD/Leertaste.
- **Hindernisse:** Wand (Spur wechseln), niedrige Schranke mit Warnstreifen
  (springen), schwebender Balken auf Pfosten (ducken). Jede Reihe lässt
  mindestens einen Weg frei.
- **Der Lurch:** schlängelt sich beim Laufen (Körperwelle, diagonaler
  Gang, Schwanz schwingt nach), hinterlässt leuchtende Fußspuren und einen
  Lichtschweif. Leuchtflecken pulsieren, die Kulleraugen blinzeln und schauen
  beim Spurwechsel zur Seite. Lichter holt er sich mit der pinken Zunge
  (Backen blähen sich danach). Sprung = Froschsprung mit gestreckten Beinen
  und hochgerolltem Schwanz, Landung mit Plumps. Ducken = Bauchplatscher mit
  zugekniffenen Augen, paddelnden Beinen und Funken. Im Countdown und beim
  Sieg dreht er sich zur Kamera und grinst.
- **Leben:** Ein Crash kostet ein Leben: Spiralaugen, kreisende Sternchen,
  danach ist der Lurch kurz unverwundbar (blinkt). Sind alle Leben weg: Karte „Crash", `onFail` wird
  aufgerufen, „Nochmal" startet neu. Jeder weitere Versuch beginnt etwas
  langsamer (bis max. 28 % langsamer), damit es nicht frustriert.
- **Neon-Tunnel:** Etwa alle 30 Sekunden rast man durch eine Röhre aus
  pulsierenden Ringen (Cyan/Magenta, Lichtpunkte an den Ecken). Drinnen
  wird es dunkel, das Blickfeld weitet sich für mehr Tempo-Gefühl, und statt
  Hindernissen wartet eine Lichterkette im Zickzack (Bonus).
- **Nasse Straße:** Hindernisse, Lichter und Tunnelringe spiegeln sich weich
  im Asphalt, die Sonne wirft einen flimmernden Spiegelstreifen. (Der Lurch
  selbst spiegelt sich bewusst nicht – er ist so flach, dass es wie ein
  verschwommener Doppelgänger aussah.)
- **Game over:** Der Lurch liegt platt mit Spiralaugen und Sternchen da,
  dann erscheint die Karte „Crash".
- **Sieg:** Hindernisse zerspringen, Lichter platzen wie Feuerwerk, der Lurch
  macht Freudensprünge, grinst in die Kamera und hüpft in den
  Sonnenuntergang. Karte „Geschafft", nach ca. 2 s `onWin` (genau einmal).
- **Pause:** Wird die App verlassen, hält das Spiel an und zeigt „Pause";
  „Weiter" startet mit kurzem Countdown.
- **Grafik:** Alles live auf Canvas gezeichnet (keine Bilddateien):
  Sternenhimmel, Sonne mit Streifen, Neon-Berge, bewegtes Gitter,
  Leuchtkanten, Partikel, Kamera-Neigung und Wackeln beim Crash.
  Bei „Bewegung reduzieren" entfallen Wackeln und Neigung, Partikel werden
  weniger. Ruckelt ein Gerät, senkt das Spiel automatisch die Auflösung.
- Farben: Cyan (Lurch, Lichter) und Magenta (Hindernisse, Kulisse, Zunge),
  dazu Orange-Gelb in Sonne und Leuchtflecken – bewusste Ausnahme vom Design-System für den
  Wow-Effekt. Die Karten und Knöpfe folgen „Neon-Route".
- Dauer mit Standardwerten: ca. 50–100 Sekunden (Testpilot: 49 s beim Jagen jedes Lichts, 72 s beim reinen Ausweichen).
- Datei: `games/runner.js` (ca. 75 KB), Testseite: `games/runner.html`.
  `_snapshot()` am Rückgabeobjekt liefert den Spielstand nur lesend für
  automatisierte Tests; die App braucht es nicht.

### Parameter

| Parameter | Typ | Standard | Bedeutung |
|---|---|---|---|
| `goal` | Zahl | `80` | So viele Lichter muss man sammeln (3–500). |
| `lives` | Zahl | `3` | Leben pro Versuch (1–9). |
| `difficulty` | Zahl | `2` | 1 = gemütlich, 2 = normal, 3 = schnell. Bestimmt Start-/Höchsttempo und Abstand der Hindernisse. |
| `title` | Text | `"Lurch-Runner"` | Überschrift der Startkarte. |
| `label` | Text | `"Minispiel"` | Kleine Zeile über den Überschriften. |
| `intro` | Text | `"Sammle die Lichter und weiche den pinken Hindernissen aus."` | Anleitungstext auf der Startkarte (die Steuerung wird automatisch darunter erklärt). |
| `winText` | Text | `"Ziel erreicht"` | Text auf der Sieg-Karte. |
| `startText` | Text | `"Los geht's"` | Beschriftung des Startknopfs. |

### Beispiel für eine Stadt-Datei

```json
"riddle": {
  "type": "game",
  "game": "runner",
  "params": {
    "goal": 50,
    "lives": 3,
    "difficulty": 2,
    "title": "Flucht vom Schlossplatz",
    "intro": "Die Uhr tickt! Sammle 50 Lichter, bevor die Zeit abläuft.",
    "winText": "Entkommen! Weiter zur nächsten Station.",
    "startText": "Los geht's"
  },
  "question": "Vor dir liegt die Neon-Route. Schaffst du die Strecke?",
  "hint": "Bleib in der Mitte – von dort erreichst du jede Spur mit einem Wisch."
}
```

---

## Lurch-Golf (`golf`)

Minigolf auf schwebenden Neon-Bahnen über einem leuchtenden Abgrund – der
eingerollte Lurch ist der Ball. Schräge Perspektive von oben, alles live auf
Canvas gezeichnet (keine Bilddateien).

- **Steuerung:** Irgendwo auf den Bildschirm tippen, ziehen und loslassen
  (Steinschleuder): Je weiter gezogen, desto fester; der Schuss geht in die
  Gegenrichtung. Während des Ziehens zeigt eine Punktlinie die echte
  vorausberechnete Bahn (ein Stück weit, inklusive erster Abpraller), ein
  Kraftring wechselt von Cyan über Gelb zu Magenta.
- **Die Bahnen:**
  1. *Warmlaufen* (Par 2): Beschleuniger-Feld, zwei Bumper.
  2. *Portal & Windmühle* (Par 3): rotierende Windmühle im Tor, Portalpaar
     als riskante Abkürzung, Loch in einer Tasche hinter einer Bande.
  3. *Sprungschanze* (Par 3): Mit genug Schwung über die Schanze und den
     Abgrund auf die Insel (Zeitlupe im Flug!) – oder sicher außen über die
     schmale Brücke. Zu schwach oder daneben: Absturz, +1 Schlag, zurück an
     die letzte Position.
- **Der Lurch-Ball:** dreht sich physikalisch korrekt, seine gelben
  Leuchtflecken rollen mit. Liegt er still, schaut er mit Kulleraugen heraus,
  blinzelt und blickt in die Zielrichtung.
- **Effekte:** Kameraflug vom Loch zum Abschlag mit Bahn-Banner, Lichtsäule
  und flatternde Hologramm-Fahne am Loch, Bumper blitzen auf, Portale mit
  Wirbeln, Funken beim Aufprall, Lichtschweif, Einlochen mit Spirale,
  Wertung („Hole in One!", „Birdie!", „Par" …) und Feuerwerksraketen,
  schwebende Drahtkörper im Abgrund als Tiefenebene.
- **Fehlversuch:** Pro Bahn sind höchstens Par + `extraStrokes` Schläge
  erlaubt. Ist der Lurch danach nicht im Loch, erscheint „Zu viele Schläge",
  `onFail` wird aufgerufen und „Nochmal" startet die Bahn neu.
- **Sieg:** Nach der letzten Bahn erscheint eine Scorekarte (Schläge je
  Bahn, Gesamt, unter/über Par) mit Feuerwerk, nach ca. 2,4 s `onWin`
  (genau einmal). Gewonnen ist, wer alle Bahnen einlocht.
- **Pause:** Beim Verlassen der App hält das Spiel an („Pause", „Weiter").
- Physik in festen Teilschritten (240 pro Sekunde), Ballrollen, Reibung,
  Banden, Bumper mit Schwung, bewegte Windmühle, Portale, Schanze mit Flug.
- Datei: `games/golf.js` (ca. 70 KB), Testseite: `games/golf.html`.
  `_snapshot()`, `_predict()` und `_screenOf()` am Rückgabeobjekt dienen nur
  automatisierten Tests (ohne Einfluss auf das Spiel); die App braucht sie nicht.

### Parameter

| Parameter | Typ | Standard | Bedeutung |
|---|---|---|---|
| `holes` | Zahl oder Liste | `3` | Zahl = die ersten n Bahnen (1–3). Liste = bestimmte Bahnen, z. B. `[1, 3]`. |
| `extraStrokes` | Zahl | `4` | Erlaubte Schläge pro Bahn = Par + dieser Wert (1–20). |
| `title` | Text | `"Lurch-Golf"` | Überschrift der Startkarte. |
| `label` | Text | `"Minispiel"` | Kleine Zeile über den Überschriften. |
| `intro` | Text | `"Bring den eingerollten Lurch mit möglichst wenigen Schlägen ins Loch."` | Anleitungstext auf der Startkarte (die Steuerung wird automatisch darunter erklärt). |
| `winText` | Text | `"Alle Bahnen geschafft!"` | Text auf der Scorekarte. |
| `startText` | Text | `"Los geht's"` | Beschriftung des Startknopfs. |

### Beispiel für eine Stadt-Datei

```json
"riddle": {
  "type": "game",
  "game": "golf",
  "params": {
    "holes": [1, 3],
    "extraStrokes": 4,
    "title": "Lurch-Golf am Schlossplatz",
    "intro": "Zwei Bahnen, ein Lurch. Schaffst du die Schanze?",
    "winText": "Eingelocht! Der nächste Hinweis wartet.",
    "startText": "Abschlag!"
  },
  "question": "Der Lurch hat sich eingerollt und will spielen.",
  "hint": "Auf Bahn 3 führt die schmale Brücke rechts sicher zur Insel."
}
```

---

## Leuchtreklame (`sign`)

Kabel-Puzzle mit Lösungswort: Oben hängt ein dunkles Neon-Schild an einer
nassen Backsteinwand im Regen, der Lurch schläft darauf. Unten im
Schaltkasten müssen Kabelstücke gedreht werden, bis der Strom vom Stecker
(links) zur Klemme (rechts) fließt. Jeder geschlossene Stromkreis jagt einen
Lichtimpuls das Kabel hinauf, und die nächsten Buchstaben zünden flackernd.
Am Ende steht das Lösungswort leuchtend da – ideal als Hinweis auf den
nächsten Ort (z. B. ein Restaurant).

- **Steuerung:** Kabelstück antippen = 90° drehen. Strom fließt sichtbar
  durch alle verbundenen Stücke; es zählt nur, dass Stecker und Klemme
  verbunden sind (Abzweige dürfen offen bleiben).
- **Runden:** Das Wort wird auf `rounds` Stromkreise verteilt (bei 4
  Buchstaben und 4 Runden: ein Buchstabe pro Runde). Die Klemme zeigt, welche
  Buchstaben als Nächstes zünden. Die Raster wachsen (4×4 bis 5×6, auf
  kleinen Geräten automatisch kleiner, Kacheln immer mindestens 46 px), und
  pro Runde liegen mehr falsch gedrehte Stücke auf dem Lösungsweg.
- **Tipp ohne Frust:** Nach `hintAfter` Sekunden in einer Runde pulsiert eine
  falsch gedrehte Kachel des Lösungswegs gelb, danach alle 15 s eine weitere.
- **Finale:** Kasten blendet aus, die Kamera fährt auf das Schild zu. Mit
  `circle` malt sich ein Pinselkreis in Magenta um das Wort,
  `subtitle` zündet als zweite Zeile in warmem Gelb, der Lurch wacht auf,
  grinst und hüpft. Karte „Es leuchtet" mit `winText`, ca. 2 s später `onWin`.
- Echte Neon-Optik: Röhren aus/an mit Zündflackern, leises Summen,
  gelegentliches Aussetzen einzelner Buchstaben, Licht fällt auf die Wand.
- Kein `onFail` – das Spiel ist immer lösbar. Pausiert im Hintergrund.
- Bei „Bewegung reduzieren": kein Flackern, kein Regen, weniger Funken.
- **Geheimhaltung:** Das Lösungswort gehört nur in die verschlüsselte
  Stadt-Datei. Standardwort und Beispiele hier sind bewusst neutral.
- Datei: `games/sign.js` (ca. 56 KB), Testseite: `games/sign.html`.
  `_snapshot()` und `_solutionTaps()` dienen nur automatisierten Tests.

### Parameter

| Parameter | Typ | Standard | Bedeutung |
|---|---|---|---|
| `word` | Text | `"LURCH"` | Das Lösungswort auf dem Schild (max. 24 Zeichen, Leerzeichen erlaubt). Kurze Wörter wirken am größten. |
| `subtitle` | Text | `""` | Zweite, kleine Zeile, die im Finale zündet (max. 32 Zeichen). Leer = keine. |
| `circle` | ja/nein | `false` | Pinselkreis um das Wort im Finale. |
| `rounds` | Zahl | `4` | Anzahl der Stromkreise (1–8, höchstens so viele wie Buchstaben). |
| `hintAfter` | Zahl (s) | `40` | Nach so vielen Sekunden pro Runde erscheint der erste Tipp (5–600). |
| `rain` | ja/nein | `true` | Regen vor der Wand. |
| `title` | Text | `"Leuchtreklame"` | Überschrift der Startkarte. |
| `label` | Text | `"Minispiel"` | Kleine Zeile über den Überschriften. |
| `intro` | Text | `"Dreh die Kabelstücke, bis der Strom vom Stecker zur Klemme fließt. …"` | Anleitung auf der Startkarte. |
| `winText` | Text | `"Das Schild leuchtet – folge dem Licht!"` | Text auf der Schlusskarte. |
| `startText` | Text | `"Strom an"` | Beschriftung des Startknopfs. |

### Beispiel für eine Stadt-Datei

```json
"riddle": {
  "type": "game",
  "game": "sign",
  "params": {
    "word": "ZUM LURCH",
    "subtitle": "BAR & GRILL",
    "circle": true,
    "rounds": 4,
    "winText": "Das Schild leuchtet – dort schließt sich der Kreis.",
    "startText": "Strom an"
  },
  "question": "Ein Schild ist ausgefallen. Bring den Strom zurück!",
  "hint": "Fang am Stecker an und folge dem leuchtenden Kabel."
}
```

### Hinweis für den Einbau in die App

Der Service Worker der App (`sw.js`) liefert Dateien aus seinem Cache. Neue
oder geänderte `games/*.js` müssen in die SHELL-Liste von `sw.js`, und die
Cache-Version muss erhöht werden, sonst sieht das Handy die alte Fassung.
Beim Testen im Browser vorher Service Worker und Cache löschen.
