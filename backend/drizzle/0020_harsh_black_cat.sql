CREATE TABLE `member_membership_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`applicationRef` varchar(40) NOT NULL,
	`cycleNumber` int NOT NULL,
	`membershipType` enum('annual','lifetime') NOT NULL,
	`startsOn` date NOT NULL,
	`expiresOn` date,
	`status` enum('active','expired','renewed') NOT NULL DEFAULT 'active',
	`expiredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_membership_cycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_membership_cycles_applicationRef_unique` UNIQUE(`applicationRef`),
	CONSTRAINT `member_membership_cycles_member_cycle_unique` UNIQUE(`memberId`,`cycleNumber`)
);
--> statement-breakpoint
CREATE TABLE `membership_expiry_automation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`lastRanAt` timestamp,
	`lastExpiredCount` int NOT NULL DEFAULT 0,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_expiry_automation_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_expiry_automation_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `member_membership_cycles` ADD CONSTRAINT `mmc_member_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_membership_cycles` ADD CONSTRAINT `mmc_application_fk` FOREIGN KEY (`applicationRef`) REFERENCES `membership_applications`(`applicationRef`) ON DELETE restrict ON UPDATE no action;
