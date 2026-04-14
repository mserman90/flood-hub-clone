CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationMode` enum('instant','daily','weekly','disabled') NOT NULL DEFAULT 'instant',
	`enablePush` boolean NOT NULL DEFAULT true,
	`enableEmail` boolean NOT NULL DEFAULT false,
	`enableInApp` boolean NOT NULL DEFAULT true,
	`summaryTime` varchar(5) DEFAULT '09:00',
	`summaryDay` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') DEFAULT 'monday',
	`minRiskLevel` enum('low','medium','high','critical') NOT NULL DEFAULT 'high',
	`quietHoursEnabled` boolean NOT NULL DEFAULT false,
	`quietHoursStart` varchar(5) DEFAULT '22:00',
	`quietHoursEnd` varchar(5) DEFAULT '08:00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
