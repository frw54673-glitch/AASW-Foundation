CREATE TABLE `gallery_drive_sync` (
	`id` int AUTO_INCREMENT NOT NULL,
	`folderUrl` varchar(1024) NOT NULL,
	`folderId` varchar(255) NOT NULL,
	`syncStatus` enum('not_configured','needs_access','ready','paused','error') NOT NULL DEFAULT 'not_configured',
	`syncIntervalHours` int NOT NULL DEFAULT 24,
	`scheduleCronTaskUid` varchar(65),
	`lastSyncedAt` timestamp,
	`lastSyncError` varchar(500),
	`updatedByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_drive_sync_id` PRIMARY KEY(`id`),
	CONSTRAINT `gallery_drive_sync_folderId_unique` UNIQUE(`folderId`)
);
