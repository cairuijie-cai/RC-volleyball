CREATE TABLE `training_viewers` (
	`owner_id` text NOT NULL,
	`user_id` text NOT NULL,
	`student_id` text,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`visits` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`owner_id`, `user_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_viewers_student_unique` ON `training_viewers` (`owner_id`,`student_id`);