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

## Neon-Runner (`runner`)

Endlos-Läufer im Synthwave-Look: Ein leuchtender Gleiter rast über eine
Neon-Straße mit 3 Spuren auf eine gestreifte Sonne zu. Pinke Hindernisse
kommen entgegen, cyanfarbene Lichter werden eingesammelt. Das Tempo steigt
mit der Zeit. Wer das Ziel an Lichtern erreicht, gewinnt.

- **Steuerung:** Wischen links/rechts = Spur wechseln, nach oben = springen,
  nach unten = ducken (in der Luft: schnell landen). Am Computer auch
  Pfeiltasten/WASD/Leertaste.
- **Hindernisse:** Wand (Spur wechseln), niedrige Schranke mit Warnstreifen
  (springen), schwebender Balken auf Pfosten (ducken). Jede Reihe lässt
  mindestens einen Weg frei.
- **Leben:** Ein Crash kostet ein Leben, danach ist man kurz unverwundbar
  (Gleiter blinkt). Sind alle Leben weg: Karte „Crash", `onFail` wird
  aufgerufen, „Nochmal" startet neu. Jeder weitere Versuch beginnt etwas
  langsamer (bis max. 28 % langsamer), damit es nicht frustriert.
- **Sieg:** Hindernisse zerspringen, der Gleiter schießt Richtung Horizont,
  Karte „Geschafft", nach ca. 2 s `onWin` (genau einmal).
- **Pause:** Wird die App verlassen, hält das Spiel an und zeigt „Pause";
  „Weiter" startet mit kurzem Countdown.
- **Grafik:** Alles live auf Canvas gezeichnet (keine Bilddateien):
  Sternenhimmel, Sonne mit Streifen, Neon-Berge, bewegtes Gitter,
  Leuchtkanten, Partikel, Lichtspur, Kamera-Neigung und Wackeln beim Crash.
  Bei „Bewegung reduzieren" entfallen Wackeln und Neigung, Partikel werden
  weniger. Ruckelt ein Gerät, senkt das Spiel automatisch die Auflösung.
- Farben: Cyan (Spieler, Lichter) und Magenta (Hindernisse, Kulisse), dazu
  Orange-Gelb in der Sonne – bewusste Ausnahme vom Design-System für den
  Wow-Effekt. Die Karten und Knöpfe folgen „Neon-Route".
- Dauer mit Standardwerten: ca. 50–90 Sekunden.
- Datei: `games/runner.js` (ca. 51 KB), Testseite: `games/runner.html`.
  `_snapshot()` am Rückgabeobjekt liefert den Spielstand nur lesend für
  automatisierte Tests; die App braucht es nicht.

### Parameter

| Parameter | Typ | Standard | Bedeutung |
|---|---|---|---|
| `goal` | Zahl | `60` | So viele Lichter muss man sammeln (3–500). |
| `lives` | Zahl | `3` | Leben pro Versuch (1–9). |
| `difficulty` | Zahl | `2` | 1 = gemütlich, 2 = normal, 3 = schnell. Bestimmt Start-/Höchsttempo und Abstand der Hindernisse. |
| `title` | Text | `"Neon-Runner"` | Überschrift der Startkarte. |
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

### Hinweis für den Einbau in die App

Der Service Worker der App (`sw.js`) liefert Dateien aus seinem Cache. Neue
oder geänderte `games/*.js` müssen in die SHELL-Liste von `sw.js`, und die
Cache-Version muss erhöht werden, sonst sieht das Handy die alte Fassung.
Beim Testen im Browser vorher Service Worker und Cache löschen.
