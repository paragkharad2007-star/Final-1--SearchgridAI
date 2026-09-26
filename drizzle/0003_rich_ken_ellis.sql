CREATE TABLE `volunteerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`emergencyContact` varchar(160) NOT NULL,
	`skills` text NOT NULL,
	`availability` enum('available','unavailable') NOT NULL DEFAULT 'available',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`assignedZone` varchar(80),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `volunteerProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `volunteerProfiles_userId_unique` UNIQUE(`userId`)
);
