<?php
/**
 * @var array $_
 * @var \OCP\IL10N $l
 */
script('announcementcenter', 'script');
style('announcementcenter', 'style');
?>

<div id="app" class="announcementcenter">
	<?php
	/*
	 * #app-content ist der Rollbereich der Seite. Wer nicht ankündigen darf,
	 * hat darin nichts Fokussierbares - mit der Tastatur ließ sich eine lange
	 * Liste dann nicht rollen (WCAG 2.1.1, axe scrollable-region-focusable).
	 * Der Bereich wird deshalb selbst ein benannter Halt. Mit Formular und
	 * Löschknöpfen folgt das Rollen dem Fokus, dort bleibt er ohne tabindex.
	 */
	?>
	<div id="app-content"<?php if (!$_['is_admin']): ?> tabindex="0" role="region" aria-label="<?php p($l->t('Announcements')); ?>"<?php endif; ?>>
		<div id="app-content-wrapper">
			<?php if ($_['is_admin']) {
				print_unescaped($this->inc('part.add'));
			} ?>

			<?php
			/*
			 * role="status": dieser Block wird ein- und ausgeblendet, während
			 * die Seite steht - etwa nach dem Löschen der letzten Ankündigung.
			 * Ohne die Rolle erfährt eine Sprachausgabe davon nichts.
			 */
			?>
			<div id="emptycontent" role="status" class="<?php if ($_['is_admin']): ?>emptycontent-admin <?php endif; ?>hidden">
				<h2><?php p($l->t('No Announcements')); ?></h2>
				<p><?php p($l->t('There are currently no announcements…')); ?></p>
			</div>
		</div>
	</div>
</div>
