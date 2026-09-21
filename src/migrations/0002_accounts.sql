CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`created_at` text NOT NULL
);

CREATE UNIQUE INDEX `accounts_number_idx` ON `accounts` (`number`);

ALTER TABLE `trips` ADD COLUMN `account_id` text REFERENCES `accounts`(`id`) ON DELETE cascade;
ALTER TABLE `trips` ADD COLUMN `edit_token` text;
ALTER TABLE `trips` ADD COLUMN `view_token` text;

UPDATE `trips` SET `edit_token` = lower(hex(randomblob(16))) WHERE `edit_token` IS NULL;
UPDATE `trips` SET `view_token` = lower(hex(randomblob(16))) WHERE `view_token` IS NULL;

CREATE UNIQUE INDEX `trips_edit_token_idx` ON `trips` (`edit_token`);
CREATE UNIQUE INDEX `trips_view_token_idx` ON `trips` (`view_token`);
CREATE INDEX `trips_account_idx` ON `trips` (`account_id`);
