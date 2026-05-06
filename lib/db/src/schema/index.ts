import { pgTable, serial, text, timestamp, numeric, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Users table
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  requiresPasswordChange: boolean("requires_password_change").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// MetalPrices table — Gold only (purity = 'standard', price per gram)
export const metalPricesTable = pgTable("metal_prices", {
  id: serial("id").primaryKey(),
  metalType: text("metal_type", { enum: ["gold", "silver", "platinum"] }).notNull(),
  purity: text("purity").notNull().default("standard"),
  pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMetalPriceSchema = createInsertSchema(metalPricesTable).omit({ id: true, updatedAt: true });
export type InsertMetalPrice = z.infer<typeof insertMetalPriceSchema>;
export type MetalPrice = typeof metalPricesTable.$inferSelect;

// AppSettings table — key-value store for admin-editable settings
export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: numeric("value", { precision: 12, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppSettingSchema = createInsertSchema(appSettingsTable).omit({ id: true, updatedAt: true });
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettingsTable.$inferSelect;

// PriceHistory table
export const priceHistoryTable = pgTable("price_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metalType: text("metal_type").notNull(),
  purity: text("purity").notNull().default("standard"),
  metalWeight: numeric("metal_weight", { precision: 10, scale: 4 }).notNull(),
  centerDiamondWeight: numeric("center_diamond_weight", { precision: 10, scale: 4 }).notNull(),
  sideDiamondWeight: numeric("side_diamond_weight", { precision: 10, scale: 4 }).notNull(),
  totalPrice: numeric("total_price", { precision: 14, scale: 4 }).notNull(),
  breakdown: json("breakdown").notNull(),
});

export const insertPriceHistorySchema = createInsertSchema(priceHistoryTable).omit({ id: true, timestamp: true });
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistoryTable.$inferSelect;
