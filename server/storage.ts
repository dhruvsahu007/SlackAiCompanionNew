import { 
  users, channels, channelMembers, messages, aiSuggestions, meetingNotes,
  type User, type InsertUser, type Channel, type InsertChannel, 
  type Message, type InsertMessage, type AiSuggestion, type InsertAiSuggestion,
  type MeetingNotes, type InsertMeetingNotes, type ChannelMember
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, not } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: number, status: string): Promise<void>;

  // Channel methods
  getChannels(): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelByName(name: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  getChannelMembers(channelId: number): Promise<(ChannelMember & { user: User })[]>;
  addChannelMember(channelId: number, userId: number): Promise<void>;
  getUserChannels(userId: number): Promise<Channel[]>;

  // Message methods
  getChannelMessages(channelId: number, limit?: number): Promise<(Message & { author: User; replies?: (Message & { author: User })[] })[]>;
  getDirectMessages(userId1: number, userId2: number, limit?: number): Promise<(Message & { author: User })[]>;
  createMessage(message: InsertMessage): Promise<Message & { author: User }>;
  getMessageThread(parentId: number): Promise<(Message & { author: User })[]>;
  searchMessages(query: string, channelId?: number): Promise<(Message & { author: User; channel?: Channel })[]>;

  // AI methods
  createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion>;
  getAiSuggestions(messageId: number): Promise<AiSuggestion[]>;
  createMeetingNotes(notes: InsertMeetingNotes): Promise<MeetingNotes>;
  getMeetingNotes(channelId: number): Promise<(MeetingNotes & { generator: User })[]>;

  // Direct message users
  getDirectMessageUsers(userId: number): Promise<User[]>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStatus(id: number, status: string): Promise<void> {
    await db.update(users).set({ status }).where(eq(users.id, id));
  }

  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).where(eq(channels.isPrivate, false));
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async getChannelByName(name: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.name, name));
    return channel || undefined;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db
      .insert(channels)
      .values(channel)
      .returning();
    
    // Add creator as member
    await db.insert(channelMembers).values({
      channelId: newChannel.id,
      userId: channel.createdBy,
    });

    return newChannel;
  }

  async getChannelMembers(channelId: number): Promise<(ChannelMember & { user: User })[]> {
    return await db
      .select({
        id: channelMembers.id,
        channelId: channelMembers.channelId,
        userId: channelMembers.userId,
        joinedAt: channelMembers.joinedAt,
        user: users,
      })
      .from(channelMembers)
      .innerJoin(users, eq(channelMembers.userId, users.id))
      .where(eq(channelMembers.channelId, channelId));
  }

  async addChannelMember(channelId: number, userId: number): Promise<void> {
    await db.insert(channelMembers).values({ channelId, userId });
  }

  async getUserChannels(userId: number): Promise<Channel[]> {
    return await db
      .select({
        id: channels.id,
        name: channels.name,
        description: channels.description,
        isPrivate: channels.isPrivate,
        createdBy: channels.createdBy,
        createdAt: channels.createdAt,
      })
      .from(channels)
      .innerJoin(channelMembers, eq(channels.id, channelMembers.channelId))
      .where(eq(channelMembers.userId, userId));
  }

  async getChannelMessages(channelId: number, limit = 50): Promise<(Message & { author: User; replies?: (Message & { author: User })[] })[]> {
    const msgs = await db
      .select({
        id: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId,
        recipientId: messages.recipientId,
        aiAnalysis: messages.aiAnalysis,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        author: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(asc(messages.createdAt))
      .limit(limit);

    // Get replies for each message
    for (const msg of msgs) {
      const replies = await db
        .select({
          id: messages.id,
          content: messages.content,
          authorId: messages.authorId,
          channelId: messages.channelId,
          parentMessageId: messages.parentMessageId,
          recipientId: messages.recipientId,
          aiAnalysis: messages.aiAnalysis,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
          author: users,
        })
        .from(messages)
        .innerJoin(users, eq(messages.authorId, users.id))
        .where(eq(messages.parentMessageId, msg.id))
        .orderBy(asc(messages.createdAt));
      
      (msg as any).replies = replies;
    }

    return msgs as any;
  }

  async getDirectMessages(userId1: number, userId2: number, limit = 50): Promise<(Message & { author: User })[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId,
        recipientId: messages.recipientId,
        aiAnalysis: messages.aiAnalysis,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        author: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorId, users.id))
      .where(
        and(
          eq(messages.channelId, null),
          or(
            and(eq(messages.authorId, userId1), eq(messages.recipientId, userId2)),
            and(eq(messages.authorId, userId2), eq(messages.recipientId, userId1))
          )
        )
      )
      .orderBy(asc(messages.createdAt))
      .limit(limit);
  }

  async createMessage(message: InsertMessage): Promise<Message & { author: User }> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    const [messageWithAuthor] = await db
      .select({
        id: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId,
        recipientId: messages.recipientId,
        aiAnalysis: messages.aiAnalysis,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        author: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.id, newMessage.id));

    return messageWithAuthor;
  }

  async getMessageThread(parentId: number): Promise<(Message & { author: User })[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId,
        recipientId: messages.recipientId,
        aiAnalysis: messages.aiAnalysis,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        author: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorId, users.id))
      .where(eq(messages.parentMessageId, parentId))
      .orderBy(asc(messages.createdAt));
  }

  async searchMessages(query: string, channelId?: number): Promise<(Message & { author: User; channel?: Channel })[]> {
    let queryBuilder = db
      .select({
        id: messages.id,
        content: messages.content,
        authorId: messages.authorId,
        channelId: messages.channelId,
        parentMessageId: messages.parentMessageId,
        recipientId: messages.recipientId,
        aiAnalysis: messages.aiAnalysis,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        author: users,
        channel: channels,
      })
      .from(messages)
      .innerJoin(users, eq(messages.authorId, users.id))
      .leftJoin(channels, eq(messages.channelId, channels.id));

    if (channelId) {
      queryBuilder = queryBuilder.where(
        and(
          eq(messages.channelId, channelId),
          // Note: In a real app, you'd use proper full-text search
          // This is a simple LIKE search for demo purposes
        )
      );
    }

    return await queryBuilder.orderBy(desc(messages.createdAt)).limit(20);
  }

  async createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const [newSuggestion] = await db
      .insert(aiSuggestions)
      .values(suggestion)
      .returning();
    return newSuggestion;
  }

  async getAiSuggestions(messageId: number): Promise<AiSuggestion[]> {
    return await db
      .select()
      .from(aiSuggestions)
      .where(eq(aiSuggestions.messageId, messageId))
      .orderBy(desc(aiSuggestions.confidence));
  }

  async createMeetingNotes(notes: InsertMeetingNotes): Promise<MeetingNotes> {
    const [newNotes] = await db
      .insert(meetingNotes)
      .values(notes)
      .returning();
    return newNotes;
  }

  async getMeetingNotes(channelId: number): Promise<(MeetingNotes & { generator: User })[]> {
    return await db
      .select({
        id: meetingNotes.id,
        title: meetingNotes.title,
        content: meetingNotes.content,
        channelId: meetingNotes.channelId,
        startMessageId: meetingNotes.startMessageId,
        endMessageId: meetingNotes.endMessageId,
        generatedBy: meetingNotes.generatedBy,
        createdAt: meetingNotes.createdAt,
        generator: users,
      })
      .from(meetingNotes)
      .innerJoin(users, eq(meetingNotes.generatedBy, users.id))
      .where(eq(meetingNotes.channelId, channelId))
      .orderBy(desc(meetingNotes.createdAt));
  }

  async getDirectMessageUsers(userId: number): Promise<User[]> {
    // Get all users except the current user for DM conversations
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        email: users.email,
        displayName: users.displayName,
        avatar: users.avatar,
        status: users.status,
        title: users.title,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(not(eq(users.id, userId)));

    return allUsers;
  }
}

export const storage = new DatabaseStorage();
