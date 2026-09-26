ALTER TABLE `sightings` ADD `status` enum('new','under_review','verified','rejected') DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `sightings` ADD `latitude` double;--> statement-breakpoint
ALTER TABLE `sightings` ADD `longitude` double;--> statement-breakpoint
ALTER TABLE `sightings` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `sightings` ADD `reviewedAt` timestamp;