CREATE TABLE `game_events` (
	`key` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`seq` integer NOT NULL,
	`target` integer,
	`payload` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_room_seq` ON `game_events` (`room`,`seq`);--> statement-breakpoint
CREATE INDEX `events_created` ON `game_events` (`created`);--> statement-breakpoint
CREATE TABLE `game_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`nonce` text NOT NULL,
	`state` text NOT NULL,
	`updated` integer NOT NULL,
	`expires` integer NOT NULL
);
