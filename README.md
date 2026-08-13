# Announcement Center

Die App stellt in owncloud.online eine eigene Seite bereit, auf der
Administratoren Ankündigungen veröffentlichen können, etwa zu Wartungsfenstern
oder geänderten Funktionen. Jede Ankündigung erreicht alle Konten der Instanz
über die Benachrichtigungsglocke und den Aktivitäten-Strom. Lesen dürfen alle
angemeldeten Konten, anlegen und löschen nur Administratoren.

## Was die App tut

- Ergänzt die Navigationsleiste um einen Eintrag mit der Ankündigungsseite.
- Eine Ankündigung besteht aus einem Betreff (Pflichtfeld, höchstens 512
  Zeichen; geprüft wird die Bytelänge, Umlaute zählen also doppelt) und einem
  optionalen Text. HTML wird nicht ausgeführt: `<` und `>` werden maskiert,
  Zeilenumbrüche im Text bleiben erhalten.
- Beim Absenden wird ein Hintergrundjob eingereiht. Dieser erzeugt für jedes
  Konto einen Eintrag im Aktivitäten-Strom und für alle Konten außer dem
  Verfasser eine Benachrichtigung in der Glocke, die auf die
  Ankündigungsseite verlinkt.
- Die Liste zeigt die neuesten Ankündigungen zuerst und lädt beim Blättern
  jeweils fünf weitere nach.
- Ankündigungen gehen immer an alle Konten. Eine Auswahl einzelner Gruppen
  gibt es in dieser Version nicht.
- Die Daten liegen in der Tabelle `announcements` (mit dem Tabellenpräfix der
  Instanz, üblicherweise `oc_announcements`).

## Voraussetzungen

- owncloud.online 11 (`appinfo/info.xml`: min-version 11, max-version 11.99)
- PHP 8.4
- App `notifications`, aktiviert: Sie speichert und zeigt die Einträge der
  Glocke. Ohne sie erzeugt die App zwar Benachrichtigungen, es nimmt sie aber
  keine App entgegen, und sie verfallen wirkungslos.
- App `activity`, aktiviert: Sie schreibt die Einträge in den Aktivitäten-Strom
  und verschickt die Aktivitäts-E-Mails. Ohne sie bleibt der Strom leer und es
  gehen keine E-Mails zu Ankündigungen hinaus.
- Laufende Hintergrundjobs (Cron), da die Zustellung über einen eingereihten
  Job erfolgt und nicht direkt beim Absenden.

## Installation

Der einfachere Weg ist der Markt: dort die App suchen und installieren. Wer
direkt aus dem Repository installieren möchte, geht so vor:

    cd /var/www/owncloud.online/apps
    git clone https://github.com/BWTECH-github/announcementcenter.git
    cd announcementcenter
    composer install --no-dev
    chown -R www-data:www-data .
    sudo -u www-data php8.4 ../../occ app:enable announcementcenter

Die Tabelle `announcements` wird beim Aktivieren angelegt.

## Bedienung

Rufen Sie die Seite über den Eintrag der App in der Navigationsleiste auf.

Als Administrator steht oben das Formular „Ankündigungen machen“ mit den
Feldern „Betreff…“ und „Deine Ankündigungen…“ (in der förmlichen
Sprachvariante de_DE: „Ihre Ankündigungen…“) sowie der Schaltfläche
„Ankündigen“. Konten ohne Administratorrechte sehen nur die Liste. Ist noch
nichts veröffentlicht, erscheint „Keine Ankündigungen“.

## Einstellungen

Die App hat keine eigenen Konfigurationsschlüssel, keine Einstellungsseite im
Administrations- oder Persönlich-Bereich und keine eigenen occ-Befehle. Die
Verteilung lässt sich daher nicht über Konfigurationswerte steuern. Zwei
Verhaltensweisen sind fest eingebaut:

- Ankündigen und Löschen ist auf Mitglieder der Administratorengruppe
  beschränkt. Gruppenadministratoren zählen hier nicht dazu.
- Der Aktivitätstyp der App wird in den persönlichen Aktivitäts-Einstellungen
  nicht als eigener Punkt angeboten. Nutzerinnen und Nutzer können die
  Einträge dort also nicht abwählen; für Strom und E-Mail ist der Typ
  voreingestellt.

## Aufräumen alter Ankündigungen

- Löschen Sie eine Ankündigung über den Link „Löschen“ in der Zeile mit
  Verfasser und Datum. Der Link wird nur Administratoren angezeigt.
- Das Löschen entfernt den Datensatz aus der Tabelle und markiert die
  zugehörigen Benachrichtigungen als erledigt, sodass sie aus der Glocke
  verschwinden.
- Eine automatische Ablauffrist und einen occ-Befehl zum Aufräumen gibt es
  nicht. Ankündigungen bleiben bestehen, bis sie gelöscht werden.
- Bereits erzeugte Einträge im Aktivitäten-Strom bleiben nach dem Löschen
  erhalten und lauten dann „Die Ankündigung existiert nicht mehr“. Wie lange
  der Strom Einträge aufbewahrt, entscheidet die App `activity`.

## Fehlersuche

| Symptom | Ursache | Abhilfe |
| --- | --- | --- |
| Kein Eintrag der App in der Navigationsleiste | App nicht aktiviert | `sudo -u www-data php8.4 occ app:list` prüfen, dann `occ app:enable announcementcenter` |
| Ankündigung steht auf der Seite, aber niemand erhält Glocke oder Aktivität | Der eingereihte Hintergrundjob wurde noch nicht ausgeführt | Cron prüfen, Warteschlange mit `occ background:queue:status` ansehen, Job notfalls mit `occ background:queue:execute <id>` starten |
| Aktivitäten-Strom zeigt die Ankündigung, die Glocke bleibt leer | App `notifications` fehlt oder ist deaktiviert | App aktivieren; danach erzeugte Ankündigungen erscheinen wieder in der Glocke |
| Weder Aktivitätseintrag noch E-Mail | App `activity` fehlt oder ist deaktiviert | App aktivieren; für E-Mails zusätzlich den Mailversand der Instanz und die Aktivitäts-E-Mail-Einstellung des Kontos prüfen |
| Meldung „Das Betreff ist zu lang oder leer“ beim Ankündigen | Betreff leer oder länger als 512 Zeichen | Betreff kürzen oder ausfüllen; längeren Inhalt in das Textfeld schreiben |
| Aktivitätseintrag lautet „Die Ankündigung existiert nicht mehr“ | Die Ankündigung wurde gelöscht, der Aktivitätseintrag verweist ins Leere | Kein Fehler; Aufbewahrung des Aktivitäten-Stroms über die App `activity` regeln |
| Formular zum Ankündigen fehlt | Das angemeldete Konto ist kein Administrator | Mit einem Administratorkonto anmelden |
| Verfasser sieht keine Benachrichtigung zur eigenen Ankündigung | Der Verfasser wird bewusst übersprungen | Kein Fehler; im Aktivitäten-Strom ist der eigene Eintrag als „Du hast … angekündigt“ sichtbar |

## Herkunft

Diese App geht auf den Announcement Center von Joas Schilling, veröffentlicht
unter dem Dach der ownCloud GmbH, zurück und steht unter der AGPL-3.0. Die
BW-Tech GmbH pflegt den Fork für owncloud.online und hat ihn auf PHP 8.4
angepasst.

- Quellcode und Fehlerberichte:
  https://github.com/BWTECH-github/announcementcenter
- Dokumentation: https://docs.owncloud.online
- Produkt: https://owncloud.online
