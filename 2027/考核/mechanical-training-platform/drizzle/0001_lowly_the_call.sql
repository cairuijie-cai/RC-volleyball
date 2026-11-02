CREATE TABLE `homework_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`student_id` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`content_type` text NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL
);
