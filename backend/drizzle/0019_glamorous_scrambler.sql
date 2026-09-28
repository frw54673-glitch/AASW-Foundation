CREATE TABLE `member_support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageRef` varchar(40) NOT NULL,
	`memberId` int NOT NULL,
	`message` text NOT NULL,
	`status` enum('submitted','reviewing','responded','closed') NOT NULL DEFAULT 'submitted',
	`adminReply` text,
	`repliedByOpenId` varchar(64),
	`repliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_support_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_support_messages_messageRef_unique` UNIQUE(`messageRef`)
);
--> statement-breakpoint
ALTER TABLE `member_support_messages` ADD CONSTRAINT `member_support_messages_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;