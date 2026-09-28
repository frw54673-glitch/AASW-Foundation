CREATE TABLE `payment_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`refundRef` varchar(40) NOT NULL,
	`receipt` varchar(40) NOT NULL,
	`gatewayPaymentId` varchar(255) NOT NULL,
	`gatewayRefundId` varchar(255) NOT NULL,
	`amount` int NOT NULL,
	`status` enum('initiated','processed','failed') NOT NULL DEFAULT 'initiated',
	`reason` varchar(500),
	`initiatedByOpenId` varchar(64) NOT NULL,
	`notificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`notificationError` varchar(500),
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_refunds_refundRef_unique` UNIQUE(`refundRef`),
	CONSTRAINT `payment_refunds_gatewayRefundId_unique` UNIQUE(`gatewayRefundId`)
);
--> statement-breakpoint
CREATE TABLE `volunteer_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationRef` varchar(40) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`city` varchar(128) NOT NULL,
	`state` varchar(128) NOT NULL,
	`skills` text NOT NULL,
	`availability` varchar(255) NOT NULL,
	`interests` text NOT NULL,
	`message` text,
	`status` enum('submitted','reviewing','approved','rejected','inactive') NOT NULL DEFAULT 'submitted',
	`reviewerOpenId` varchar(64),
	`reviewNotes` text,
	`notificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`notificationSentAt` timestamp,
	`notificationError` varchar(500),
	`decisionNotificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`reviewedAt` timestamp,
	`consentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volunteer_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `volunteer_applications_applicationRef_unique` UNIQUE(`applicationRef`)
);
--> statement-breakpoint
ALTER TABLE `payment_transactions` MODIFY COLUMN `status` enum('created','verified','captured','failed','refunded') NOT NULL DEFAULT 'created';--> statement-breakpoint
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_receipt_payment_transactions_receipt_fk` FOREIGN KEY (`receipt`) REFERENCES `payment_transactions`(`receipt`) ON DELETE restrict ON UPDATE no action;