CREATE TABLE `account_setup_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_setup_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_setup_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationRef` varchar(40) NOT NULL,
	`membershipNo` varchar(20) NOT NULL,
	`fullName` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`passwordHash` varchar(255),
	`mustChangePassword` boolean NOT NULL DEFAULT true,
	`role` enum('member','volunteer','project_manager','admin','super_admin') NOT NULL DEFAULT 'member',
	`memberType` varchar(50) NOT NULL,
	`status` enum('active','suspended','expired','rejected') NOT NULL DEFAULT 'active',
	`accountStatus` enum('active','inactive','locked') NOT NULL DEFAULT 'active',
	`city` varchar(100),
	`state` varchar(100),
	`district` varchar(128),
	`address` text,
	`joiningDate` date NOT NULL,
	`lastLogin` timestamp,
	`loginAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_applicationRef_unique` UNIQUE(`applicationRef`),
	CONSTRAINT `members_membershipNo_unique` UNIQUE(`membershipNo`),
	CONSTRAINT `members_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `account_setup_tokens` ADD CONSTRAINT `account_setup_tokens_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_applicationRef_membership_applications_applicationRef_fk` FOREIGN KEY (`applicationRef`) REFERENCES `membership_applications`(`applicationRef`) ON DELETE restrict ON UPDATE no action;