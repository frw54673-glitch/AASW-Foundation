CREATE TABLE `monitoring_indicators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`activityId` int,
	`indicatorType` enum('input','output','outcome') NOT NULL,
	`indicatorName` varchar(255) NOT NULL,
	`baselineValue` decimal(14,2) NOT NULL DEFAULT '0',
	`targetValue` decimal(14,2) NOT NULL DEFAULT '0',
	`currentValue` decimal(14,2) NOT NULL DEFAULT '0',
	`measurementFrequency` varchar(100) NOT NULL,
	`dataSource` varchar(255),
	`ownerOpenId` varchar(64),
	`lastMeasuredAt` date,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_budget_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fiscalYear` varchar(16) NOT NULL,
	`budgetLine` varchar(255) NOT NULL,
	`allocatedAmount` decimal(16,2) NOT NULL,
	`approvedAmount` decimal(16,2),
	`funderSource` varchar(255),
	`notes` text,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_budget_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`documentType` enum('proposal','mou','plan','budget','invoice','attendance','report','photo','other') NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`visibility` enum('internal','management','public') NOT NULL DEFAULT 'internal',
	`reviewStatus` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
	`uploadedByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_finance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`budgetAllocationId` int,
	`expenseDate` date NOT NULL,
	`fiscalYear` varchar(16) NOT NULL,
	`expenseCategory` varchar(255) NOT NULL,
	`amount` decimal(16,2) NOT NULL,
	`paymentMode` enum('cash','bank_transfer','upi','cheque','card','other') NOT NULL,
	`vendorName` varchar(255),
	`invoiceNumber` varchar(120),
	`description` text NOT NULL,
	`supportingDocumentPath` varchar(1024),
	`approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedByOpenId` varchar(64),
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_finance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`reportType` enum('monthly','quarterly','annual','donor','field') NOT NULL,
	`reportingPeriod` varchar(100) NOT NULL,
	`dueDate` date NOT NULL,
	`status` enum('draft','pending','submitted','approved','overdue') NOT NULL DEFAULT 'draft',
	`narrative` text,
	`financeSummary` text,
	`documentPath` varchar(1024),
	`submittedAt` timestamp,
	`approvedByOpenId` varchar(64),
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_risks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`riskTitle` varchar(255) NOT NULL,
	`riskDescription` text NOT NULL,
	`riskCategory` varchar(180) NOT NULL,
	`severity` int NOT NULL,
	`likelihood` int NOT NULL,
	`mitigationPlan` text NOT NULL,
	`ownerOpenId` varchar(64),
	`dueDate` date,
	`status` enum('open','mitigating','accepted','closed') NOT NULL DEFAULT 'open',
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_risks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_team_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`staffOpenId` varchar(64),
	`staffName` varchar(255) NOT NULL,
	`assignmentRole` varchar(180) NOT NULL,
	`responsibilities` text NOT NULL,
	`contactNumber` varchar(32),
	`startDate` date NOT NULL,
	`endDate` date,
	`assignmentStatus` enum('active','completed','inactive') NOT NULL DEFAULT 'active',
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_team_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `monitoring_indicators` ADD CONSTRAINT `monitoring_indicators_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_indicators` ADD CONSTRAINT `monitoring_indicators_activityId_project_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `project_activities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_budget_allocations` ADD CONSTRAINT `project_budget_allocations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_documents` ADD CONSTRAINT `project_documents_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_finance_records` ADD CONSTRAINT `project_finance_records_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_finance_records` ADD CONSTRAINT `pfr_budget_alloc_fk` FOREIGN KEY (`budgetAllocationId`) REFERENCES `project_budget_allocations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_reports` ADD CONSTRAINT `project_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_risks` ADD CONSTRAINT `project_risks_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_team_assignments` ADD CONSTRAINT `project_team_assignments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;
