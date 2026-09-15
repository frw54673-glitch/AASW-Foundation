CREATE TABLE `impact_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`evidenceType` enum('photo','field_story','case_study','survey','report','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`storageKey` varchar(1024),
	`consentConfirmed` int NOT NULL DEFAULT 0,
	`visibility` enum('internal','management','public') NOT NULL DEFAULT 'internal',
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `impact_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mis_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorOpenId` varchar(64) NOT NULL,
	`action` varchar(180) NOT NULL,
	`entityType` varchar(120) NOT NULL,
	`entityId` varchar(80) NOT NULL,
	`projectId` int,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mis_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_closures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`closureDate` date NOT NULL,
	`finalReportApproved` int NOT NULL DEFAULT 0,
	`financeApproved` int NOT NULL DEFAULT 0,
	`impactEvidenceAttached` int NOT NULL DEFAULT 0,
	`lessonsLearned` text NOT NULL,
	`closureStatus` enum('draft','ready_for_review','closed') NOT NULL DEFAULT 'draft',
	`approvedByOpenId` varchar(64),
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_closures_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_closures_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
ALTER TABLE `impact_evidence` ADD CONSTRAINT `impact_evidence_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mis_audit_logs` ADD CONSTRAINT `mis_audit_logs_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_closures` ADD CONSTRAINT `project_closures_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;