import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  venue: text("venue").notNull(),
  category: text("category").notNull(),
  capacity: integer("capacity").notNull(),
  registrationDeadline: timestamp("registration_deadline", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("upcoming"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  bannerUrl: text("banner_url"),
  organizerId: integer("organizer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
