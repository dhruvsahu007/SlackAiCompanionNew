import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MessageInput } from "./message-input";
import { 
  Brain, 
  Info, 
  Search, 
  Settings, 
  Users, 
  Reply, 
  Share,
  FileText,
  ThumbsUp,
  Target,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Channel, Message, User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ChatAreaProps {
  selectedChannel: number | null;
  selectedDmUser: number | null;
}

interface MessageWithAuthor extends Message {
  author: User;
  replies?: MessageWithAuthor[];
}

export function ChatArea({ selectedChannel, selectedDmUser }: ChatAreaProps) {
  const { user } = useAuth();
  const { lastMessage, joinChannel, leaveChannel, broadcastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());

  // Channel data
  const { data: channel } = useQuery<Channel>({
    queryKey: ["/api/channels", selectedChannel],
    enabled: !!selectedChannel,
  });

  // Channel messages
  const { data: channelMessages = [] } = useQuery<MessageWithAuthor[]>({
    queryKey: ["/api/channels", selectedChannel, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/channels/${selectedChannel}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedChannel,
  });

  // Direct messages
  const { data: dmMessages = [] } = useQuery<MessageWithAuthor[]>({
    queryKey: ["/api/direct-messages", selectedDmUser],
    queryFn: async () => {
      const response = await fetch(`/api/direct-messages/${selectedDmUser}`);
      if (!response.ok) throw new Error('Failed to fetch direct messages');
      return response.json();
    },
    enabled: !!selectedDmUser,
  });

  // DM user data
  const { data: dmUser } = useQuery<User>({
    queryKey: ["/api/users", selectedDmUser],
    queryFn: async () => {
      const response = await fetch(`/api/users/${selectedDmUser}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!selectedDmUser,
  });

  const messages = selectedChannel ? channelMessages : dmMessages;

  // WebSocket effects
  useEffect(() => {
    if (selectedChannel) {
      joinChannel(selectedChannel);
      return () => leaveChannel(selectedChannel);
    }
  }, [selectedChannel, joinChannel, leaveChannel]);

  useEffect(() => {
    if (lastMessage?.type === 'new_message') {
      if (selectedChannel && lastMessage.message.channelId === selectedChannel) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/channels", selectedChannel, "messages"] 
        });
      }
    }
  }, [lastMessage, selectedChannel, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // AI reply suggestion mutation
  const suggestReplyMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("POST", "/api/ai/suggest-reply", {
        messageId,
        threadContext: [], // Would include thread messages
        orgContext: "" // Would include relevant org context
      });
      return response.json();
    },
  });

  // Generate meeting notes mutation
  const generateNotesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChannel) throw new Error("No channel selected");
      const response = await apiRequest("POST", "/api/ai/generate-notes", {
        channelId: selectedChannel,
      });
      return response.json();
    },
  });

  const handleSuggestReply = (messageId: number) => {
    suggestReplyMutation.mutate(messageId);
  };

  const handleGenerateNotes = () => {
    generateNotesMutation.mutate();
  };

  const toggleThread = (messageId: number) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const renderToneAnalysis = (analysis: any) => {
    if (!analysis) return null;

    return (
      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-3">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">AI Tone Analysis</span>
        </div>
        <div className="text-sm text-slate-300">
          <p><span className="text-green-400 font-medium">Impact:</span> {analysis.impact}</p>
          <p><span className="text-blue-400 font-medium">Clarity:</span> {analysis.clarity}</p>
        </div>
      </div>
    );
  };

  const renderMessage = (message: MessageWithAuthor, isReply = false) => {
    const isExpanded = expandedThreads.has(message.id);
    
    return (
      <div key={message.id} className={`group hover:bg-slate-800/50 p-3 rounded-lg transition-colors ${isReply ? 'ml-4 border-l-2 border-purple-600 pl-4' : ''}`}>
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.author.avatar} />
            <AvatarFallback className="bg-slate-600 text-white">
              {message.author.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-white">{message.author.displayName}</span>
              {message.author.title && (
                <Badge variant="secondary" className="text-xs">
                  {message.author.title}
                </Badge>
              )}
              <span className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            <p className="text-slate-300 mb-2">{message.content}</p>
            
            {/* AI Analysis */}
            {message.aiAnalysis && renderToneAnalysis(message.aiAnalysis)}
            
            {/* Thread Replies */}
            {message.replies && message.replies.length > 0 && !isReply && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleThread(message.id)}
                  className="text-xs text-slate-400 hover:text-white p-0 h-auto"
                >
                  {isExpanded ? 'Hide' : 'Show'} {message.replies.length} replies
                </Button>
                
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {message.replies.map(reply => renderMessage(reply, true))}
                  </div>
                )}
              </div>
            )}
            
            {/* Message Actions */}
            <div className="flex items-center mt-3 space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSuggestReply(message.id)}
                className="text-xs text-slate-400 hover:text-white h-auto p-1"
                disabled={suggestReplyMutation.isPending}
              >
                <Brain className="h-3 w-3 mr-1" />
                Suggest Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white h-auto p-1"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white h-auto p-1"
              >
                <Share className="h-3 w-3 mr-1" />
                Share
              </Button>
              {!isReply && selectedChannel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateNotes}
                  className="text-xs text-slate-400 hover:text-white h-auto p-1"
                  disabled={generateNotesMutation.isPending}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Generate Notes
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedChannel && !selectedDmUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-800">
        <div className="text-center">
          <Brain className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Welcome to SlackAI</h3>
          <p className="text-slate-400">Select a channel or start a direct message to begin</p>
        </div>
      </div>
    );
  }

  const headerTitle = selectedChannel 
    ? `# ${channel?.name || 'Loading...'}`
    : `@ ${dmUser?.displayName || 'Loading...'}`;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-white">{headerTitle}</h2>
            {selectedChannel && (
              <>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <Users className="h-4 w-4" />
                  <span>142 members</span>
                </div>
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(message => renderMessage(message))}
        
        {/* AI Suggestion Display */}
        {suggestReplyMutation.data && (
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">AI Suggested Reply</span>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              {suggestReplyMutation.data.suggestedReply}
            </p>
            <div className="flex space-x-2">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                Send Reply
              </Button>
              <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                Edit
              </Button>
            </div>
          </div>
        )}

        {/* Meeting Notes Display */}
        {generateNotesMutation.data && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Generated Meeting Notes</span>
            </div>
            <h4 className="font-medium text-white mb-2">{generateNotesMutation.data.title}</h4>
            <p className="text-sm text-slate-300 mb-3">{generateNotesMutation.data.summary}</p>
            {generateNotesMutation.data.keyPoints?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-white mb-1">Key Points:</p>
                <ul className="text-sm text-slate-300 list-disc list-inside">
                  {generateNotesMutation.data.keyPoints.map((point: string, index: number) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput 
        channelId={selectedChannel}
        recipientId={selectedDmUser}
        onMessageSent={(message) => {
          if (selectedChannel) {
            broadcastMessage(selectedChannel, message);
          }
        }}
      />
    </div>
  );
}
