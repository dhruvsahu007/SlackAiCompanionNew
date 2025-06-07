import OpenAI from "openai";

// Initialize OpenAI with proper error handling
let openai: OpenAI;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured in environment variables");
  }
  openai = new OpenAI({ apiKey });
  console.log("[OpenAI] Successfully initialized with API key");
} catch (error) {
  console.error("[OpenAI] Initialization error:", error);
  throw error;
}

export interface ToneAnalysis {
  tone: string;
  impact: string;
  clarity: string;
  confidence: number;
  suggestions?: string[];
  suggestedTones: string[];
  explanation: string;
}

export interface ReplyGeneration {
  suggestions: Array<{
    suggestedReply: string;
    confidence: number;
    reasoning: string;
  }>;
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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert communication analyst. Analyze the tone, impact, and clarity of messages and provide improvement suggestions.
          Your analysis should be thorough and include:
          1. Current tone identification
          2. Impact assessment
          3. Clarity evaluation
          4. Specific suggestions for improvement
          5. Alternative tone suggestions that would be more appropriate

          Respond with JSON in this format: 
          { 
            "tone": "string (professional, casual, urgent, friendly, aggressive, etc.)", 
            "impact": "string (high, medium, low)",
            "clarity": "string (clear, somewhat clear, needs clarity)",
            "confidence": number (0-100),
            "suggestions": ["array of improvement suggestions"],
            "suggestedTones": ["array of 2-3 alternative tones that might be more appropriate"],
            "explanation": "string explaining why these tones would be better"
          }`
        },
        {
          role: "user",
          content: `Analyze this message: "${content}"`
        }
      ]
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      tone: result.tone || "neutral",
      impact: result.impact || "medium",
      clarity: result.clarity || "clear",
      confidence: Math.max(0, Math.min(100, result.confidence || 70)),
      suggestions: result.suggestions || [],
      suggestedTones: result.suggestedTones || [],
      explanation: result.explanation || ""
    };
  } catch (error) {
    console.error("Failed to analyze tone:", error);
    return {
      tone: "neutral",
      impact: "medium", 
      clarity: "clear",
      confidence: 0,
      suggestions: [],
      suggestedTones: [],
      explanation: ""
    };
  }
}

export async function generateReply(
  messageContent: string, 
  threadContext: string[], 
  orgContext: string,
  generateMultiple: boolean = false
): Promise<ReplyGeneration> {
  try {
    console.log("[AI Reply] Generating reply with:", {
      messageContent,
      threadContext,
      orgContext,
      generateMultiple
    });

    const contextPrompt = `
    Thread context: ${threadContext.join('\n')}
    Organizational context: ${orgContext}
    `;

    if (!process.env.OPENAI_API_KEY) {
      console.error("[AI Reply] Error: OpenAI API key is not set");
      throw new Error("OpenAI API key is not configured");
    }

    console.log("[AI Reply] Making OpenAI API request...");
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant helping to compose professional, contextually appropriate messages in a workplace chat.
            Consider the thread context and channel information to generate helpful, relevant responses.
            
            When composing messages:
            1. Consider the channel's purpose and recent conversation context
            2. Maintain a professional and appropriate tone
            3. Be concise but informative
            4. Include relevant details from the context
            5. Keep the message focused and on-topic for the channel
            
            You must respond with valid JSON only in this exact format:
            {
              "suggestions": [
                {
                  "suggestedReply": "string (the suggested response)",
                  "confidence": number (0-100),
                  "reasoning": "string (why this message is appropriate)"
                }
                // Generate 3 different suggestions with varying tones and approaches
              ]
            }
            Do not include any other text or explanation outside the JSON.`
          },
          {
            role: "user",
            content: `Generate ${generateMultiple ? "3 different" : "1"} message(s) for this context:\n\n${contextPrompt}`
          },
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      console.log("[AI Reply] Received OpenAI response");
      
      try {
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }
        
        const result = JSON.parse(content.trim());
        console.log("[AI Reply] Parsed response:", result);

        if (!Array.isArray(result.suggestions)) {
          throw new Error("OpenAI response did not include suggestions array");
        }

        return {
          suggestions: result.suggestions.map((suggestion: any) => ({
            suggestedReply: suggestion.suggestedReply,
            confidence: Math.max(0, Math.min(100, suggestion.confidence || 70)),
            reasoning: suggestion.reasoning || "Standard professional response"
          }))
        };
      } catch (parseError) {
        console.error("[AI Reply] Failed to parse OpenAI response:", parseError);
        console.error("[AI Reply] Raw response:", response.choices[0].message.content);
        throw new Error("Failed to parse AI response");
      }
    } catch (apiError) {
      console.error("[AI Reply] OpenAI API error:", apiError);
      if (apiError instanceof Error) {
        if (apiError.message.includes('API key')) {
          throw new Error("Invalid OpenAI API key");
        }
        throw new Error(`OpenAI API error: ${apiError.message}`);
      }
      throw new Error("Failed to communicate with OpenAI API");
    }
  } catch (error) {
    console.error("[AI Reply] Error details:", error);
    throw error;
  }
}

