/**
 * Das Announcement Center am laufenden Produkt.
 *
 * Geprüft wird, was die Prüfung vom 16.09.2026 als Mangel belegt hat - und
 * zwar so, dass ein Rückfall auffällt:
 *
 *   - Tastatur: Enter im Betrefffeld veröffentlicht, statt die Seite neu zu
 *     laden und den Text in die Adresszeile zu schreiben.
 *   - Löschen: sichtbarer Schalter mit Rolle und eigenem Namen, Rückfrage,
 *     Fokusübergabe, Meldung.
 *   - Leerzustand: verschwindet beim Anlegen und lügt nach dem Löschen nicht.
 *   - Maskierung: Markup im Betreff bleibt Text, das kaufmännische Und bleibt
 *     ein kaufmännisches Und.
 *   - Sprache: die Oberfläche ist deutsch, auch die Vorlesenamen.
 *
 * Aufruf: OC_PASSWORD=... node tests/visual/pruefe-ankuendigungen.js
 */
'use strict';

const { chromium } = require('playwright');

const BASIS = process.env.OC_URL || 'http://127.0.0.1:18130';
const NUTZER = process.env.OC_USER || 'admin';
const PASSWORT = process.env.OC_PASSWORD;

if (!PASSWORT) {
	console.error('OC_PASSWORD fehlt. Aufruf: OC_PASSWORD=... node tests/visual/pruefe-ankuendigungen.js');
	process.exit(2);
}

const ergebnisse = [];
function pruefe(name, ok, zusatz) {
	ergebnisse.push({ name, ok: !!ok, zusatz: zusatz === undefined ? '' : String(zusatz) });
}

const BETREFF = 'Probe & Umzug <b>fett</b> ' + process.pid;
const TEXT = 'Zeile eins\nZeile zwei mit <img src=x onerror="window.__acXss=1"> und & Zeichen.';

