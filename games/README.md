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
- Im Hintergrund (App verlassen) pausieren Timer und Animationen.
- Datei: `games/memory.js` (ca. 20 KB), Testseite: `games/memory.html`.

### Parameter

| Parameter | Typ | Standard | Bedeutung |
|---|---|---|---|
| `pairs` | Liste | `["Kompass", "Karte", "Schatz", "Route", "Rätsel", "Laterne"]` | Die Paare, 2 bis 10 Einträge. Ein Text (`"Uhr"`) ergibt zwei gleiche Karten. Eine Liste mit zwei Texten (`["Uhr", "Zeiger"]`) ergibt zwei zusammengehörige Karten. Beides darf gemischt werden. Doppelte Einträge werden ignoriert. Kurze Begriffe lesen sich am besten: Bei 6 Paaren passen auf dem kleinsten iPhone Wörter bis ca. 9 Buchstaben ungetrennt, bei 8–10 Paaren eher bis 5–6 Buchstaben. |
| `columns` | Zahl | `0` (automatisch) | Spaltenzahl des Rasters, 2 bis 5. Bei `0` wählt das Spiel selbst passend zur Bildschirmgröße (6 Paare → meist 3 Spalten × 4 Reihen). |
| `title` | Text | `"Memory"` | Überschrift (wird in Großbuchstaben angezeigt). |
| `label` | Text | `"Minispiel"` | Kleine Zeile über der Überschrift. |
| `intro` | Text | `"Tippe zwei Karten an. Findest du alle Paare, die zusammengehören?"` | Kurze Anleitung (1–2 Sätze). |
| `successText` | Text | `"Alle Paare gefunden"` | Erfolgsmeldung nach dem letzten Paar. |
| `previewMs` | Zahl (ms) | `0` | Wenn größer als 0: Zu Beginn liegen alle Karten so lange offen (max. 10000), danach werden sie umgedreht. Erleichtert das Spiel. |
| `flipBackMs` | Zahl (ms) | `1200` | Wie lange zwei falsche Karten offen bleiben (400–4000). |

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
    "successText": "Alles zusammengesetzt"
  },
  "question": "Die Hofuhrmacherin hat ihre Notizen durcheinandergebracht. Bring Ordnung hinein!",
  "hint": "Merk dir, wo die Karten liegen, die du schon einmal gesehen hast."
}
```
