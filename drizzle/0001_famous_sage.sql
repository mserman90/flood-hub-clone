CREATE TABLE `alertHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`previousRiskLevel` enum('low','medium','high','critical'),
	`currentRiskLevel` enum('low','medium','high','critical') NOT NULL,
	`waterLevel` decimal(10,2),
	`message` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `alertHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alertSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`locationName` varchar(255) NOT NULL,
	`latitude` decimal(10,8) NOT NULL,
	`longitude` decimal(11,8) NOT NULL,
	`riskThreshold` enum('low','medium','high','critical') NOT NULL,
	`notificationChannels` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificationLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertHistoryId` int NOT NULL,
	`channel` enum('push','email','in-app') NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`recipientAddress` varchar(255),
	`errorMessage` text,
	`sentAt` timestamp,
	CONSTRAINT `notificationLogs_id` PRIMARY KEY(`id`)
);
