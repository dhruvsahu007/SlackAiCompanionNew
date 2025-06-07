import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MessageCircle, Zap, FileText, Loader2, AlertTriangle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Channel } from "@shared/schema";
import type { Message, User } from "@shared/schema";

interface MessageWithAuthor extends Message {
  author: User;
  replies?: MessageWithAuthor[];
}

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessage?: MessageWithAuthor | null;
}

interface ToneAnalysisResult {
  tone: string;
  impact: string;
  clarity: string;
  confidence: number;
  suggestions?: string[];
  suggestedTones?: string[];
  explanation?: string;
}

interface ReplyGenerationResult {
  suggestions: Array<{
    suggestedReply: string;
    confidence: number;
    reasoning: string;
  }>;
}

interface OrgMemoryResult {
  query: string;
  summary: string;
  sources: Array<{
    channelName: string;
    messageCount: number;
    lastUpdate: string;
  }>;
  keyPoints: string[];
}

interface MeetingNotesResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  participants: string[];
  decisions: string[];
}

export function AiModal({ isOpen, onClose, selectedMessage }: AiModalProps) {
  const { toast } = useToast();
  const [toneText, setToneText] = useState("");
  const [replyContext, setReplyContext] = useState("");
  const [orgQuery, setOrgQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const toneAnalysis = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze-tone", { content });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to analyze tone");
      }
      return await res.json();
    },
    onError: (error) => {
      toast({
        title: "AI Analysis Failed",
        description: error instanceof Error ? error.message : "Could not analyze tone. Please try again.",
        variant: "destructive",
      });
    }
  });

  const replyGeneration = useMutation<
    ReplyGenerationResult,
    Error,
    { messageContent: string; threadContext: string }
  >({
    mutationFn: async (input) => {
      console.log("[AI Modal] Generating reply for:", input);

      if (!input.messageContent.trim()) {
        throw new Error("Message content is required");
      }

      const contextLines = input.threadContext.split('\n').filter(line => line.trim());
      if (contextLines.length === 0) {
        throw new Error("Thread context is required");
      }

      const res = await apiRequest("POST", "/api/ai/suggest-reply", {
        messageContent: contextLines[0], // First line is the message to reply to
        threadContext: contextLines.slice(1), // Rest is context
        orgContext: "AI Assistant modal conversation", // Default context for modal
        messageId: null, // Explicitly indicate this is not tied to a message
        generateMultiple: true // Request multiple suggestions
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.message || "Failed to generate reply");
      }

      const responseData = await res.json();
      console.log("[AI Modal] Received reply suggestions:", responseData);

      if (!responseData || !Array.isArray(responseData.suggestions)) {
        throw new Error("Invalid response format from server");
      }

      return responseData;
    },
    onError: (error) => {
      console.error("[AI Modal] Reply generation error:", error);
      toast({
        title: "Reply Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate reply suggestions.",
        variant: "destructive",
      });
    }
  });

  const orgMemoryQuery = useMutation({
    mutationFn: async (query: string) => {
      console.log("[AI Modal] Querying org memory:", query);
      
      const res = await apiRequest("POST", "/api/ai/org-memory", { query });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.message || "Failed to query organizational memory");
      }

      const data = await res.json();
      console.log("[AI Modal] Org memory response:", data);

      if (!data || !data.summary) {
        throw new Error("Invalid response format from server");
      }

      return data;
    },
    onError: (error) => {
      console.error("[AI Modal] Org memory error:", error);
      toast({
        title: "Organization Memory Failed",
        description: error instanceof Error ? error.message : "Could not search organizational knowledge.",
        variant: "destructive",
      });
    },
  });

  const meetingNotes = useMutation<
    MeetingNotesResult,
    Error,
    number
  >({
    mutationFn: async (channelId: number) => {
      console.log("[AI Modal] Generating meeting notes for channel:", channelId);

      const res = await apiRequest("POST", "/api/ai/generate-notes", { 
        channelId 
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || errorData.message || "Failed to generate notes");
      }

      const data = await res.json();
      console.log("[AI Modal] Generated meeting notes:", data);

      if (!data || !data.title || !data.summary) {
        throw new Error("Invalid response format from server");
      }

      return data;
    },
    onError: (error) => {
      console.error("[AI Modal] Meeting notes generation error:", error);
      toast({
        title: "Meeting Notes Failed",
        description: error instanceof Error ? error.message : "Could not generate meeting notes.",
        variant: "destructive",
      });
    }
  });

  // Update reply context when selected message changes
  useEffect(() => {
    if (selectedMessage) {
      setReplyContext(selectedMessage.content || "");
    }
  }, [selectedMessage]);

  const handleToneAnalysis = () => {
    if (!toneText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      });
      return;
    }
    toneAnalysis.mutate(toneText);
  };

  const handleReplyGeneration = () => {
    if (!replyContext.trim()) {
      toast({
        title: "Context Required",
        description: "Please provide the message you want to reply to.",
        variant: "destructive",
      });
      return;
    }
    
    replyGeneration.mutate({
      messageContent: replyContext,
      threadContext: replyContext
    });
  };

  const handleOrgMemoryQuery = () => {
    if (!orgQuery.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }
    orgMemoryQuery.mutate(orgQuery);
  };

  const handleMeetingNotes = () => {
    const channelIdValue = parseInt(selectedChannelId);
    if (!selectedChannelId) {
      toast({
        title: "Channel Required",
        description: "Please select a channel to generate notes from.",
        variant: "destructive",
      });
      return;
    }
    meetingNotes.mutate(channelIdValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Assistant
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Access powerful AI tools for communication and knowledge management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={selectedMessage ? "reply" : "tone"} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="tone" className="data-[state=active]:bg-slate-700">
              <Zap className="h-4 w-4 mr-2" />
              Tone Analysis
            </TabsTrigger>
            <TabsTrigger value="reply" className="data-[state=active]:bg-slate-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Smart Reply
            </TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-slate-700">
              <Brain className="h-4 w-4 mr-2" />
              Org Memory
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-slate-700">
              <FileText className="h-4 w-4 mr-2" />
              Meeting Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tone" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Tone & Impact Analysis</CardTitle>
                <CardDescription className="text-slate-400">
                  Analyze the tone, clarity, and professional impact of your message
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your message to analyze..."
                  value={toneText}
                  onChange={(e) => setToneText(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                />
                <Button 
                  onClick={handleToneAnalysis}
                  disabled={toneAnalysis.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {toneAnalysis.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analyze Tone
                    </>
                  )}
                </Button>

                {toneAnalysis.isError && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm">Failed to analyze tone. Please try again.</p>
                    </div>
                  </div>
                )}
                
                {toneAnalysis.data && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-4">Analysis Results</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-3 rounded-lg">
                          <span className="text-slate-400 block mb-1">Current Tone:</span>
                          <p className="text-lg font-medium text-white">{toneAnalysis.data?.tone}</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg">
                          <span className="text-slate-400 block mb-1">Impact:</span>
                          <p className="text-lg font-medium text-white">{toneAnalysis.data?.impact}</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg">
                          <span className="text-slate-400 block mb-1">Clarity:</span>
                          <p className="text-lg font-medium text-white">{toneAnalysis.data?.clarity}</p>
                        </div>
                      </div>

                      {toneAnalysis.data?.suggestedTones && toneAnalysis.data.suggestedTones.length > 0 && (
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <h5 className="text-slate-400 mb-2">Suggested Alternative Tones:</h5>
                          <div className="flex flex-wrap gap-2">
                            {toneAnalysis.data.suggestedTones.map((tone: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-purple-600/30 text-purple-200 rounded-full text-sm">
                                {tone}
                              </span>
                            ))}
                          </div>
                          {toneAnalysis.data.explanation && (
                            <p className="mt-2 text-sm text-slate-300">
                              {toneAnalysis.data.explanation}
                            </p>
                          )}
                        </div>
                      )}

                      {toneAnalysis.data?.suggestions && toneAnalysis.data.suggestions.length > 0 && (
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <h5 className="text-slate-400 mb-2">Improvement Suggestions:</h5>
                          <ul className="space-y-2">
                            {toneAnalysis.data.suggestions.map((suggestion: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-white">
                                <span className="text-purple-400">•</span>
                                <span className="text-sm">{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reply" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Smart Reply Generation</CardTitle>
                <CardDescription className="text-slate-400">
                  Generate contextual reply suggestions based on conversation history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Message to reply to..."
                  value={replyContext}
                  onChange={(e) => setReplyContext(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                />
                <Button 
                  onClick={handleReplyGeneration}
                  disabled={replyGeneration.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {replyGeneration.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Generate Reply
                    </>
                  )}
                </Button>
                
                {replyGeneration.data && (
                  <div className="mt-4 space-y-4">
                    <h4 className="text-white font-semibold mb-2">Suggested Replies</h4>
                    {replyGeneration.data.suggestions.map((suggestion, index) => (
                      <div key={index} className="p-4 bg-slate-700 rounded-lg">
                        <p className="text-white mb-3 p-3 bg-slate-600 rounded">
                          {suggestion.suggestedReply}
                        </p>
                        <p className="text-sm text-slate-400">
                          <strong>Reasoning:</strong> {suggestion.reasoning}
                        </p>
                        <p className="text-sm text-slate-400">
                          <strong>Confidence:</strong> {Math.round(suggestion.confidence)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Organizational Memory</CardTitle>
                <CardDescription className="text-slate-400">
                  Search and query your organization's collective knowledge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="What would you like to know about your organization?"
                  value={orgQuery}
                  onChange={(e) => setOrgQuery(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button 
                  onClick={handleOrgMemoryQuery}
                  disabled={orgMemoryQuery.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {orgMemoryQuery.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Search Memory
                    </>
                  )}
                </Button>
                
                {orgMemoryQuery.data && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Search Results</h4>
                    <p className="text-white mb-3">{orgMemoryQuery.data.summary}</p>
                    
                    {orgMemoryQuery.data.keyPoints && (
                      <div className="mb-3">
                        <h5 className="text-slate-400 font-medium mb-1">Key Points:</h5>
                        <ul className="text-white text-sm space-y-1">
                          {orgMemoryQuery.data.keyPoints.map((point: string, index: number) => (
                            <li key={index}>• {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {orgMemoryQuery.data.sources && (
                      <div>
                        <h5 className="text-slate-400 font-medium mb-1">Sources:</h5>
                        <div className="space-y-2">
                          {orgMemoryQuery.data.sources.map((source: any, index: number) => (
                            <div key={index} className="text-sm text-slate-300">
                              <strong>#{source.channelName}</strong> - {source.messageCount} messages
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Meeting Notes Generator</CardTitle>
                <CardDescription className="text-slate-400">
                  Generate structured meeting notes from channel conversations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedChannelId}
                  onValueChange={setSelectedChannelId}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Available Channels</SelectLabel>
                      {channels.map(channel => (
                        <SelectItem 
                          key={channel.id} 
                          value={channel.id.toString()}
                          className="text-white"
                        >
                          #{channel.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={handleMeetingNotes}
                  disabled={meetingNotes.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {meetingNotes.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Notes
                    </>
                  )}
                </Button>

                {meetingNotes.isError && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <h5 className="font-medium">Error Generating Notes</h5>
                    </div>
                    <p className="text-sm text-slate-300">
                      {meetingNotes.error instanceof Error 
                        ? meetingNotes.error.message 
                        : "Failed to generate meeting notes. Please try again."}
                    </p>
                  </div>
                )}
                
                {meetingNotes.data && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-3">{meetingNotes.data.title}</h4>
                    <p className="text-white mb-4">{meetingNotes.data.summary}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {meetingNotes.data.keyPoints && meetingNotes.data.keyPoints.length > 0 && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Key Points:</h5>
                          <ul className="text-white text-sm space-y-1">
                            {meetingNotes.data.keyPoints.map((point: string, index: number) => (
                              <li key={index}>• {point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {meetingNotes.data.actionItems && meetingNotes.data.actionItems.length > 0 && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Action Items:</h5>
                          <ul className="text-white text-sm space-y-1">
                            {meetingNotes.data.actionItems.map((item: string, index: number) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {meetingNotes.data.participants && meetingNotes.data.participants.length > 0 && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Participants:</h5>
                          <p className="text-white text-sm">{meetingNotes.data.participants.join(", ")}</p>
                        </div>
                      )}
                      
                      {meetingNotes.data.decisions && meetingNotes.data.decisions.length > 0 && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Decisions:</h5>
                          <ul className="text-white text-sm space-y-1">
                            {meetingNotes.data.decisions.map((decision: string, index: number) => (
                              <li key={index}>• {decision}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}