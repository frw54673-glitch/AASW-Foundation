ALTER TABLE `membership_applications` ADD `district` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `panEncrypted` text NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `panLastFour` varchar(4) NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `idProofType` enum('aadhaar','voter_id','passport','driving_licence','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `idProofStorageKey` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `idProofOriginalName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `idProofMimeType` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `notificationStatus` enum('pending','sent','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `notificationSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `membership_applications` ADD `notificationError` varchar(500);