(async () => {
	const browser = await chromium.launch();
	const seite = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	const skriptfehler = [];
	seite.on('pageerror', (e) => skriptfehler.push(String(e).slice(0, 160)));

	await seite.goto(`${BASIS}/index.php/login`, { waitUntil: 'domcontentloaded' });
	await seite.fill('#user', NUTZER);
	await seite.fill('#password', PASSWORT);
	await seite.click('#submit');
	await seite.waitForLoadState('domcontentloaded');

	await seite.goto(`${BASIS}/index.php/apps/announcementcenter/`, { waitUntil: 'domcontentloaded' });
	await seite.waitForSelector('#announce', { timeout: 20000 });
	await seite.waitForTimeout(1500);

	/* ---------- 1. Sprache und Beschriftungen ---------- */

	const sprache = await seite.evaluate(() => ({
		buendelDa: !!(window.OC.L10N._bundles && window.OC.L10N._bundles.announcementcenter),
		probe: t('announcementcenter', 'Announcement deleted'),
		beschriftungen: Array.from(document.querySelectorAll('#announce label'))
			.map((l) => l.textContent.trim()),
		knopfTyp: (document.querySelector('#submit_announcement') || {}).type,
	}));

	pruefe('Sprachbündel der App ist geladen', sprache.buendelDa);
	pruefe('Texte kommen übersetzt an', sprache.probe !== 'Announcement deleted', sprache.probe);
	pruefe('Beide Felder haben eine Beschriftung', sprache.beschriftungen.length === 2,
		sprache.beschriftungen.join(' | '));
	pruefe('Absenden ist ein echter Absendeknopf', sprache.knopfTyp === 'submit', sprache.knopfTyp);

	/* ---------- 2. Enter im Betrefffeld veröffentlicht ---------- */

	await seite.fill('#subject', BETREFF);
	await seite.fill('#message', TEXT);
	const adresseVorher = seite.url();
	await seite.press('#subject', 'Enter');
	await seite.waitForTimeout(2500);

	const nachEnter = await seite.evaluate(() => ({
		adresse: location.href,
		meldung: (document.querySelector('#announcement_submit_msg') || {}).textContent || '',
		betreffFeld: (document.querySelector('#subject') || {}).value,
		ankuendigungen: document.querySelectorAll('#app-content-wrapper .section').length - 1,
		leerzustandSichtbar: (function () {
			const l = document.querySelector('#emptycontent');
			return !!l && !l.classList.contains('hidden');
		}()),
	}));

	pruefe('Enter schreibt den Text nicht in die Adresszeile',
		nachEnter.adresse.indexOf('subject=') === -1 && nachEnter.adresse === adresseVorher,
		nachEnter.adresse.slice(-60));
	pruefe('Enter veröffentlicht', nachEnter.ankuendigungen > 0 && nachEnter.betreffFeld === '',
		`${nachEnter.ankuendigungen} Ankündigungen, Meldung: ${nachEnter.meldung.trim()}`);
	pruefe('Leerzustand ist beim Anlegen sofort weg', !nachEnter.leerzustandSichtbar);

	/* ---------- 3. Maskierung ---------- */

	const anzeige = await seite.evaluate((erwartet) => {
		const erste = document.querySelector('#app-content-wrapper .section:not(#announce)');
		return {
			xss: !!window.__acXss,
			fremdesBild: document.querySelectorAll('img[src="x"]').length,
			fettElement: erste ? erste.querySelectorAll('b, strong').length : -1,
			betreff: erste ? erste.querySelector('h2').textContent : '',
			// Der Text muss genau so dastehen, wie er getippt wurde.
			stimmt: erste ? erste.querySelector('h2').textContent === erwartet : false,
			zeilenumbruch: erste ? erste.querySelectorAll('p br').length : 0,
		};
	}, BETREFF);

	pruefe('Kein Skript aus der Ankündigung ausgeführt', !anzeige.xss);
	pruefe('Kein fremdes Bild im Dokument', anzeige.fremdesBild === 0);
	pruefe('Markup im Betreff bleibt Text', anzeige.fettElement === 0);
	pruefe('Betreff steht Zeichen für Zeichen so da, wie getippt', anzeige.stimmt,
		anzeige.betreff);
	pruefe('Zeilenumbruch im Text bleibt erhalten', anzeige.zeilenumbruch > 0,
		`${anzeige.zeilenumbruch} Umbrüche`);

	/* ---------- 4. Der Löschen-Schalter ---------- */

	const schalter = await seite.evaluate(() => {
		const link = document.querySelector('.delete-link a');
		if (!link) { return null; }
		const s = getComputedStyle(link);
		return {
			rolle: link.getAttribute('role'),
			name: link.getAttribute('aria-label'),
			deckkraft: s.opacity,
			// Doppelt maskiert wäre "&amp;" im Namen sichtbar.
			doppeltMaskiert: (link.getAttribute('aria-label') || '').indexOf('&amp;') !== -1,
		};
	});

	pruefe('Löschen-Schalter trägt die Rolle', schalter && schalter.rolle === 'button');
	pruefe('Löschen-Schalter ist sichtbar', schalter && parseFloat(schalter.deckkraft) > 0.5,
		schalter ? `Deckkraft ${schalter.deckkraft}` : '-');
	pruefe('Löschen-Schalter nennt die Ankündigung im Namen',
		schalter && schalter.name && schalter.name.indexOf(BETREFF) !== -1,
		schalter ? schalter.name : '-');
	pruefe('Der Name ist nicht doppelt maskiert', schalter && !schalter.doppeltMaskiert);

	/* ---------- 5. Löschen: Rückfrage, Fokus, Meldung ---------- */

	const vorher = await seite.evaluate(() =>
		document.querySelectorAll('#app-content-wrapper .section').length - 1);

	await seite.locator('.delete-link a').first().focus();
	await seite.keyboard.press('Space');
	await seite.waitForTimeout(900);

	const dialog = await seite.evaluate(() => {
		const d = document.querySelector('.oc-dialog');
		return {
			da: !!d,
			text: d ? d.textContent.replace(/\s+/g, ' ').slice(0, 120) : '',
		};
	});
	pruefe('Leertaste löst den Schalter aus und fragt zurück', dialog.da, dialog.text);

	if (dialog.da) {
		await seite.locator('.oc-dialog button.primary, .oc-dialog .primary').last().click();
		await seite.waitForTimeout(2500);
	}

	const nachLoeschen = await seite.evaluate(() => ({
		ankuendigungen: document.querySelectorAll('#app-content-wrapper .section').length - 1,
		fokus: document.activeElement ? (document.activeElement.tagName
			+ (document.activeElement.id ? '#' + document.activeElement.id : '')
			+ (document.activeElement.className ? '.' + String(document.activeElement.className).split(' ')[0] : '')) : '-',
		meldung: (document.querySelector('#notification') || {}).textContent || '',
	}));

	pruefe('Die Ankündigung ist weg', nachLoeschen.ankuendigungen === vorher - 1,
		`${vorher} -> ${nachLoeschen.ankuendigungen}`);
	pruefe('Der Fokus bleibt in der Seite, nicht auf <body>',
		nachLoeschen.fokus.indexOf('BODY') === -1, nachLoeschen.fokus);
	pruefe('Das Löschen wird gemeldet', nachLoeschen.meldung.trim() !== '',
		nachLoeschen.meldung.trim().slice(0, 60));

	pruefe('Keine Skriptfehler auf der Seite', skriptfehler.length === 0,
		skriptfehler.slice(0, 2).join(' | '));

	await browser.close();

	let schlecht = 0;
	console.log('\n--- Announcement Center ---');
	ergebnisse.forEach((e) => {
		if (!e.ok) { schlecht++; }
		console.log(`${e.ok ? 'OK  ' : 'FEHL'}  ${e.name}${e.zusatz ? '  (' + e.zusatz + ')' : ''}`);
	});
	console.log(`\n${ergebnisse.length - schlecht}/${ergebnisse.length} bestanden`);
	process.exit(schlecht ? 1 : 0);
})();
