import { db } from "./db";
import { users, channels, channelMembers, messages, aiSuggestions, meetingNotes } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    // Create users with hashed passwords
    const [alice, bob, charlie] = await Promise.all([
      db.insert(users).values({
        username: "alice",
        password: await hashPassword("password123"),
        email: "alice@example.com",
        displayName: "Alice Smith",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
        status: "available",
        title: "Product Manager"
      }).returning(),
      db.insert(users).values({
        username: "bob",
        password: await hashPassword("password123"),
        email: "bob@example.com",
        displayName: "Bob Johnson",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
        status: "available",
        title: "Software Engineer"
      }).returning(),
      db.insert(users).values({
        username: "charlie",
        password: await hashPassword("password123"),
        email: "charlie@example.com",
        displayName: "Charlie Brown",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
        status: "available",
        title: "UX Designer"
      }).returning()
    ]);

    // Create channels
    const [general, random, announcements] = await Promise.all([
      db.insert(channels).values({
        name: "general",
        description: "General discussion channel",
        isPrivate: false,
        createdBy: alice[0].id
      }).returning(),
      db.insert(channels).values({
        name: "random",
        description: "Random discussions and fun stuff",
        isPrivate: false,
        createdBy: bob[0].id
      }).returning(),
      db.insert(channels).values({
        name: "announcements",
        description: "Important announcements and updates",
        isPrivate: false,
        createdBy: alice[0].id
      }).returning()
    ]);

    // Add users to channels
    await Promise.all([
      // Add all users to general channel
      db.insert(channelMembers).values([
        { channelId: general[0].id, userId: alice[0].id },
        { channelId: general[0].id, userId: bob[0].id },
        { channelId: general[0].id, userId: charlie[0].id }
      ]),
      // Add all users to random channel
      db.insert(channelMembers).values([
        { channelId: random[0].id, userId: alice[0].id },
        { channelId: random[0].id, userId: bob[0].id },
        { channelId: random[0].id, userId: charlie[0].id }
      ]),
      // Add all users to announcements channel
      db.insert(channelMembers).values([
        { channelId: announcements[0].id, userId: alice[0].id },
        { channelId: announcements[0].id, userId: bob[0].id },
        { channelId: announcements[0].id, userId: charlie[0].id }
      ])
    ]);

    // Create some messages
    const [welcomeMsg, randomMsg, announcementMsg] = await Promise.all([
      db.insert(messages).values({
        content: "Welcome to our Slack AI Companion! 👋",
        authorId: alice[0].id,
        channelId: general[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning(),
      db.insert(messages).values({
        content: "Anyone up for a game of virtual chess? ♟️",
        authorId: bob[0].id,
        channelId: random[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning(),
      db.insert(messages).values({
        content: "Important: Team meeting tomorrow at 10 AM! 📅",
        authorId: alice[0].id,
        channelId: announcements[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning()
    ]);

    // Create some AI suggestions
    await db.insert(aiSuggestions).values({
      messageId: welcomeMsg[0].id,
      suggestedReply: "Thanks for the warm welcome! Excited to be here! 🎉",
      confidence: 85,
      reasoning: "Friendly and enthusiastic response to welcome message"
    });

    // Create a meeting note
    await db.insert(meetingNotes).values({
      title: "Weekly Team Sync",
      content: "1. Project updates\n2. Blockers discussion\n3. Next steps",
      channelId: general[0].id,
      startMessageId: welcomeMsg[0].id,
      endMessageId: announcementMsg[0].id,
      generatedBy: alice[0].id
    });

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seed();
