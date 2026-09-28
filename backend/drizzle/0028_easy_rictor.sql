CREATE TABLE `member_service_completion_proofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`completionId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `member_service_completion_proofs_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_service_completion_proofs_unique` UNIQUE(`completionId`,`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `member_service_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`completionRef` varchar(40) NOT NULL,
	`requestId` int NOT NULL,
	`memberId` int NOT NULL,
	`details` text NOT NULL,
	`driveLink` varchar(500),
	`status` enum('submitted','verified','rejected','paid') NOT NULL DEFAULT 'submitted',
	`rejectionReason` text,
	`verifiedByOpenId` varchar(64),
	`verifiedAt` timestamp,
	`paidByOpenId` varchar(64),
	`paidAt` timestamp,
	`payoutAmount` int,
	`payoutMethod` enum('upi','bank_transfer','other'),
	`payoutReference` varchar(120),
	`payoutNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_service_completions_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_service_completions_completionRef_unique` UNIQUE(`completionRef`),
	CONSTRAINT `member_service_completions_request_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
ALTER TABLE `member_service_completion_proofs` ADD CONSTRAINT `mscp_completion_fk` FOREIGN KEY (`completionId`) REFERENCES `member_service_completions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_service_completions` ADD CONSTRAINT `msc_request_fk` FOREIGN KEY (`requestId`) REFERENCES `member_service_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_service_completions` ADD CONSTRAINT `msc_member_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;