# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/).

## [1.3.4] - 2026-09-16

Vollständiger Durchgang am laufenden Produkt; die Befunde sind mit
`tests/visual/pruefe-ankuendigungen.js` (21/21) belegt.

### Security

- Ankündigungen gehen nicht mehr an Gastkonten. Sie erreichten dort Glocke,
  Aktivitätenstrom und Sammelmail im Volltext — während die guests-App genau
  diese App sperrt (`announcementcenter` steht in keiner Weißliste), der Klick
  auf die Benachrichtigung also auf einer Seite mit HTTP 403 endete. Gemessen:
  vorher 9 Empfänger inklusive Gast, jetzt 8 ohne.
- Der Ankündigungstext hat eine Längengrenze (8000 Zeichen). Vorher nahm die
  App beliebig viel an und verteilte es an jedes Konto der Instanz.

### Fixed

- Enter im Betrefffeld veröffentlicht, statt die Seite neu zu laden. Das
  Formular hatte keinen echten Absendeknopf: der Browser schickte es als GET
  auf dieselbe Adresse, der getippte Text war weg — und Betreff und
  Ankündigung standen anschließend in der Adresszeile, im Verlauf und im
  Zugriffsprotokoll des Servers.
- Der Löschen-Schalter ist sichtbar (vorher `opacity: 0`, auf Touch-Geräten
  also unauffindbar), trägt `role="button"`, reagiert auf die Leertaste und
  nennt im Vorlesenamen die betroffene Ankündigung — vorher standen in der
  Linkliste einer Sprachausgabe fünf gleichlautende Einträge "Löschen".
- Löschen fragt zurück, meldet den Erfolg und gibt den Fokus weiter. Vorher
  verschwand die Zeile samt fokussiertem Element, der Fokus fiel auf `<body>`,
  und bis zur nächsten Ankündigung lagen wieder 26 Tabulatorschritte.
- Nach dem Löschen wird die Liste nachgeladen statt gezählt. Wer eine volle
  Seite löschte, las "Es gibt derzeit keine Ankündigungen…", obwohl auf dem
  Server weitere lagen und alle anderen Nutzer sie weiter sahen.
- Der Leerzustand verschwindet beim Anlegen sofort und ist als `role="status"`
  ausgezeichnet.
- Zwei Klicks auf "Ankündigen" erzeugen nicht mehr zwei Ankündigungen und zwei
  Benachrichtigungswellen.
- Fehler beim Anlegen werden angezeigt, auch wenn die Antwort kein JSON ist
  (PHP-Fehler, Fehlerseite eines vorgelagerten Servers, Verbindungsabbruch).
  Vorher warf der Zugriff auf `responseJSON.error` selbst einen Fehler, und
  "Ankündigung wird gesendet…" blieb für immer stehen.
- Eine abgelaufene Sitzung meldet nicht mehr grün "Angekündigt!".
- Ein fehlgeschlagener Nachlade-Aufruf legt das Blättern nicht mehr still.
- Das kaufmännische Und bleibt erhalten: die Maskierung ersetzte nur `<` und
  `>`, aus getipptem `A&amp;B` wurde angezeigtes `A&B`. Jetzt maskiert
  `htmlspecialchars` vollständig.
- Blättern überspringt keine Ankündigungen mehr: sortiert wird nach der
  Kennung, mit der auch die Seitengrenze arbeitet — vorher nach der Zeit.
- Die Fehlermeldung beim Anlegen sagt, was fehlt (Betreff leer, Betreff zu
  lang, Text zu lang) statt immer "The subject is too long or empty".

### Changed

- Die Eingabefelder sind nicht mehr auf 720 Pixel festgenagelt; darunter ragten
  sie aus der Schale und die Seite bekam einen waagerechten Rollbalken.
- Farben kommen aus den Gestaltungsmarken von owncloud.online.
- Deutsche Texte vervollständigt: App-Name, Feldnamen und die neuen Meldungen.
  "Announcement Center", "Subject" und "Your announcement" fehlten in allen
  deutschen Sprachdateien und erschienen deshalb englisch.

## [1.3.2] - 2026-08-13

### Changed

- README als Betriebsdokumentation neu geschrieben: Installation, Einstellungen,
  Kommandozeile und Fehlersuche; tote und fremde Verweise entfernt.

## [1.3.1] - 2026-08-13

### Changed

- Produktname, Beschreibung und uebersetzte Zeichenketten nennen owncloud.online;
  Verweise auf Fehlerbereich, Repository und Dokumentation zeigen auf das eigene
  Repository. Screenshots aus fremden Repositories entfernt.

## [Unreleased] - XXXX-XX-XX



## [1.2.2] - 2021-06-18

### Changed

 - Use relative url instead of absoulute url - [#164](https://github.com/owncloud/announcementcenter/issues/164)
 - Drop PHP 7.1 - [#148](https://github.com/owncloud/announcementcenter/issues/148)


## [1.2.1] - 2018-11-30

### Added

- Set max-version to 10 because platform switches to semver
- PHP 7.2 compatibility - [#100](https://github.com/owncloud/announcementcenter/pull/100)

## 1.2.0 - 2017-06-23

### Changed

- Move navigation code to info.xml - [#87](https://github.com/owncloud/announcementcenter/pull/87)

### Fixed

- Allow announcements without messages - [#86](https://github.com/owncloud/announcementcenter/pull/86)

[Unreleased]: https://github.com/owncloud/announcementcenter/compare/v1.2.2...master
[1.2.2]: https://github.com/owncloud/announcementcenter/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/owncloud/announcementcenter/compare/v1.2.0...v1.2.1

