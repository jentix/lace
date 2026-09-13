CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`capabilities_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_provider_account_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `auth_accounts_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "auth_users_role_check" CHECK("user"."role" in ('admin', 'editor', 'viewer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `content_blocks` (
	`snapshot_id` text NOT NULL,
	`block_key` text NOT NULL,
	`block_type` text NOT NULL,
	`position` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`data_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`snapshot_id`, `block_key`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `content_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "content_blocks_position_check" CHECK("content_blocks"."position" > 0),
	CONSTRAINT "content_blocks_schema_version_check" CHECK("content_blocks"."schema_version" > 0)
);
--> statement-breakpoint
CREATE INDEX `content_blocks_snapshot_position_idx` ON `content_blocks` (`snapshot_id`,`position`);--> statement-breakpoint
CREATE TABLE `content_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`model_key` text NOT NULL,
	`singleton_key` integer,
	`draft_snapshot_id` text,
	`published_snapshot_id` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`model_key`) REFERENCES `content_models`(`key`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`draft_snapshot_id`) REFERENCES `content_snapshots`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`published_snapshot_id`) REFERENCES `content_snapshots`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "content_entries_singleton_key_check" CHECK("content_entries"."singleton_key" is null or "content_entries"."singleton_key" = 1)
);
--> statement-breakpoint
CREATE INDEX `content_entries_model_idx` ON `content_entries` (`model_key`);--> statement-breakpoint
CREATE INDEX `content_entries_list_idx` ON `content_entries` (`model_key`,`updated_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `content_entries_singleton_idx` ON `content_entries` (`model_key`) WHERE "content_entries"."singleton_key" = 1;--> statement-breakpoint
CREATE TABLE `content_media_references` (
	`snapshot_id` text NOT NULL,
	`source_key` text NOT NULL,
	`field_path` text NOT NULL,
	`media_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`snapshot_id`, `source_key`, `field_path`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `content_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `content_media_references_media_idx` ON `content_media_references` (`media_id`);--> statement-breakpoint
CREATE TABLE `content_models` (
	`key` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`config_version` integer NOT NULL,
	`structure_hash` text NOT NULL,
	`projection_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "content_models_kind_check" CHECK("content_models"."kind" in ('page', 'collection')),
	CONSTRAINT "content_models_config_version_check" CHECK("content_models"."config_version" > 0)
);
--> statement-breakpoint
CREATE TABLE `content_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`revision` integer NOT NULL,
	`slug` text,
	`title` text NOT NULL,
	`fields_json` text NOT NULL,
	`schema_version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `content_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "content_snapshots_revision_check" CHECK("content_snapshots"."revision" > 0),
	CONSTRAINT "content_snapshots_schema_version_check" CHECK("content_snapshots"."schema_version" > 0)
);
--> statement-breakpoint
CREATE INDEX `content_snapshots_entry_idx` ON `content_snapshots` (`entry_id`);--> statement-breakpoint
CREATE TABLE `idempotency_records` (
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`scope`, `key`)
);
--> statement-breakpoint
CREATE TABLE `installation_state` (
	`singleton_key` integer PRIMARY KEY NOT NULL,
	`setup_completed_at` integer,
	`setup_admin_user_id` text,
	CONSTRAINT "installation_state_singleton_key_check" CHECK("installation_state"."singleton_key" = 1)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`storage_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`metadata_json` text NOT NULL,
	`status` text NOT NULL,
	`last_error` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "media_status_check" CHECK("media"."status" in ('active', 'deleting', 'delete_failed')),
	CONSTRAINT "media_size_check" CHECK("media"."size" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_storage_key_unique` ON `media` (`storage_key`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`processed_at` integer,
	`locked_at` integer,
	`locked_by` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	CONSTRAINT "outbox_events_attempts_check" CHECK("outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `outbox_events_available_idx` ON `outbox_events` (`processed_at`,`locked_at`,`available_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_pending_site_build_idx` ON `outbox_events` (`type`) WHERE "outbox_events"."type" = 'site.build.requested' and "outbox_events"."processed_at" is null and "outbox_events"."locked_at" is null;--> statement-breakpoint
CREATE TABLE `published_routes` (
	`path` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `content_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `content_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `published_routes_entry_idx` ON `published_routes` (`entry_id`);--> statement-breakpoint
CREATE TABLE `published_state` (
	`singleton_key` integer PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "published_state_singleton_key_check" CHECK("published_state"."singleton_key" = 1),
	CONSTRAINT "published_state_version_check" CHECK("published_state"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `setup_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`claimed_email_hash` text,
	`claimed_at` integer,
	`consumed_at` integer
);
--> statement-breakpoint
CREATE TABLE `site_builds` (
	`id` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`target_version` integer NOT NULL,
	`published_snapshot_id` text,
	`provider_build_id` text,
	`requested_by` text NOT NULL,
	`requested_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`error` text,
	FOREIGN KEY (`published_snapshot_id`) REFERENCES `content_snapshots`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "site_builds_status_check" CHECK("site_builds"."status" in ('pending', 'running', 'succeeded', 'failed')),
	CONSTRAINT "site_builds_target_version_check" CHECK("site_builds"."target_version" >= 0)
);
--> statement-breakpoint
CREATE INDEX `site_builds_history_idx` ON `site_builds` (`requested_at`,`id`);