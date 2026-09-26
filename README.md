# 🗝️ Schnitzeljagd-App

Eine Progressive Web App (PWA) für selbstgebaute Schnitzeljagden durch beliebige Städte.
Die App ist ein **Gerüst**: Der Code bleibt immer gleich, jede Stadt ist nur eine JSON-Datei mit Stationen, Rätseln und einer Geschichte.

## So funktioniert das Spiel

1. Stadt auswählen → Story-Intro lesen
2. Pro Station: Die Geschichte gibt einen Hinweis, wohin man laufen muss. Die App zeigt live die Distanz zum Ziel (GPS).
3. Am Ziel (innerhalb des Radius) erscheint ein Rätsel, das man nur vor Ort lösen kann.
4. Richtige Antwort → Konfetti 🎉, Emblem gesammelt, nächstes Story-Kapitel (+ optionaler Foto-Moment) → nächste Station.
5. Am Ende: Finale mit persönlicher Nachricht, Foto-Album der Tour und Urkunde (Dauer, Strecke, Datum) zum Screenshotten. Im Album lassen sich alle Fotos als ZIP herunterladen (oder einzeln per „⬇ speichern").

Eingebaute Sicherheitsnetze: Wer in der Nähe des Ziels war (oder 2 Minuten feststeckt), bekommt einen **„Ich stehe am Ziel"-Notfallknopf**, falls das GPS zwischen Häusern spinnt. Nach 3 falschen Antworten öffnet sich der Rätsel-Tipp automatisch. Der Bildschirm bleibt während der Jagd an (Wake Lock). Fotos werden nur lokal auf dem Handy gespeichert (IndexedDB).

Der Fortschritt wird auf dem Handy gespeichert – App zumachen ist kein Problem.

## Testen ohne draußen zu sein

- Öffne die App mit `?test=1` (z. B. `http://localhost:8000/?test=1`) **oder** tippe auf das ⚙️ oben rechts.
- Im Testmodus erscheint unten eine lila Leiste mit **„Zum Ziel teleportieren"** – damit springst du an die nächste Station, ohne dich zu bewegen.

Lokal starten:

```bash
cd Schnipseljagd
python3 -m http.server 8000
# → http://localhost:8000
```

Hinweis: Echtes GPS funktioniert im Browser nur über HTTPS (oder localhost). Zum Testen auf dem Handy im Heimnetz daher den Testmodus nutzen – oder direkt über GitHub Pages gehen.

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf github.com anlegen, z. B. `schnitzeljagd`. (Für kostenloses GitHub Pages muss das Repo **öffentlich** sein – der Link ist aber nur bekannt, wenn man ihn teilt.)
2. Im Projektordner:
   ```bash
   git init
   git add .
   git commit -m "Schnitzeljagd-App"
   git remote add origin https://github.com/DEIN-NAME/schnitzeljagd.git
   git push -u origin main
   ```
3. Auf GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main / root → Save**
4. Nach 1–2 Minuten ist die App unter `https://DEIN-NAME.github.io/schnitzeljagd/` erreichbar.
5. Link an die Freundin schicken → auf dem iPhone in Safari öffnen → Teilen → **„Zum Home-Bildschirm"** → fertig, sieht aus wie eine echte App.

## Was ist bei GitHub Pages öffentlich – und was nicht?

**Öffentlich** (für jeden lesbar, der Repo oder URL kennt):
- Der gesamte Code und alle `data/*.json` – also Story, Rätsel **inklusive Lösungen**, GPS-Koordinaten und die persönliche Nachricht im Finale.

**Nicht öffentlich** (verlässt nie das Handy):
- Alle Fotos (IndexedDB im Browser), der Spielfortschritt (localStorage), der Live-Standort. Die App sendet nichts an einen Server – GitHub liefert nur statische Dateien aus.

**Eingebauter Schutz – Startcode-Verschlüsselung:** Die Stadt-Dateien liegen nur noch **verschlüsselt** im Repo (`data/<stadt>.enc.json`, AES-GCM, Schlüssel per PBKDF2 aus einem Startcode). Beim ersten Öffnen fragt die App den Code ab („Siegel brechen") und merkt ihn sich auf dem Handy. Ohne Code sind Story, Rätsellösungen und persönliche Nachricht für niemanden lesbar – auch nicht im öffentlichen Repo.

Dazu gehören zwei Dinge, die **niemals hochgeladen** werden dürfen (stehen beide in der `.gitignore`):
- `data-src/` – die Klartext-Originale der Städte
- `CODES.local.md` – die Startcodes

Achtung: Die `.gitignore` wirkt nur bei `git push`. Wer Dateien per Drag & Drop über die GitHub-Webseite hochlädt, muss diese beiden von Hand weglassen.

## Neue Stadt hinzufügen

Es braucht drei Schritte:

1. Eine neue Klartext-Datei `data-src/<stadt>.json` (gleiches Format wie `data-src/stuttgart.json`)
2. Verschlüsseln: lokalen Server starten, `http://localhost:8000/tools/encrypt.html` öffnen, JSON einfügen, Startcode wählen → Ergebnis als `data/<stadt>.enc.json` speichern. Code in `CODES.local.md` notieren.
3. Einen Eintrag in `data/cities.json` (mit `"file": "<stadt>.enc.json", "encrypted": true`)

### So lässt du dir eine neue Stadt von Claude bauen

Prompt-Vorlage:

> Baue mir eine neue Schnitzeljagd für die App in diesem Ordner, für die Stadt **X**.
> Stationen/Orte: … (oder: „such selbst 5–7 schöne, fußläufig verbundene Orte raus")
> Story-Richtung: … (z. B. Krimi, Zeitreise, Piraten, persönliche Anspielungen)
> Persönliche Nachricht am Ende: …

Claude erzeugt dann die JSON-Datei mit Story, Rätseln und Koordinaten und trägt die Stadt in `cities.json` ein. **Wichtig:** Rätsel-Antworten und GPS-Koordinaten vor dem Verschenken einmal selbst vor Ort (oder per Google Maps) prüfen und ggf. in der JSON-Datei korrigieren.

### Format einer Stadt-Datei

```jsonc
{
  "id": "stuttgart",
  "title": "Titel der Geschichte",
  "defaultRadius": 80,            // Meter, ab wann "angekommen" gilt
  "intro": "Einleitungstext …",
  "stations": [
    {
      "title": "Name der Station",
      "story": "Story-Text mit Hinweis, wohin man laufen soll",
      "lat": 48.77855,             // GPS-Ziel
      "lng": 9.17985,
      "radius": 100,               // optional, überschreibt defaultRadius
      "hint": "Tipp, falls man den Ort nicht findet",
      "riddle": {
        "type": "text",                 // "text" (Standard), "choice" oder "number"
        "question": "Rätsel, das nur vor Ort lösbar ist",
        "options": ["A", "B", "C"],     // nur bei type "choice": die Auswahlknöpfe
        "answers": ["antwort", "alternative antwort"],  // Groß/klein & Umlaute egal
        "hint": "Rätsel-Tipp (öffnet sich nach 3 Fehlversuchen automatisch)",
        "wrongText": "Text bei falscher Antwort (optional)"
      },
      "photoTask": "Optionale Foto-Aufgabe, erscheint nach dem Lösen",  // fürs Album
      "solvedText": "Story-Kapitel nach dem Lösen (bei der letzten Station leer lassen)"
    }
  ],
  "finale": {
    "title": "Finale-Überschrift",
    "text": "Auflösung der Geschichte",
    "personalMessage": "Optionale persönliche Nachricht im Rahmen"  // oder Feld löschen
  }
}
```

Koordinaten findest du per Google Maps: Rechtsklick auf den Ort → die Zahlen oben anklicken (kopiert `lat, lng`).

## Dateien

| Datei | Zweck | Öffentlich? |
|---|---|---|
| `index.html`, `css/`, `js/` | App-Gerüst – für neue Städte nie anfassen | ja |
| `data/cities.json` | Liste der verfügbaren Städte | ja |
| `data/<stadt>.enc.json` | Eine Schnitzeljagd, verschlüsselt | ja (unlesbar ohne Code) |
| `tools/encrypt.html` | Verschlüsselungswerkzeug (läuft lokal im Browser) | ja |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA: Homescreen-Icon & Offline-Cache | ja |
| `data-src/<stadt>.json` | Klartext-Original einer Stadt | **NEIN – .gitignore** |
| `CODES.local.md` | Startcodes aller Städte | **NEIN – .gitignore** |
