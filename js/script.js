/**
 * ownCloud - announcementcenter
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Joas Schilling <nickvergessen@gmx.de>
 * @copyright Joas Schilling 2015
 *
 * @copyright Copyright (c) 2026, BW-Tech GmbH
 *
 * Modified by BW-Tech GmbH on 2026-09-16.
 * Changes:
 *   - keyboard: submit on Enter, delete link as a real button, focus handover
 *   - status messages for delete, reliable empty state, no double submit
 *   - error handling that survives non-JSON responses and expired sessions
 */

(function() {
	if (!OCA.AnnouncementCenter) {
		/**
		 * @namespace
		 */
		OCA.AnnouncementCenter = {};
	}

	OCA.AnnouncementCenter.App = {
		ignoreScroll: 0,
		$container: null,
		$content: null,
		lastLoadedAnnouncement: 0,
		wirdGesendet: false,
		fokusStelle: null,

		compiledTemplate: null,
		/*
		 * Betreff und Text kommen vom Server bereits maskiert und mit den
		 * gewollten <br /> versehen (Manager::parseSubject/parseMessage),
		 * deshalb die dreifachen Klammern. Das aria-label dagegen bekommt den
		 * zurückgewandelten Klartext und die doppelten Klammern: Handlebars
		 * maskiert ihn dann für das Attribut.
		 *
		 * Der Löschen-Schalter ist ein Anker mit role="button" - so verlangt es
		 * die Hausregel für Anker, die wie Schalter wirken - und trägt den
		 * Betreff im Namen. Ohne ihn stehen in der Linkliste einer Sprachausgabe
		 * fünf gleichlautende Einträge "Löschen", und niemand weiß, welcher
		 * welche Ankündigung trifft.
		 */
		handlebarTemplate: '<div class="section">' +
				'<h2>{{{subject}}}</h2>' +
				'<em>' +
					'{{author}} — {{time}}' +
					'{{#if announcementId}}' +
						'<span class="delete-link">' +
							' — ' +
							'<a href="#" role="button" data-announcement-id="{{{announcementId}}}">' +
								t('announcementcenter', 'Delete') +
							'</a>' +
						'</span>' +
					'{{/if}}' +
				'</em>' +
				'{{#if message}}' +
					'<br /><br /><p>{{{message}}}</p>' +
				'{{/if}}' +
			'</div>' +
			'<hr />',

		init: function() {
			this.$container = $('#app-content-wrapper');
			this.$content = $('#app-content');
			this.compiledTemplate = Handlebars.compile(this.handlebarTemplate);

			$('#submit_announcement').on('click', _.bind(this.postAnnouncement, this));
			/*
			 * Das Formular hat genau ein einzeiliges Feld; der HTML-Standard
			 * sendet es deshalb ab, sobald dort Enter gedrückt wird. Ohne
			 * action landet das als GET auf derselben Adresse: die Seite lädt
			 * neu, der getippte Text ist weg, und Betreff und Ankündigung
			 * stehen in der Adresszeile, im Verlauf und im Zugriffsprotokoll
			 * des Servers. Hier wird daraus das, was der Nutzer erwartet.
			 */
			$('#announce').on('submit', _.bind(function(e) {
				e.preventDefault();
				this.postAnnouncement();
			}, this));
			this.$content.on('scroll', _.bind(this.onScroll, this));

			this.ignoreScroll = 1;
			this.loadAnnouncements();
		},

		/**
		 * Meldet einen Vorgang an die Sprachausgabe und an das Auge.
		 *
		 * @param {string} text
		 */
		melden: function(text) {
			OC.Notification.showTemporary(text);
		},

		/**
		 * Baut die Angaben für die Vorlage aus einer Ankündigung des Servers.
		 *
		 * @param {Object} announcement
		 * @return {Object}
		 */
		zuVorlage: function(announcement) {
			return {
				time: OC.Util.formatDate(announcement.time * 1000),
				author: announcement.author,
				subject: announcement.subject,
				message: announcement.message,
				announcementId: (oc_isadmin) ? announcement.id : 0
			};
		},

		/**
		 * Hängt die Handler an eine frisch gebaute Ankündigung und gibt dem
		 * Löschen-Schalter seinen Namen.
		 *
		 * @param {jQuery} $html
		 */
		verdrahten: function($html, announcement) {
			var self = this;
			var $link = $html.find('span.delete-link a');

			/*
			 * Der Name entsteht hier und nicht in der Vorlage: dort liefe er
			 * durch Handlebars und wäre ein zweites Mal maskiert - aus einem
			 * Betreff "Umzug & Umbau" würde im Vorlesenamen "Umzug &amp; Umbau".
			 * Der Server liefert den Betreff maskiert; .html(...).text() nimmt
			 * genau diese eine Maskierung zurück, .attr() setzt den Klartext
			 * dann sicher ins Attribut.
			 */
			var betreff = $('<div>').html((announcement && announcement.subject) || '').text();
			/*
			 * escape: false, weil t() seine Platzhalter sonst selbst maskiert
			 * (core/js/l10n.js) - der Betreff stünde dann ein zweites Mal
			 * maskiert im Namen, "Umzug & Umbau" würde zu "Umzug &amp; Umbau"
			 * vorgelesen. Sicher ist das hier, weil .attr() den Wert für das
			 * Attribut selbst behandelt und nichts als Markup deutet.
			 */
			$link.attr('aria-label', t('announcementcenter', 'Delete announcement {subject}',
				{ subject: betreff }, undefined, { escape: false }));
			$link.on('click', function(e) {
				e.preventDefault();
				self.deleteAnnouncement($(this));
			});
			// Ein Anker mit role="button" muss auch auf die Leertaste hören -
			// Enter kommt beim Anker von selbst, die Leertaste nicht.
			$link.on('keydown', function(e) {
				if (e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32) {
					e.preventDefault();
					$(this).trigger('click');
				}
			});
		},

		/**
		 * @param {jQuery} $element der angeklickte Löschen-Schalter
		 */
		deleteAnnouncement: function($element) {
			var self = this,
				$announcement = $element.parents('.section').first(),
				betreff = $announcement.find('h2').text();

			OC.dialogs.confirm(
				/*
				 * escape: false aus demselben Grund wie beim Vorlesenamen: die
				 * Dialogvorlage setzt ihre Werte über octemplate ein, und das
				 * maskiert bereits (escapeFunction: escapeHTML). Ohne diese
				 * Angabe stünde im Dialog "Umzug &amp; Umbau".
				 */
				t('announcementcenter', 'Delete the announcement "{subject}"? This cannot be undone.',
					{ subject: betreff }, undefined, { escape: false }),
				t('announcementcenter', 'Delete announcement'),
				function(bestaetigt) {
					if (!bestaetigt) {
						// Der Fokus gehört zurück auf den Schalter, von dem der
						// Dialog ausging.
						$element.trigger('focus');
						return;
					}
					self.wirklichLoeschen($element, $announcement, betreff);
				},
				true
			);
		},

		/**
		 * @param {jQuery} $element
		 * @param {jQuery} $announcement
		 * @param {string} betreff
		 */
		wirklichLoeschen: function($element, $announcement, betreff) {
			var self = this;
			$.ajax({
				type: 'DELETE',
				url: OC.generateUrl('/apps/announcementcenter/announcement/'
					+ $element.data('announcement-id'))
			}).done(function() {
				/*
				 * Der Fokus steht auf einem Schalter, der gleich verschwindet.
				 * Ohne Übergabe fällt er auf <body>, und der nächste
				 * Tabulatorschritt beginnt wieder ganz oben im Dokument - bei
				 * dieser Seite sind das 26 Schritte bis zur nächsten
				 * Ankündigung.
				 *
				 * Gesetzt wird er erst nach dem Neuaufbau der Liste (siehe
				 * loadAnnouncements): jetzt schon zu fokussieren hilft nichts,
				 * weil gleich darauf alle Zeilen ersetzt werden. Gemerkt wird
				 * die Stelle, an der die gelöschte Ankündigung stand.
				 */
				self.fokusStelle = $announcement.prevAll('.section').not('#announce').length;

				self.melden(t('announcementcenter', 'Announcement deleted'));

				$announcement.slideUp();
				// Der Trennstrich gehört zur Ankündigung.
				$announcement.next('hr').remove();

				setTimeout(function() {
					$announcement.remove();
					/*
					 * Nicht raten, sondern nachsehen: die Liste zeigt immer nur
					 * die zuletzt geladenen Ankündigungen. Wer hier bloß die
					 * Abschnitte im Dokument zählt, meldet "keine
					 * Ankündigungen", obwohl auf dem Server noch welche liegen -
					 * und alle anderen Nutzer sehen sie weiterhin.
					 */
					self.lastLoadedAnnouncement = 0;
					$('#app-content-wrapper .section').not('#announce').remove();
					$('#app-content-wrapper hr').remove();
					self.ignoreScroll = 1;
					self.loadAnnouncements();
				}, 750);
			}).fail(function(response) {
				self.melden(self.fehlertext(response,
					t('announcementcenter', 'The announcement could not be deleted.')));
				$element.trigger('focus');
			});
		},

		/**
		 * Liest die Fehlermeldung aus einer Antwort - oder liefert den Ersatz.
		 *
		 * jQuery füllt responseJSON nur, wenn der Rumpf als JSON lesbar war.
		 * Bei einem PHP-Fehler (HTML), einer Fehlerseite des vorgelagerten
		 * Servers oder einem Verbindungsabbruch ist das Feld undefined, und der
		 * frühere Zugriff darauf warf eine TypeError - die Meldung "wird
		 * veröffentlicht…" blieb dann für immer stehen.
		 *
		 * @param {Object} response
		 * @param {string} ersatz
		 * @return {string}
		 */
		fehlertext: function(response, ersatz) {
			if (response && response.status === 401) {
				return t('announcementcenter', 'Your session has expired. Please reload the page.');
			}
			if (response && response.responseJSON && response.responseJSON.error) {
				return response.responseJSON.error;
			}
			return ersatz;
		},

		postAnnouncement: function() {
			var self = this;

			// Zwei Klicks auf "Ankündigen" erzeugten zwei Ankündigungen - und
			// zwei vollständige Benachrichtigungswellen an alle Konten.
			if (this.wirdGesendet) {
				return;
			}
			if ($.trim($('#subject').val()) === '') {
				OC.msg.finishedError('#announcement_submit_msg',
					t('announcementcenter', 'Please enter a subject.'));
				$('#subject').trigger('focus');
				return;
			}
			this.wirdGesendet = true;
			$('#submit_announcement').prop('disabled', true);
			OC.msg.startAction('#announcement_submit_msg', t('announcementcenter', 'Announcing…'));

			$.ajax({
				type: 'POST',
				url: OC.generateUrl('/apps/announcementcenter/announcement'),
				data: {
					subject: $('#subject').val(),
					message: $('#message').val()
				}
			}).done(function(announcement) {
				/*
				 * Eine abgelaufene Sitzung beantwortet den Aufruf mit der
				 * Anmeldeseite - HTTP 200, aber kein gespeicherter Datensatz.
				 * Ohne diese Prüfung meldete die Oberfläche grün "Angekündigt!"
				 * für eine Ankündigung, die es nicht gibt.
				 */
				if (!announcement || !announcement.id) {
					OC.msg.finishedError('#announcement_submit_msg',
						t('announcementcenter', 'Your session has expired. Please reload the page.'));
					return;
				}

				OC.msg.finishedSuccess('#announcement_submit_msg',
					t('announcementcenter', 'Announced!'));

				var $html = $(self.compiledTemplate(self.zuVorlage(announcement)));
				self.verdrahten($html, announcement);
				$('#app-content-wrapper .section:eq(0)').after($html);
				$html.hide();
				// Der Leerzustand geht sofort weg, nicht erst nach der
				// Einblendung - sonst steht "Es gibt derzeit keine
				// Ankündigungen…" über der gerade angelegten.
				$('#emptycontent').addClass('hidden');
				setTimeout(function() {
					$html.slideDown();
				}, 750);

				$('#subject').val('');
				$('#message').val('');
			}).fail(function(response) {
				OC.msg.finishedError('#announcement_submit_msg', self.fehlertext(response,
					t('announcementcenter', 'The announcement could not be saved.')));
			}).always(function() {
				self.wirdGesendet = false;
				$('#submit_announcement').prop('disabled', false);
			});
		},

		loadAnnouncements: function() {
			var self = this,
				offset = self.lastLoadedAnnouncement;
			$.ajax({
				type: 'GET',
				url: OC.generateUrl('/apps/announcementcenter/announcement'),
				data: {
					offset: offset
				}
			}).done(function (response) {
				if (response && response.length > 0) {
					_.each(response, function (announcement) {
						var $html = $(self.compiledTemplate(self.zuVorlage(announcement)));
						self.verdrahten($html, announcement);
						$('#app-content-wrapper').append($html);

						if (announcement.id < self.lastLoadedAnnouncement || self.lastLoadedAnnouncement === 0) {
							self.lastLoadedAnnouncement = announcement.id;
						}
					});
					self.ignoreScroll = 0;
					$('#emptycontent').addClass('hidden');
				} else if (offset === 0) {
					$('#emptycontent').removeClass('hidden');
				}

				/*
				 * Der Fokus nach einem Löschen: auf den Schalter an derselben
				 * Stelle, sonst auf den letzten, sonst ins Betrefffeld. Er wird
				 * hier gesetzt und nicht beim Löschen selbst, weil die Liste
				 * dazwischen neu aufgebaut wird.
				 */
				if (self.fokusStelle !== null && self.fokusStelle !== undefined) {
					var $schalter = $('#app-content-wrapper .section').not('#announce')
						.find('span.delete-link a');
					var $ziel = $schalter.eq(self.fokusStelle);
					if (!$ziel.length) {
						$ziel = $schalter.last();
					}
					if (!$ziel.length) {
						$ziel = $('#subject');
					}
					$ziel.trigger('focus');
					self.fokusStelle = null;
				}
			}).fail(function() {
				/*
				 * Ohne diesen Zweig blieb ignoreScroll auf 1 stehen: ein
				 * einziger fehlgeschlagener Aufruf legte das Nachladen still,
				 * und weiteres Blättern brachte nichts mehr - bis der Nutzer
				 * die Seite neu lud.
				 */
				self.ignoreScroll = 0;
			});
		},

		onScroll: function () {
			if (this.ignoreScroll <= 0 && this.$content.scrollTop() +
				this.$content.height() > this.$container.height() - 100) {
				this.ignoreScroll = 1;
				this.loadAnnouncements();
			}
		}
	};

})();

$(document).ready(function() {
	OCA.AnnouncementCenter.App.init();
});
