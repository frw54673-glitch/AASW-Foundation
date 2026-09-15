CREATE TABLE `membership_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationRef` varchar(40) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`city` varchar(128) NOT NULL,
	`state` varchar(128) NOT NULL,
	`membershipType` enum('annual','lifetime') NOT NULL,
	`message` text,
	`status` enum('submitted','reviewing','approved','declined') NOT NULL DEFAULT 'submitted',
	`consentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `membership_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `membership_applications_applicationRef_unique` UNIQUE(`applicationRef`)
);
