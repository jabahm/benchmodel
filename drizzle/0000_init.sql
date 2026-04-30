CREATE TABLE IF NOT EXISTS `providers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `base_url` text NOT NULL,
  `api_key_encrypted` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collections` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `format` text NOT NULL,
  `source_path` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `prompts` (
  `id` text PRIMARY KEY NOT NULL,
  `collection_id` text NOT NULL,
  `name` text NOT NULL,
  `system_prompt` text,
  `user_prompt` text NOT NULL,
  `variables_json` text,
  `assertions_json` text,
  `default_provider_id` text,
  `default_model` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `compare_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt_id` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `runs` (
  `id` text PRIMARY KEY NOT NULL,
  `prompt_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `model_name` text NOT NULL,
  `params_json` text,
  `output` text,
  `latency_ms` integer,
  `prompt_tokens` integer,
  `completion_tokens` integer,
  `cost_estimate` real,
  `assertions_passed` integer,
  `assertions_result_json` text,
  `seed` integer,
  `compare_session_id` text,
  `error_message` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
