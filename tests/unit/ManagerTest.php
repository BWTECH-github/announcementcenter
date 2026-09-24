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

namespace OCA\AnnouncementCenter\Tests\Unit;

use OCA\AnnouncementCenter\Manager;

/**
 * Class ManagerTest
 *
 * @package OCA\AnnouncementCenter\Tests\Lib
 * @group DB
 */
class ManagerTest extends TestCase {
	/** @var Manager */
	protected $manager;

	protected function setUp(): void {
		parent::setUp();
		$this->manager = new Manager(
			\OC::$server->getDatabaseConnection()
		);
	}

	/**
	 * @expectedMessage Invalid ID
	 */
	public function testGetAnnouncementNotExist() {
		$this->expectException(\InvalidArgumentException::class);

		$this->manager->getAnnouncement(0);
	}

	/**
	 * @expectedMessage Invalid subject
	 * @expectedCode 2
	 */
	public function testAnnounceNoSubject() {
		$this->expectException(\InvalidArgumentException::class);

		$this->manager->announce('', '', '', 0);
	}

	/**
	 * @expectedMessage Invalid subject
	 * @expectedCode 1
	 */
	public function testAnnounceSubjectTooLong() {
		$this->expectException(\InvalidArgumentException::class);

		$this->manager->announce(\str_repeat('a', 513), '', '', 0);
	}

	/**
	 * Der Text hatte keine Grenze und wird an jedes Konto verteilt.
	 */
	public function testAnnounceMessageTooLong() {
		$this->expectException(\InvalidArgumentException::class);
		$this->expectExceptionCode(3);

		$this->manager->announce('subject', \str_repeat('a', 8001), 'author', 0);
	}

	public function testAnnounceMessageAtLimit() {
		$announcement = $this->manager->announce('subject', \str_repeat('a', 8000), 'author', \time());
		$this->manager->delete($announcement['id']);

		$this->assertSame(8000, \strlen($announcement['message']));
	}

	/**
	 * Vorher wurden nur < und > ersetzt: aus getipptem "A&amp;B" wurde in der
	 * Anzeige "A&B". Jetzt wird vollständig maskiert.
	 */
	public function testAnnouncementEscapesAmpersandAndQuotes() {
		$announcement = $this->manager->announce('A&amp;B "x"', "C&D\n'y'", 'author', \time());
		$this->manager->delete($announcement['id']);

		$this->assertSame('A&amp;amp;B &quot;x&quot;', $announcement['subject']);
		$this->assertSame('C&amp;D<br />&#039;y&#039;', $announcement['message']);
	}

	/**
	 * Die Seitengrenze arbeitet mit der Kennung, also muss auch nach der
	 * Kennung sortiert werden. Nach der Zeit sortiert kam eine später
	 * angelegte Ankündigung mit älterem Zeitstempel hinter die ältere.
	 */
	public function testGetAnnouncementsOrderedById() {
		$erste = $this->manager->announce('erste', '', 'author', 2000000000);
		$zweite = $this->manager->announce('zweite', '', 'author', 1000000000);

		$liste = $this->manager->getAnnouncements(2);
		$this->manager->delete($erste['id']);
		$this->manager->delete($zweite['id']);

		$this->assertSame([$zweite['id'], $erste['id']], \array_column($liste, 'id'));
	}

	public function testAnnouncement() {
		$subject = 'subject' . "\n<html>";
		$message = 'message' . "\n<html>";
		$author = 'author';
		$time = \time() - 10;

		$announcement = $this->manager->announce($subject, $message, $author, $time);
		$this->assertIsInt($announcement['id']);
		$this->assertGreaterThan(0, $announcement['id']);
		$this->assertSame('subject &lt;html&gt;', $announcement['subject']);
		$this->assertSame('message<br />&lt;html&gt;', $announcement['message']);
		$this->assertSame('author', $announcement['author']);
		$this->assertSame($time, $announcement['time']);

		$this->assertEquals($announcement, $this->manager->getAnnouncement($announcement['id']));

		$this->assertEquals($announcement, $this->manager->getAnnouncement($announcement['id']));

		$this->assertEquals([$announcement], $this->manager->getAnnouncements(1));

		$this->manager->delete($announcement['id']);

		try {
			$this->manager->getAnnouncement($announcement['id']);
			$this->fail('Failed to delete the announcement');
		} catch (\InvalidArgumentException $e) {
			$this->assertInstanceOf('InvalidArgumentException', $e);
		}
	}
}
