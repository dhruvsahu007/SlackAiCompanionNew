import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  status: text("status").notNull().default("available"), // available, away, busy, offline
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelMembers = pgTable("channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => channels.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: integer("author_id").notNull().references(() => users.id),
  channelId: integer("channel_id").references(() => channels.id),
  parentMessageId: integer("parent_message_id").references(() => messages.id),
  recipientId: integer("recipient_id").references(() => users.id), // for DMs
  aiAnalysis: jsonb("ai_analysis"), // stores tone, impact, clarity analysis
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id),
  suggestedReply: text("suggested_reply").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingNotes = pgTable("meeting_notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  channelId: integer("channel_id").references(() => channels.id),
  startMessageId: integer("start_message_id").references(() => messages.id),
  endMessageId: integer("end_message_id").references(() => messages.id),
  generatedBy: integer("generated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdChannels: many(channels),
  channelMemberships: many(channelMembers),
  messages: many(messages),
  generatedNotes: many(meetingNotes),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  creator: one(users, { fields: [channels.createdBy], references: [users.id] }),
  members: many(channelMembers),
  messages: many(messages),
  meetingNotes: many(meetingNotes),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
  channel: one(channels, { fields: [channelMembers.channelId], references: [channels.id] }),
  user: one(users, { fields: [channelMembers.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  author: one(users, { fields: [messages.authorId], references: [users.id] }),
  channel: one(channels, { fields: [messages.channelId], references: [channels.id] }),
  recipient: one(users, { fields: [messages.recipientId], references: [users.id] }),
  parentMessage: one(messages, { fields: [messages.parentMessageId], references: [messages.id] }),
  replies: many(messages),
  aiSuggestions: many(aiSuggestions),
}));

export const aiSuggestionsRelations = relations(aiSuggestions, ({ one }) => ({
  message: one(messages, { fields: [aiSuggestions.messageId], references: [messages.id] }),
}));

export const meetingNotesRelations = relations(meetingNotes, ({ one }) => ({
  channel: one(channels, { fields: [meetingNotes.channelId], references: [channels.id] }),
  startMessage: one(messages, { fields: [meetingNotes.startMessageId], references: [messages.id] }),
  endMessage: one(messages, { fields: [meetingNotes.endMessageId], references: [messages.id] }),
  generator: one(users, { fields: [meetingNotes.generatedBy], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingNotesSchema = createInsertSchema(meetingNotes).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAiSuggestion = z.infer<typeof insertAiSuggestionSchema>;

export type MeetingNotes = typeof meetingNotes.$inferSelect;
export type InsertMeetingNotes = z.infer<typeof insertMeetingNotesSchema>;

export type ChannelMember = typeof channelMembers.$inferSelect;
