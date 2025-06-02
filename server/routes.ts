import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertChannelSchema, 
  insertMessageSchema,
  insertMeetingNotesSchema
} from "@shared/schema";
import { 
  analyzeTone, 
  generateReply, 
  queryOrgMemory, 
  generateMeetingNotes 
} from "./ai";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Channels
  app.get("/api/channels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.get("/api/channels/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channel = await storage.getChannel(parseInt(req.params.id));
      if (!channel) return res.sendStatus(404);
      res.json(channel);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch channel" });
    }
  });

  app.post("/api/channels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channelData = insertChannelSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const channel = await storage.createChannel(channelData);
      res.status(201).json(channel);
    } catch (error) {
      res.status(400).json({ message: "Invalid channel data" });
    }
  });

  app.get("/api/channels/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channelId = parseInt(req.params.id);
      const messages = await storage.getChannelMessages(channelId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/channels/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channelId = parseInt(req.params.id);
      const members = await storage.getChannelMembers(channelId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post("/api/channels/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channelId = parseInt(req.params.id);
      await storage.addChannelMember(channelId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to join channel" });
    }
  });

  // Messages
  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });

      const message = await storage.createMessage(messageData);
      
      // Analyze tone in background
      if (messageData.content) {
        try {
          const contentStr = Array.isArray(messageData.content) ? messageData.content.join(' ') : String(messageData.content);
          analyzeTone(contentStr).then(analysis => {
            console.log("Tone analysis:", analysis);
          }).catch(console.error);
        } catch (err) {
          console.error("Tone analysis error:", err);
        }
      }

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  app.get("/api/messages/:id/thread", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const messageId = parseInt(req.params.id);
      const thread = await storage.getMessageThread(messageId);
      res.json(thread);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  app.get("/api/direct-messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getDirectMessages(req.user!.id, otherUserId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch direct messages" });
    }
  });

  app.get("/api/direct-message-users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const users = await storage.getDirectMessageUsers(req.user!.id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch DM users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // AI Features
  app.post("/api/ai/suggest-reply", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { messageContent, threadContext = [], orgContext = "" } = req.body;
      
      // Generate reply based on message content directly
      const suggestion = await generateReply(
        messageContent,
        threadContext,
        orgContext
      );

      // Store the suggestion (using dummy messageId for now)
      await storage.createAiSuggestion({
        messageId: 1,
        suggestedReply: suggestion.suggestedReply,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning
      });

      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate reply suggestion" });
    }
  });

  app.post("/api/ai/analyze-tone", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { content } = req.body;
      const analysis = await analyzeTone(content);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze tone" });
    }
  });

  app.post("/api/ai/org-memory", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { query } = req.body;
      
      // Search relevant messages across channels (simplified)
      const relevantMessages = await storage.searchMessages(query);
      
      const formattedMessages = relevantMessages.map(msg => ({
        content: msg.content,
        channelName: msg.channel?.name || "Direct Message",
        authorName: msg.author.displayName,
        timestamp: msg.createdAt.toISOString()
      }));

      const result = await queryOrgMemory(query, formattedMessages);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to query organizational memory" });
    }
  });

  app.post("/api/ai/generate-notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { channelId, startMessageId, endMessageId } = req.body;
      
      const channel = await storage.getChannel(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const messages = await storage.getChannelMessages(channelId);
      
      // Filter messages between start and end if specified
      let filteredMessages = messages;
      if (startMessageId && endMessageId) {
        const startIndex = messages.findIndex(m => m.id === startMessageId);
        const endIndex = messages.findIndex(m => m.id === endMessageId);
        if (startIndex !== -1 && endIndex !== -1) {
          filteredMessages = messages.slice(startIndex, endIndex + 1);
        }
      }

      const formattedMessages = filteredMessages.map(msg => ({
        content: msg.content,
        authorName: msg.author.displayName,
        timestamp: msg.createdAt.toISOString()
      }));

      const notes = await generateMeetingNotes(formattedMessages, channel.name);
      
      // Save the notes
      const savedNotes = await storage.createMeetingNotes({
        title: notes.title,
        content: JSON.stringify(notes),
        channelId,
        startMessageId: startMessageId || null,
        endMessageId: endMessageId || null,
        generatedBy: req.user!.id
      });

      res.json({ ...notes, id: savedNotes.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate meeting notes" });
    }
  });

  app.get("/api/channels/:id/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const channelId = parseInt(req.params.id);
      const notes = await storage.getMeetingNotes(channelId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meeting notes" });
    }
  });

  // Search
  app.get("/api/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { q: query, channelId } = req.query;
      if (!query) return res.json([]);
      
      const results = await storage.searchMessages(
        query as string, 
        channelId ? parseInt(channelId as string) : undefined
      );
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<WebSocket, { userId: number; channels: Set<number> }>();

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            // In a real app, verify the token/session
            clients.set(ws, { userId: message.userId, channels: new Set() });
            break;
            
          case 'join_channel':
            const clientData = clients.get(ws);
            if (clientData) {
              clientData.channels.add(message.channelId);
            }
            break;
            
          case 'leave_channel':
            const client = clients.get(ws);
            if (client) {
              client.channels.delete(message.channelId);
            }
            break;
            
          case 'new_message':
            // Broadcast message to all clients in the same channel
            clients.forEach((clientInfo, clientWs) => {
              if (clientWs !== ws && 
                  clientInfo.channels.has(message.channelId) &&
                  clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'new_message',
                  message: message.data
                }));
              }
            });
            break;
            
          case 'typing':
            // Broadcast typing indicator
            clients.forEach((clientInfo, clientWs) => {
              if (clientWs !== ws && 
                  clientInfo.channels.has(message.channelId) &&
                  clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'typing',
                  userId: message.userId,
                  channelId: message.channelId,
                  isTyping: message.isTyping
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
