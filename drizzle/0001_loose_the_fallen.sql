ALTER TABLE `payment_transactions` ADD `receiptDeliveryStatus` enum('pending','sending','sent','failed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD `receiptSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD `receiptMessageId` varchar(255);--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD `receiptError` varchar(500);
