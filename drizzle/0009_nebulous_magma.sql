CREATE TABLE `beneficiaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`beneficiaryId` varchar(32) NOT NULL,
	`beneficiaryCode` varchar(80),
	`name` varchar(255) NOT NULL,
	`village` varchar(255) NOT NULL,
	`gender` varchar(64) NOT NULL,
	`age` int NOT NULL,
	`phoneNumber` varchar(32) NOT NULL,
	`beneficiaryCategory` varchar(180) NOT NULL,
	`projectId` int NOT NULL,
	`activityId` int,
	`registrationDate` date NOT NULL,
	`status` enum('active','inactive','exited') NOT NULL DEFAULT 'active',
	`duplicateFlag` int NOT NULL DEFAULT 0,
	`duplicateOverrideReason` text,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `beneficiaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `beneficiaries_beneficiaryId_unique` UNIQUE(`beneficiaryId`)
);
--> statement-breakpoint
CREATE TABLE `field_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(32) NOT NULL,
	`projectId` int NOT NULL,
	`activityId` int,
	`eventDate` date NOT NULL,
	`village` varchar(255) NOT NULL,
	`locationDetails` text NOT NULL,
	`numParticipants` int NOT NULL,
	`staffNames` json NOT NULL,
	`volunteerNames` json NOT NULL,
	`observations` text,
	`attachmentPaths` json NOT NULL,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `field_events_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `project_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`activityId` int,
	`outcomeName` varchar(255) NOT NULL,
	`behaviourChange` text,
	`knowledgeChange` text,
	`skillChange` text,
	`followUpStatus` varchar(180),
	`successStories` text,
	`outcomeIndicators` text,
	`baselineValue` decimal(14,2) NOT NULL DEFAULT '0',
	`currentValue` decimal(14,2) NOT NULL DEFAULT '0',
	`targetValue` decimal(14,2) NOT NULL DEFAULT '0',
	`measurementDate` date NOT NULL,
	`evidencePath` varchar(1024),
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_outputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`activityId` int,
	`outputType` enum('training','camp','kit_distribution','session','household','referral','other') NOT NULL,
	`indicator` varchar(255) NOT NULL,
	`targetValue` decimal(14,2) NOT NULL DEFAULT '0',
	`actualValue` decimal(14,2) NOT NULL DEFAULT '0',
	`reportingPeriod` varchar(100) NOT NULL,
	`notes` text,
	`supportingEvidencePath` varchar(1024),
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_outputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `targets_achievement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`activityId` int,
	`indicator` varchar(255) NOT NULL,
	`reportingPeriod` varchar(100) NOT NULL,
	`periodType` enum('monthly','quarterly') NOT NULL,
	`monthlyTarget` decimal(14,2) NOT NULL DEFAULT '0',
	`quarterlyTarget` decimal(14,2) NOT NULL DEFAULT '0',
	`actualAchievement` decimal(14,2) NOT NULL DEFAULT '0',
	`cumulativeAchievement` decimal(14,2) NOT NULL DEFAULT '0',
	`percentageAchieved` decimal(7,2) NOT NULL DEFAULT '0',
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `targets_achievement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `beneficiaries` ADD CONSTRAINT `beneficiaries_activityId_project_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `project_activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_events` ADD CONSTRAINT `field_events_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_events` ADD CONSTRAINT `field_events_activityId_project_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `project_activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_outcomes` ADD CONSTRAINT `project_outcomes_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_outcomes` ADD CONSTRAINT `project_outcomes_activityId_project_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `project_activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_outputs` ADD CONSTRAINT `project_outputs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_outputs` ADD CONSTRAINT `project_outputs_activityId_project_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `project_activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `targets_achievement` ADD CONSTRAINT `targets_achievement_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `targets_achievement` ADD CONSTRAINT `targets_achievement_activityId_project_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `project_activities`(`id`) ON DELETE set null ON UPDATE no action;