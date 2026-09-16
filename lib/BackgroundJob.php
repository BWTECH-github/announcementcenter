<?php
/**
 * @author Joas Schilling <nickvergessen@owncloud.com>
 *
 * @copyright Copyright (c) 2016, Joas Schilling <nickvergessen@owncloud.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License, version 3,
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 *
 */

namespace OCA\AnnouncementCenter;

use OC\BackgroundJob\QueuedJob;
use OCP\Activity\IManager;
use OCP\IConfig;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserManager;
use OCP\Notification\IManager as INotificationManager;

class BackgroundJob extends QueuedJob {
	/** @var INotificationManager */
	protected $notificationManager;

	/** @var IConfig */
	protected $config;

	/** @var IUserManager */
	private $userManager;

	/** @var IURLGenerator */
	private $urlGenerator;

	/** @var Manager */
	private $manager;

	/** @var IManager */
	private $activityManager;

	/**
	 * @param IUserManager $userManager
	 * @param IManager $activityManager
	 * @param INotificationManager $notificationManager
	 * @param IURLGenerator $urlGenerator
	 * @param Manager $manager
	 * @param IConfig $config
	 */
	public function __construct(IUserManager $userManager, IManager $activityManager, INotificationManager $notificationManager, IURLGenerator $urlGenerator, Manager $manager, IConfig $config) {
		$this->userManager = $userManager;
		$this->activityManager = $activityManager;
		$this->notificationManager = $notificationManager;
		$this->urlGenerator = $urlGenerator;
		$this->manager = $manager;
		$this->config = $config;
	}

	/**
	 * @param array $argument
	 */
	public function run($argument) {
		try {
			$announcement = $this->manager->getAnnouncement($argument['id'], false);
		} catch (\InvalidArgumentException $e) {
			// Announcement was deleted in the meantime, so no need to announce it anymore
			// So we die silently
			return;
		}

		$this->createPublicity($announcement['id'], $announcement['author'], $announcement['time']);
	}

	/**
	 * @param int $id
	 * @param string $authorId
	 * @param int $timeStamp
	 */
	protected function createPublicity($id, $authorId, $timeStamp) {
		$event = $this->activityManager->generateEvent();
		$event->setApp('announcementcenter')
			->setType('announcementcenter')
			->setAuthor($authorId)
			->setTimestamp($timeStamp)
			->setSubject('announcementsubject#' . $id, [$authorId])
			->setMessage('announcementmessage#' . $id, [$authorId])
			->setObject('announcement', $id);

		$dateTime = new \DateTime();
		$dateTime->setTimestamp($timeStamp);

		$notification = $this->notificationManager->createNotification();
		$notification->setApp('announcementcenter')
			->setDateTime($dateTime)
			->setObject('announcement', (string) $id)
			->setSubject('announced', [$authorId])
			->setLink($this->urlGenerator->linkToRoute('announcementcenter.page.index'));

		$this->userManager->callForAllUsers(function (IUser $user) use ($authorId, $event, $notification) {
			if ($this->istGast($user->getUID())) {
				return;
			}

			$event->setAffectedUser($user->getUID());
			$this->activityManager->publish($event);

			if ($authorId !== $user->getUID()) {
				$notification->setUser($user->getUID());
				$this->notificationManager->notify($notification);
			}
		});
	}

	/**
	 * Ist dieses Konto ein Gastkonto?
	 *
	 * Ankuendigungen richten sich an die eigene Organisation. Gaeste sind
	 * Externe - Kunden, Lieferanten, Projektpartner -, und die guests-App
	 * sperrt ihnen diese App ueberdies aus: 'announcementcenter' steht weder in
	 * AppWhitelist::CORE_WHITELIST noch in DEFAULT_WHITELIST. Ohne diese
	 * Pruefung bekam ein Gast den vollstaendigen Ankuendigungstext in Glocke,
	 * Aktivitaetenstrom und Sammelmail - und landete beim Klick darauf auf
	 * einer Seite mit HTTP 403.
	 *
	 * Geprueft wird die Kern-Einstellung, nicht die App: so bleibt diese App
	 * auch auf einer Instanz ohne guests lauffaehig.
	 *
	 * Die Falle bei diesem Wert: er ist '1' oder gar nicht gesetzt, aber auf
	 * aelteren Bestaenden auch NULL. Ein Vergleich auf '0' faengt NULL nicht.
	 *
	 * @param string $uid
	 * @return bool
	 */
	protected function istGast($uid) {
		return $this->config->getUserValue($uid, 'owncloud', 'isGuest', '0') === '1';
	}
}
