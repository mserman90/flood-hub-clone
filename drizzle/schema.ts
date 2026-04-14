import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Alert Subscriptions - Kullaniciların sel uyarı abonelikleri
 */
export const alertSubscriptions = mysqlTable("alertSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  locationName: varchar("locationName", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  riskThreshold: mysqlEnum("riskThreshold", ["low", "medium", "high", "critical"]).notNull(),
  notificationChannels: json("notificationChannels").notNull().$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
export type InsertAlertSubscription = typeof alertSubscriptions.$inferInsert;

/**
 * Alert History - Tetiklenen uyarıların gecmisi
 */
export const alertHistory = mysqlTable("alertHistory", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(),
  previousRiskLevel: mysqlEnum("previousRiskLevel", ["low", "medium", "high", "critical"]),
  currentRiskLevel: mysqlEnum("currentRiskLevel", ["low", "medium", "high", "critical"]).notNull(),
  waterLevel: decimal("waterLevel", { precision: 10, scale: 2 }),
  message: text("message"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type AlertHistoryRecord = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

/**
 * Notification Logs - Gonderilen bildirimlerin kayitlari
 */
export const notificationLogs = mysqlTable("notificationLogs", {
  id: int("id").autoincrement().primaryKey(),
  alertHistoryId: int("alertHistoryId").notNull(),
  channel: mysqlEnum("channel", ["push", "email", "in-app"]).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  recipientAddress: varchar("recipientAddress", { length: 255 }),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;
/**
 * Notification Preferences - Kullanici bildirim tercihleri
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Bildirim modu: instant (anlık), daily (günlük özet), weekly (haftalık özet), disabled (kapalı)
  notificationMode: mysqlEnum("notificationMode", ["instant", "daily", "weekly", "disabled"]).default("instant").notNull(),
  // Hangi kanallarda bildirim alacak
  enablePush: boolean("enablePush").default(true).notNull(),
  enableEmail: boolean("enableEmail").default(false).notNull(),
  enableInApp: boolean("enableInApp").default(true).notNull(),
  // Bildirim zamanı (günlük/haftalık özet için)
  summaryTime: varchar("summaryTime", { length: 5 }).default("09:00"), // HH:mm format
  summaryDay: mysqlEnum("summaryDay", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).default("monday"), // Haftalık özet için
  // Bildirim seviyeleri
  minRiskLevel: mysqlEnum("minRiskLevel", ["low", "medium", "high", "critical"]).default("high").notNull(),
  // Sessiz saatler (bildirim gönderme)
  quietHoursEnabled: boolean("quietHoursEnabled").default(false).notNull(),
  quietHoursStart: varchar("quietHoursStart", { length: 5 }).default("22:00"), // HH:mm format
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }).default("08:00"), // HH:mm format
  // Tercihler
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
