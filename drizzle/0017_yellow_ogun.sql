CREATE TABLE `foundation_admin_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertType` enum('member_auto_approved') NOT NULL,
	`applicationRef` varchar(40) NOT NULL,
	`memberId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` varchar(500) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `foundation_admin_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `foundation_admin_alerts_applicationRef_unique` UNIQUE(`applicationRef`)
);
--> statement-breakpoint
ALTER TABLE `foundation_admin_alerts` ADD CONSTRAINT `fk_admin_alert_application` FOREIGN KEY (`applicationRef`) REFERENCES `membership_applications`(`applicationRef`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `foundation_admin_alerts` ADD CONSTRAINT `fk_admin_alert_member` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;
