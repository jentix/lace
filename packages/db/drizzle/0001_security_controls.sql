ALTER TABLE `user` ADD `disabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `auth_users_active_admin_idx` ON `user` (`role`) WHERE `user`.`role` = 'admin' and `user`.`disabled` = 0;--> statement-breakpoint
CREATE INDEX `setup_tokens_expiry_idx` ON `setup_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `api_tokens_active_lookup_idx` ON `api_tokens` (`token_hash`) WHERE `api_tokens`.`revoked_at` IS NULL;--> statement-breakpoint
CREATE INDEX `rate_limit_buckets_expiry_idx` ON `rate_limit_buckets` (`expires_at`);
