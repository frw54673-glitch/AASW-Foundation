CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receipt` varchar(40) NOT NULL,
	`kind` enum('donation','membership') NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`supporterName` varchar(255) NOT NULL,
	`supporterEmail` varchar(320) NOT NULL,
	`supporterPhone` varchar(32),
	`gateway` varchar(32) NOT NULL DEFAULT 'razorpay',
	`gatewayOrderId` varchar(255),
	`gatewayPaymentId` varchar(255),
	`status` enum('created','verified','captured','failed') NOT NULL DEFAULT 'created',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_transactions_receipt_unique` UNIQUE(`receipt`),
	CONSTRAINT `payment_transactions_gatewayOrderId_unique` UNIQUE(`gatewayOrderId`),
	CONSTRAINT `payment_transactions_gatewayPaymentId_unique` UNIQUE(`gatewayPaymentId`)
);
--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gatewayEventId` varchar(255) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`gatewayOrderId` varchar(255),
	`gatewayPaymentId` varchar(255),
	`payloadHash` varchar(64) NOT NULL,
	`status` enum('received','processed','ignored') NOT NULL DEFAULT 'received',
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_webhook_events_gatewayEventId_unique` UNIQUE(`gatewayEventId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