export async function queryOrgMemory(
  query: string,
  relevantMessages: Array<{ content: string; channelName: string; authorName: string; timestamp: string }>
): Promise<OrgMemoryQuery> {
  try {
    console.log("[AI] Processing org memory query:", query);
    console.log("[AI] Processing", relevantMessages.length, "relevant messages");

    const messagesContext = relevantMessages.map(msg => 
      `[${msg.channelName}] ${msg.authorName} (${msg.timestamp}): ${msg.content}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI organizational memory assistant. Analyze relevant messages and provide comprehensive summaries.
          IMPORTANT: Your response must be a valid JSON object with no additional text or explanations.
          Required JSON format:
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
      temperature: 0.7,
    });

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from OpenAI");
    }

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      console.log("[AI] Successfully parsed org memory response");
      
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
    } catch (parseError) {
      console.error("[AI] Failed to parse OpenAI response:", parseError);
      console.error("[AI] Raw response:", response.choices[0].message.content);
      throw new Error("Failed to parse AI response");
    }
  } catch (error) {
    console.error("[AI] Failed to query org memory:", error);
    if (error instanceof Error) {
      console.error("[AI] Error details:", error.message);
    }
    throw error;
  }
}

export async function generateMeetingNotes(
  messages: Array<{ content: string; authorName: string; timestamp: string }>,
  channelName: string
): Promise<MeetingNotesGeneration> {
  try {
    console.log("[AI] Generating meeting notes for channel:", channelName);
    console.log("[AI] Processing", messages.length, "messages");

    if (!messages.length) {
      console.warn("[AI] No messages provided for meeting notes generation");
      throw new Error("No messages available to generate notes from");
    }

    const messagesText = messages.map(msg => 
      `${msg.authorName} (${msg.timestamp}): ${msg.content}`
    ).join('\n');

    console.log("[AI] Calling OpenAI API for meeting notes generation");
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI meeting notes generator. Analyze the following conversation thread and extract key information.
          IMPORTANT: Your response must be a valid JSON object with no additional text or explanations.
          Required JSON format:
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
          content: `Generate structured meeting notes from this ${channelName} conversation:\n\n${messagesText}`
        },
      ],
      temperature: 0.7,
    });

    console.log("[AI] Successfully received response from OpenAI");
    
    if (!response.choices[0].message.content) {
      console.error("[AI] Empty response from OpenAI");
      throw new Error("Failed to generate meeting notes: Empty response from AI");
    }

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      console.log("[AI] Successfully parsed response:", result);

      if (!result.title || !result.summary) {
        throw new Error("Invalid response format from OpenAI");
      }

      return {
        title: result.title,
        summary: result.summary,
        keyPoints: result.keyPoints || [],
        actionItems: result.actionItems || [],
        participants: result.participants || [],
        decisions: result.decisions || []
      };
    } catch (parseError) {
      console.error("[AI] Failed to parse OpenAI response:", parseError);
      console.error("[AI] Raw response:", response.choices[0].message.content);
      throw new Error("Failed to parse AI response. Please try again.");
    }
  } catch (error) {
    console.error("[AI] Failed to generate meeting notes:", error);
    if (error instanceof Error) {
      console.error("[AI] Error details:", error.message);
      console.error("[AI] Error stack:", error.stack);
    }
    throw error; // Re-throw to let the route handler handle the error
  }
}
