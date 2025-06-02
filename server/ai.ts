import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ToneAnalysis {
  tone: string;
  impact: string;
  clarity: string;
  confidence: number;
  suggestions?: string[];
}

export interface ReplyGeneration {
  suggestedReply: string;
  confidence: number;
  reasoning: string;
}

export interface OrgMemoryQuery {
  query: string;
  summary: string;
  sources: Array<{
    channelName: string;
    messageCount: number;
    lastUpdate: string;
  }>;
  keyPoints: string[];
}

export interface MeetingNotesGeneration {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  participants: string[];
  decisions: string[];
}

export async function analyzeTone(content: string): Promise<ToneAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert communication analyst. Analyze the tone, impact, and clarity of messages. 
          Respond with JSON in this format: 
          { 
            "tone": "string (professional, casual, urgent, friendly, aggressive, etc.)", 
            "impact": "string (high, medium, low)",
            "clarity": "string (clear, somewhat clear, needs clarity)",
            "confidence": number (0-100),
            "suggestions": ["array of improvement suggestions if needed"]
          }`
        },
        {
          role: "user",
          content: `Analyze this message: "${content}"`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      tone: result.tone || "neutral",
      impact: result.impact || "medium",
      clarity: result.clarity || "clear",
      confidence: Math.max(0, Math.min(100, result.confidence || 70)),
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error("Failed to analyze tone:", error);
    return {
      tone: "neutral",
      impact: "medium", 
      clarity: "clear",
      confidence: 0
    };
  }
}

export async function generateReply(
  messageContent: string, 
  threadContext: string[], 
  orgContext: string
): Promise<ReplyGeneration> {
  try {
    const contextPrompt = `
    Thread context: ${threadContext.join('\n')}
    Organizational context: ${orgContext}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping to compose professional, contextually appropriate replies in a workplace chat.
          Consider the thread context and organizational knowledge to generate helpful responses.
          Respond with JSON in this format:
          {
            "suggestedReply": "string (the suggested response)",
            "confidence": number (0-100),
            "reasoning": "string (why this reply is appropriate)"
          }`
        },
        {
          role: "user",
          content: `Generate a reply to: "${messageContent}"\n\n${contextPrompt}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      suggestedReply: result.suggestedReply || "Thank you for the update.",
      confidence: Math.max(0, Math.min(100, result.confidence || 70)),
      reasoning: result.reasoning || "Standard professional response"
    };
  } catch (error) {
    console.error("Failed to generate reply:", error);
    return {
      suggestedReply: "Thank you for the update.",
      confidence: 0,
      reasoning: "Error occurred during generation"
    };
  }
}

export async function queryOrgMemory(
  query: string,
  relevantMessages: Array<{ content: string; channelName: string; authorName: string; timestamp: string }>
): Promise<OrgMemoryQuery> {
  try {
    const messagesContext = relevantMessages.map(msg => 
      `[${msg.channelName}] ${msg.authorName} (${msg.timestamp}): ${msg.content}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI organizational memory assistant. Analyze relevant messages and provide comprehensive summaries.
          Respond with JSON in this format:
          {
            "query": "string (the original query)",
            "summary": "string (comprehensive summary)",
            "sources": [{"channelName": "string", "messageCount": number, "lastUpdate": "string"}],
            "keyPoints": ["array of key points"]
          }`
        },
        {
          role: "user",
          content: `Query: "${query}"\n\nRelevant messages:\n${messagesContext}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Process sources
    const sourceChannels = new Map();
    relevantMessages.forEach(msg => {
      if (!sourceChannels.has(msg.channelName)) {
        sourceChannels.set(msg.channelName, { count: 0, lastUpdate: msg.timestamp });
      }
      sourceChannels.get(msg.channelName).count++;
      if (msg.timestamp > sourceChannels.get(msg.channelName).lastUpdate) {
        sourceChannels.get(msg.channelName).lastUpdate = msg.timestamp;
      }
    });

    const sources = Array.from(sourceChannels.entries()).map(([name, data]) => ({
      channelName: name,
      messageCount: data.count,
      lastUpdate: data.lastUpdate
    }));

    return {
      query,
      summary: result.summary || "No relevant information found.",
      sources,
      keyPoints: result.keyPoints || []
    };
  } catch (error) {
    console.error("Failed to query org memory:", error);
    return {
      query,
      summary: "Error occurred while processing your query.",
      sources: [],
      keyPoints: []
    };
  }
}

export async function generateMeetingNotes(
  messages: Array<{ content: string; authorName: string; timestamp: string }>,
  channelName: string
): Promise<MeetingNotesGeneration> {
  try {
    const messagesText = messages.map(msg => 
      `${msg.authorName} (${msg.timestamp}): ${msg.content}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI meeting notes generator. Extract key information from conversation threads.
          Respond with JSON in this format:
          {
            "title": "string (meeting title)",
            "summary": "string (brief summary)",
            "keyPoints": ["array of key discussion points"],
            "actionItems": ["array of action items"],
            "participants": ["array of participant names"],
            "decisions": ["array of decisions made"]
          }`
        },
        {
          role: "user",
          content: `Generate meeting notes from this ${channelName} conversation:\n\n${messagesText}`
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      title: result.title || `${channelName} Discussion`,
      summary: result.summary || "Discussion summary",
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      participants: result.participants || [],
      decisions: result.decisions || []
    };
  } catch (error) {
    console.error("Failed to generate meeting notes:", error);
    return {
      title: `${channelName} Discussion`,
      summary: "Error occurred while generating notes.",
      keyPoints: [],
      actionItems: [],
      participants: [],
      decisions: []
    };
  }
}
