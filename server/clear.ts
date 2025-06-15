import { db } from "./db";
import { users, channels, channelMembers, messages, aiSuggestions, meetingNotes } from "@shared/schema";

async function clear() {
  try {
    // Delete in reverse order of dependencies
    await db.delete(meetingNotes);
    await db.delete(aiSuggestions);
    await db.delete(messages);
    await db.delete(channelMembers);
    await db.delete(channels);
    await db.delete(users);
    console.log("✅ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
  }
}

clear(); 