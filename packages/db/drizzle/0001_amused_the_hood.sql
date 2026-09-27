CREATE TABLE `readiness_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text NOT NULL,
	`test_plan_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`minimum_score` integer,
	`maximum_p95_ms` integer,
	`maximum_p99_ms` integer,
	`maximum_error_rate_percent` integer,
	`minimum_throughput_rps` integer,
	`maximum_timeouts` integer,
	`fail_on_hard_cap` integer DEFAULT false NOT NULL,
	`minimum_confidence` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`activated_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`test_plan_id`) REFERENCES `test_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `baselines` (
	`id` text PRIMARY KEY NOT NULL,
	`test_plan_id` text NOT NULL,
	`project_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`run_id` text NOT NULL,
	`promoted_by` text NOT NULL,
	`promoted_at` integer NOT NULL,
	`reason` text,
	`revoked_at` integer,
	`revoked_by` text,
	FOREIGN KEY (`test_plan_id`) REFERENCES `test_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `test_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX `email_codes_email_purpose_idx`;--> statement-breakpoint
DROP INDEX `email_codes_active_lookup_idx`;--> statement-breakpoint
ALTER TABLE `test_runs` ADD `policy_snapshot_json` text;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `email_verified_at`;