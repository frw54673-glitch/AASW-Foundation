CREATE INDEX `member_service_requests_member_id_idx` ON `member_service_requests` (`memberId`);
--> statement-breakpoint
ALTER TABLE `member_service_requests` DROP INDEX `member_service_requests_member_service_unique`;
