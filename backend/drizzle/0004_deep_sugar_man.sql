CREATE TABLE `contact_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryRef` varchar(40) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`topic` enum('programmes','membership','donation','partnership','media','other') NOT NULL,
	`message` text NOT NULL,
	`status` enum('submitted','reviewing','responded','closed') NOT NULL DEFAULT 'submitted',
	`notificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`notificationSentAt` timestamp,
	`notificationError` varchar(500),
	`consentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_inquiries_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_inquiries_inquiryRef_unique` UNIQUE(`inquiryRef`)
);
