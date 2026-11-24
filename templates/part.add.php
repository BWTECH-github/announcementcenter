<?php
/**
 * @var \OCP\IL10N $l
 *
 * Modified by BW-Tech GmbH on 2026-09-16.
 * Changes:
 *   - real submit button so Enter in the subject field announces instead of
 *     reloading the page with the typed text in the query string
 *   - visible-to-screenreader labels instead of aria-label on the field alone
 *
 * Modified by BW-Tech GmbH on 2026-11-24.
 * Changes:
 *   - visible labels above the fields instead of placeholders; the subject
 *     is required, the announcement text is marked as optional
 */
?>
<form id="announce" class="section" novalidate>
	<h2><?php p($l->t('Add announcement')); ?></h2>

	<?php
	/*
	 * Sichtbare Beschriftungen über den Feldern statt Platzhalter: der
	 * Platzhalter verschwand mit dem ersten Zeichen, danach war nicht mehr zu
	 * sehen, welches Feld welches ist (WCAG 3.3.2). Der Betreff ist Pflicht
	 * (required), der Text trägt „(optional)“. novalidate, weil das Skript
	 * den fehlenden Betreff selbst am Feld meldet.
	 */
	?>
	<div class="announce-field">
		<label for="subject"><?php p($l->t('Subject')); ?></label>
		<input type="text" name="subject" id="subject" required />
	</div>
	<div class="announce-field">
		<label for="message"><?php p($l->t('Your announcement')); ?> <span class="announce-optional"><?php p($l->t('(optional)')); ?></span></label>
		<textarea name="message" id="message"></textarea>
	</div>
	<?php
	/*
	 * type="submit" statt type="button": in einem Formular mit einem einzeiligen
	 * Feld sendet der Browser bei Enter ab. Ohne echten Absendeknopf und ohne
	 * action ging das als GET auf dieselbe Adresse - die Seite lud neu, der
	 * getippte Text war weg, und Betreff und Ankündigung standen anschließend
	 * in der Adresszeile, im Verlauf und im Zugriffsprotokoll des Servers. Das
	 * JavaScript fängt submit ab und veröffentlicht.
	 */
	?>
	<input type="submit" id="submit_announcement" class="primary" value="<?php p($l->t('Announce')); ?>" name="submit" />
	<span id="announcement_submit_msg" class="msg" role="status" aria-live="polite"></span>
</form>
