CREATE TABLE `invite_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`max_uses` integer,
	`use_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invite_codes_hash` ON `invite_codes` (`code_hash`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`event_type` text NOT NULL,
	`scheduled_for` text,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notification_events_task_event` ON `notification_events` (`task_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`nickname` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "profiles_nickname_length" CHECK(length("profiles"."nickname") BETWEEN 2 AND 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_email` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `task_participants` (
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`leave_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`task_id`, `user_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_participants_status_value" CHECK("task_participants"."status" IN ('JOINED', 'MAYBE', 'DECLINED'))
);
--> statement-breakpoint
CREATE INDEX `idx_task_participants_task_status` ON `task_participants` (`task_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_task_participants_user_id` ON `task_participants` (`user_id`);--> statement-breakpoint
CREATE TABLE `task_watchers` (
	`task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`task_id`, `user_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'ETC' NOT NULL,
	`start_at` text NOT NULL,
	`deadline_at` text,
	`min_participants` integer NOT NULL,
	`max_participants` integer NOT NULL,
	`join_url` text,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tasks_min_participants" CHECK("tasks"."min_participants" >= 1),
	CONSTRAINT "tasks_max_participants" CHECK("tasks"."max_participants" >= "tasks"."min_participants"),
	CONSTRAINT "tasks_deadline_before_start" CHECK("tasks"."deadline_at" IS NULL OR "tasks"."deadline_at" <= "tasks"."start_at"),
	CONSTRAINT "tasks_status_value" CHECK("tasks"."status" IN ('OPEN', 'CANCELLED', 'COMPLETED'))
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_status_start_at` ON `tasks` (`status`,`start_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_creator_id` ON `tasks` (`creator_id`);