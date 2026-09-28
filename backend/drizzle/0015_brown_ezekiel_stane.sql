ALTER TABLE `members` ADD `profilePhotoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `members` ADD `profilePhotoUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `members` ADD `profilePhotoUpdatedAt` timestamp;