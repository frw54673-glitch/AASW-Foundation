CREATE TABLE `member_service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestRef` varchar(40) NOT NULL,
	`memberId` int NOT NULL,
	`serviceType` enum('digital_skill_development','green_entrepreneurship','mentorship_business_support','workshops_seminars','building_community') NOT NULL,
	`message` text,
	`status` enum('submitted','reviewing','accepted','not_available','completed','closed') NOT NULL DEFAULT 'submitted',
	`adminNote` text,
	`reviewedByOpenId` varchar(64),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_service_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_service_requests_requestRef_unique` UNIQUE(`requestRef`),
	CONSTRAINT `member_service_requests_member_service_unique` UNIQUE(`memberId`,`serviceType`)
);
--> statement-breakpoint
ALTER TABLE `member_service_requests` ADD CONSTRAINT `member_service_requests_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;