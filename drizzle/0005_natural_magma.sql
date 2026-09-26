CREATE TABLE `sightingComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sightingId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(160) NOT NULL,
	`authorRole` enum('coordinator','volunteer') NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sightingComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sightingEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sightingId` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`storageKey` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sightingEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sightings` ADD `urgent` int DEFAULT 0 NOT NULL;