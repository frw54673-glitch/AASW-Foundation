CREATE TABLE `funders_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`funderName` varchar(255) NOT NULL,
	`csrCompanyName` varchar(255),
	`ngoPartnerName` varchar(255),
	`mouDetails` text,
	`contactPerson` varchar(255),
	`contactNumber` varchar(32),
	`email` varchar(320),
	`partnershipDetails` text,
	`reportingRequirements` text,
	`mouDocumentPath` varchar(1024),
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `funders_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`objectiveId` int,
	`activityName` varchar(255) NOT NULL,
	`activityDescription` text NOT NULL,
	`plannedFrequency` varchar(120),
	`responsiblePerson` varchar(255) NOT NULL,
	`activityLocation` varchar(255) NOT NULL,
	`plannedStartDate` date NOT NULL,
	`plannedEndDate` date NOT NULL,
	`status` enum('planned','ongoing','completed','delayed','cancelled') NOT NULL DEFAULT 'planned',
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_objectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`problemAddressed` text NOT NULL,
	`projectObjectives` text NOT NULL,
	`targetOutcomes` text NOT NULL,
	`sdgLinkage` json NOT NULL,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_objectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_target_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`beneficiaryType` varchar(180) NOT NULL,
	`gender` varchar(64),
	`ageGroup` varchar(100),
	`targetPopulation` text,
	`targetNumber` int NOT NULL,
	`geographyLocation` varchar(255) NOT NULL,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_target_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectName` varchar(255) NOT NULL,
	`projectCode` varchar(32) NOT NULL,
	`projectTheme` varchar(255) NOT NULL,
	`projectLocation` varchar(255) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`projectStatus` enum('planned','active','on_hold','completed','closed','cancelled') NOT NULL DEFAULT 'planned',
	`projectLead` varchar(255) NOT NULL,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectCode_unique` UNIQUE(`projectCode`)
);
--> statement-breakpoint
ALTER TABLE `funders_partners` ADD CONSTRAINT `funders_partners_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_activities` ADD CONSTRAINT `project_activities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_activities` ADD CONSTRAINT `project_activities_objectiveId_project_objectives_id_fk` FOREIGN KEY (`objectiveId`) REFERENCES `project_objectives`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_objectives` ADD CONSTRAINT `project_objectives_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_target_groups` ADD CONSTRAINT `project_target_groups_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;