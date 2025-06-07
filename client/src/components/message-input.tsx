import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bold, 
  Italic, 
  Link, 
  Code, 
  Paperclip, 
  Smile, 
  AtSign, 
  Send,
  Brain,
  Target,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertMessageSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MessageInputProps {
  channelId: number | null;
  recipientId: number | null;
  onMessageSent?: (message: any) => void;
}

export function MessageInput({ channelId, recipientId, onMessageSent }: MessageInputProps) {
  const { user } = useAuth();
  const { sendTyping, broadcastMessage } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [toneAnalysis, setToneAnalysis] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      return response.json();
    },
    onSuccess: (message) => {
      setContent("");
      setToneAnalysis(null);
      
      // Invalidate queries to refresh messages
      if (channelId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/channels", channelId, "messages"]
        });
        // Broadcast to channel
        broadcastMessage(channelId, message);
      } else if (recipientId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/direct-messages", recipientId]
        });
        // Broadcast DM with recipientId
        broadcastMessage(0, { ...message, recipientId }); // Use channelId 0 to indicate DM
      }

      onMessageSent?.(message);
      
      toast({
        title: "Message sent",
        description: "Your message has been delivered",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    }
  });

  // Tone analysis mutation
  const toneAnalysisMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest("POST", "/api/ai/analyze-tone", { content: text });
      return response.json();
    },
    onSuccess: (analysis) => {
      setToneAnalysis(analysis);
    }
  });

  // AI compose mutation
  const aiComposeMutation = useMutation({
    mutationFn: async () => {
      if (!channelId) throw new Error("No channel selected");

      // Get last 5 messages for context
      const contextMessages = await apiRequest("GET", `/api/channels/${channelId}/messages?limit=5`);
      const messagesData = await contextMessages.json();
      
      const response = await apiRequest("POST", "/api/ai/suggest-reply", {
        messageContent: "Compose a new message",
        threadContext: messagesData.map((msg: any) => msg.content),
        orgContext: `Channel: ${channelId}`,
        generateMultiple: true
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate message");
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (result) => {
      // Use the first suggestion by default
      if (result.suggestions && result.suggestions.length > 0) {
        const firstSuggestion = result.suggestions[0];
        setContent(firstSuggestion.suggestedReply);
        handleToneAnalysis(firstSuggestion.suggestedReply);
        toast({
          title: "Message Composed",
          description: "AI has suggested a message based on the channel context",
        });
      } else {
        throw new Error("No suggestions received");
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to compose message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  const handleToneAnalysis = useCallback((text: string) => {
    if (text.trim().length > 10) {
      toneAnalysisMutation.mutate(text);
    } else {
      setToneAnalysis(null);
    }
  }, [toneAnalysisMutation]);

  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Handle typing indicator
    if (channelId && user) {
      sendTyping(channelId, value.length > 0);
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(channelId, false);
      }, 1000);
    }

    // Debounced tone analysis
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleToneAnalysis(value);
    }, 500);
  };

  const handleSend = () => {
    if (!content.trim() || sendMessageMutation.isPending) return;
    
    try {
      const messageData = {
        content: content.trim(),
        channelId: channelId || undefined,
        recipientId: recipientId || undefined,
        parentMessageId: null
      };

      sendMessageMutation.mutate(messageData);
    } catch (error) {
      toast({
        title: "Invalid message",
        description: "Please check your message and try again",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone?.toLowerCase()) {
      case 'professional': return 'text-green-400';
      case 'casual': return 'text-blue-400';
      case 'urgent': return 'text-red-400';
      case 'friendly': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const placeholder = channelId 
    ? `Message #${channelId}` 
    : `Message user`;

  return (
    <div className="bg-slate-800 border-t border-slate-700 p-4">
      <div className="relative">
        {aiComposeMutation.data?.suggestions && showSuggestions && (
          <div className="absolute bottom-full mb-2 w-full bg-slate-900 rounded-lg border border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">AI Suggestions</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </Button>
            </div>
            {aiComposeMutation.data.suggestions.map((suggestion: any, index: number) => (
              <div key={index} className="bg-slate-800 rounded-lg p-3">
                <p className="text-sm text-slate-300 mb-2">{suggestion.suggestedReply}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setContent(suggestion.suggestedReply);
                    handleToneAnalysis(suggestion.suggestedReply);
                    setShowSuggestions(false);
                  }}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Use this suggestion
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-300 focus-within:border-blue-500 transition-colors">
          {/* Formatting Toolbar */}
          <div className="flex items-center p-3 border-b border-gray-200">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
              <Link className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
              <Code className="h-4 w-4" />
            </Button>
            
            <div className="ml-auto flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  aiComposeMutation.mutate();
                  setShowSuggestions(true);
                }}
                disabled={aiComposeMutation.isPending}
                className="bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                {aiComposeMutation.isPending ? (
                  <>
                    <span className="animate-pulse">Composing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-1" />
                    AI Compose
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Message Input */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              handleContentChange(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="w-full p-3 text-gray-900 bg-white placeholder-gray-500 resize-none border-0 focus:ring-0 focus:outline-none min-h-[80px]"
            rows={3}
          />

          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 bg-gray-50">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
                <Smile className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
                <AtSign className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!content.trim() || sendMessageMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <span className="mr-2">Send</span>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Real-time Tone Analysis */}
        {toneAnalysis && (
          <div className="mt-2 text-xs">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className={`${getToneColor(toneAnalysis.tone)}`}>
                  Tone: {toneAnalysis.tone}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <Target className={`h-3 w-3 ${getImpactColor(toneAnalysis.impact)}`} />
                <span className={getImpactColor(toneAnalysis.impact)}>
                  Impact: {toneAnalysis.impact}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-green-400">
                  Clarity: {toneAnalysis.clarity}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
