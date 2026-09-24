<?php
/**
 * @var \OCP\IL10N $l
 *
 * Modified by BW-Tech GmbH on 2026-09-16.
 * Changes:
 *   - real submit button so Enter in the subject field announces instead of
 *     reloading the page with the typed text in the query string
 *   - visible-to-screenreader labels instead of aria-label on the field alone
 */
?>
<form id="announce" class="section">
	<h2><?php p($l->t('Add announcement')); ?></h2>

	<?php
	/*
	 * Beschriftungen statt bloßer aria-label: der zugängliche Name hängt damit
	 * nicht mehr am Platzhalter, den manche Sprachausgaben nicht vorlesen, und
	 * die Beschriftung vergrößert die Trefferfläche des Feldes. Für das Auge
	 * bleiben sie versteckt, weil der Platzhalter den Zweck bereits zeigt.
	 */
	?>
	<label for="subject" class="hidden-visually"><?php p($l->t('Subject')); ?></label>
	<input type="text" name="subject" id="subject" placeholder="<?php p($l->t('Subject…')); ?>" />
	<br />
	<label for="message" class="hidden-visually"><?php p($l->t('Your announcement')); ?></label>
	<textarea name="message" id="message" placeholder="<?php p($l->t('Your announcement…')); ?>"></textarea>
	<br />
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
	<input type="submit" id="submit_announcement" value="<?php p($l->t('Announce')); ?>" name="submit" />
	<span id="announcement_submit_msg" class="msg" role="status" aria-live="polite"></span>
</form>
