CREATE TABLE `member_password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_password_reset_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `member_project_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`projectId` int NOT NULL,
	`projectRole` varchar(120) NOT NULL DEFAULT 'Member',
	`assignmentStatus` enum('active','inactive') NOT NULL DEFAULT 'active',
	`assignedByOpenId` varchar(64) NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_project_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member_password_reset_tokens` ADD CONSTRAINT `member_password_reset_tokens_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_project_assignments` ADD CONSTRAINT `member_project_assignments_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_project_assignments` ADD CONSTRAINT `member_project_assignments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;