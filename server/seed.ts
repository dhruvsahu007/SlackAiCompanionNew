import { db } from "./db";
import { users, channels, channelMembers, messages } from "@shared/schema";
import { storage } from "./storage";

// Hash password helper (simplified for seeding)
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDatabase() {
  try {
    console.log("Seeding database...");

    // Create users
    const hashedPassword = await hashPassword("password123");
    
    const userData = [
      {
        username: "alice",
        email: "alice@company.com",
        displayName: "Alice Johnson",
        password: hashedPassword,
        status: "available",
        title: "Product Manager"
      },
      {
        username: "bob",
        email: "bob@company.com", 
        displayName: "Bob Smith",
        password: hashedPassword,
        status: "available",
        title: "Software Engineer"
      },
      {
        username: "charlie",
        email: "charlie@company.com",
        displayName: "Charlie Brown",
        password: hashedPassword,
        status: "away",
        title: "UI/UX Designer"
      },
      {
        username: "diana",
        email: "diana@company.com",
        displayName: "Diana Prince",
        password: hashedPassword,
        status: "busy",
        title: "DevOps Engineer"
      },
      {
        username: "mike",
        email: "mike@company.com",
        displayName: "Mike Wilson",
        password: hashedPassword,
        status: "available",
        title: "Data Scientist"
      }
    ];

    const createdUsers = [];
    for (const user of userData) {
      const [newUser] = await db.insert(users).values(user).returning();
      createdUsers.push(newUser);
      console.log(`Created user: ${newUser.displayName}`);
    }

    // Create channels
    const channelData = [
      {
        name: "general",
        description: "General team discussions",
        isPrivate: false,
        createdBy: createdUsers[0].id
      },
      {
        name: "project-atlas",
        description: "Project Atlas development discussions",
        isPrivate: false,
        createdBy: createdUsers[1].id
      },
      {
        name: "design-team",
        description: "Design team coordination",
        isPrivate: false,
        createdBy: createdUsers[2].id
      },
      {
        name: "engineering",
        description: "Engineering team discussions",
        isPrivate: false,
        createdBy: createdUsers[1].id
      }
    ];

    const createdChannels = [];
    for (const channel of channelData) {
      const [newChannel] = await db.insert(channels).values(channel).returning();
      createdChannels.push(newChannel);
      console.log(`Created channel: #${newChannel.name}`);

      // Add all users to public channels
      for (const user of createdUsers) {
        await db.insert(channelMembers).values({
          channelId: newChannel.id,
          userId: user.id
        });
      }
    }

    // Create messages for each channel
    const messageTemplates = {
      general: [
        { author: 0, content: "Good morning everyone! Hope you're all having a great start to the week. 🌟" },
        { author: 1, content: "Morning Alice! Just finished reviewing the quarterly metrics. Looking solid!" },
        { author: 2, content: "Hey team! I've updated the design system documentation. Check it out when you get a chance." },
        { author: 3, content: "Infrastructure updates completed successfully last night. Everything running smoothly." },
        { author: 4, content: "Data pipeline optimization is showing 40% performance improvement. Great work everyone!" },
        { author: 0, content: "Fantastic updates all around! Let's keep this momentum going." }
      ],
      "project-atlas": [
        { author: 1, content: "Project Atlas sprint planning meeting scheduled for tomorrow at 2 PM. Please review the backlog items." },
        { author: 0, content: "I've prioritized the user authentication features for this sprint. They're critical for the MVP." },
        { author: 2, content: "Working on the wireframes for the new dashboard. Should have initial designs ready by Wednesday." },
        { author: 1, content: "API endpoints for user management are 80% complete. Testing phase starts Thursday." },
        { author: 4, content: "Database optimization for Atlas is complete. We're seeing 3x faster query performance." },
        { author: 3, content: "Deployment pipeline for Atlas is ready. We can push to staging anytime." },
        { author: 0, content: "Excellent progress! We're on track for the beta release next month." },
        { author: 1, content: "Should we schedule a demo session for stakeholders? The core features are looking great." }
      ],
      "design-team": [
        { author: 2, content: "Updated the color palette based on accessibility feedback. New contrast ratios meet WCAG 2.1 AA standards." },
        { author: 0, content: "Love the new color scheme! Much more accessible and still maintains our brand identity." },
        { author: 2, content: "Working on mobile-first designs for the Atlas dashboard. Touch targets are all 44px minimum." },
        { author: 4, content: "The data visualization components look amazing! Users will love the new charts." },
        { author: 2, content: "Thanks Mike! I've been collaborating with the data team to ensure optimal UX for complex datasets." }
      ],
      engineering: [
        { author: 1, content: "Code review for the authentication module is complete. Looks solid, just minor suggestions." },
        { author: 3, content: "Kubernetes cluster auto-scaling is working perfectly. No more late-night scaling alerts!" },
        { author: 1, content: "Implementing OAuth 2.0 for Atlas. Should improve security and user experience significantly." },
        { author: 3, content: "CI/CD pipeline improvements reduced deployment time from 45 minutes to 8 minutes." },
        { author: 4, content: "Machine learning model for user behavior prediction is trained and ready for integration." },
        { author: 1, content: "Great work on the ML integration Mike! The recommendation engine will be a game-changer." }
      ]
    };

    // Insert messages
    for (const [channelName, channelMessages] of Object.entries(messageTemplates)) {
      const channel = createdChannels.find(c => c.name === channelName);
      if (!channel) continue;

      for (const msg of channelMessages) {
        const messageData = {
          content: msg.content,
          authorId: createdUsers[msg.author].id,
          channelId: channel.id,
          parentMessageId: null,
          recipientId: null,
          aiAnalysis: null
        };

        await db.insert(messages).values(messageData);
      }
      console.log(`Added ${channelMessages.length} messages to #${channelName}`);
    }

    // Create some direct messages
    const dmMessages = [
      {
        content: "Hey Bob, could you review the authentication flow when you get a chance?",
        authorId: createdUsers[0].id, // Alice
        recipientId: createdUsers[1].id, // Bob
        channelId: null,
        parentMessageId: null,
        aiAnalysis: null
      },
      {
        content: "Sure Alice! I'll take a look this afternoon and get back to you with feedback.",
        authorId: createdUsers[1].id, // Bob
        recipientId: createdUsers[0].id, // Alice
        channelId: null,
        parentMessageId: null,
        aiAnalysis: null
      },
      {
        content: "Thanks for the design feedback on the Atlas project. The new mockups look fantastic!",
        authorId: createdUsers[4].id, // Mike
        recipientId: createdUsers[2].id, // Charlie
        channelId: null,
        parentMessageId: null,
        aiAnalysis: null
      },
      {
        content: "Glad you like them! I'm excited to see how users interact with the new interface.",
        authorId: createdUsers[2].id, // Charlie
        recipientId: createdUsers[4].id, // Mike
        channelId: null,
        parentMessageId: null,
        aiAnalysis: null
      }
    ];

    for (const dmMsg of dmMessages) {
      await db.insert(messages).values(dmMsg);
    }
    console.log(`Added ${dmMessages.length} direct messages`);

    console.log("Database seeding completed successfully!");
    console.log("\nTest accounts (all passwords: password123):");
    createdUsers.forEach(user => {
      console.log(`- ${user.username} (${user.displayName}) - ${user.title}`);
    });

  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Run seeding if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  seedDatabase().then(() => {
    console.log("Seeding complete");
    process.exit(0);
  }).catch(error => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}

export { seedDatabase };