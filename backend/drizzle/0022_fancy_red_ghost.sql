CREATE TABLE `member_expiry_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`membershipCycleId` int NOT NULL,
	`reminderType` enum('seven_day') NOT NULL DEFAULT 'seven_day',
	`deliveryStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`sentAt` timestamp,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_expiry_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_expiry_reminders_cycle_type_unique` UNIQUE(`membershipCycleId`,`reminderType`)
);
--> statement-breakpoint
CREATE TABLE `membership_reminder_automation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`lastRanAt` timestamp,
	`lastEligibleCount` int NOT NULL DEFAULT 0,
	`lastError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_reminder_automation_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_reminder_automation_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `member_expiry_reminders` ADD CONSTRAINT `mer_member_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_expiry_reminders` ADD CONSTRAINT `mer_cycle_fk` FOREIGN KEY (`membershipCycleId`) REFERENCES `member_membership_cycles`(`id`) ON DELETE cascade ON UPDATE no action;
