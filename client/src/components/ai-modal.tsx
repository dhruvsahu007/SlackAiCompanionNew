import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, MessageCircle, Zap, FileText, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToneAnalysisResult {
  tone: string;
  impact: string;
  clarity: string;
  confidence: number;
  suggestions?: string[];
}

interface ReplyGenerationResult {
  suggestedReply: string;
  confidence: number;
  reasoning: string;
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

export function AiModal({ isOpen, onClose }: AiModalProps) {
  const { toast } = useToast();
  const [toneText, setToneText] = useState("");
  const [replyContext, setReplyContext] = useState("");
  const [orgQuery, setOrgQuery] = useState("");
  const [meetingChannelId, setMeetingChannelId] = useState("");

  const toneAnalysis = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/ai/analyze-tone", { content });
      return await res.json();
    },
    onError: () => {
      toast({
        title: "AI Analysis Failed",
        description: "Could not analyze tone. Please check your connection.",
        variant: "destructive",
      });
    },
  });

  const replyGeneration = useMutation({
    mutationFn: async (data: { messageContent: string; threadContext: string }) => {
      const res = await apiRequest("POST", "/api/ai/suggest-reply", {
        messageContent: data.messageContent,
        threadContext: data.threadContext.split('\n'),
      });
      return await res.json();
    },
    onError: () => {
      toast({
        title: "Reply Generation Failed",
        description: "Could not generate reply suggestions.",
        variant: "destructive",
      });
    },
  });

  const orgMemoryQuery = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/ai/org-memory", { query });
      return await res.json();
    },
    onError: () => {
      toast({
        title: "Organization Memory Failed",
        description: "Could not search organizational knowledge.",
        variant: "destructive",
      });
    },
  });

  const meetingNotes = useMutation({
    mutationFn: async (channelId: number) => {
      const res = await apiRequest("POST", "/api/ai/meeting-notes", { channelId });
      return await res.json();
    },
    onError: () => {
      toast({
        title: "Meeting Notes Failed",
        description: "Could not generate meeting notes.",
        variant: "destructive",
      });
    },
  });

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
        description: "Please provide message context for reply generation.",
        variant: "destructive",
      });
      return;
    }
    const lines = replyContext.split('\n');
    if (lines.length < 1) {
      toast({
        title: "Invalid Context",
        description: "Please provide at least one message for context.",
        variant: "destructive",
      });
      return;
    }
    replyGeneration.mutate({
      messageContent: lines[0],
      threadContext: replyContext,
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
    const channelId = parseInt(meetingChannelId);
    if (!channelId || isNaN(channelId)) {
      toast({
        title: "Channel ID Required",
        description: "Please provide a valid channel ID.",
        variant: "destructive",
      });
      return;
    }
    meetingNotes.mutate(channelId);
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

        <Tabs defaultValue="tone" className="w-full">
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
                
                {toneAnalysis.data && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Analysis Results</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Tone:</span>
                        <p className="text-white">{toneAnalysis.data.tone}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Impact:</span>
                        <p className="text-white">{toneAnalysis.data.impact}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Clarity:</span>
                        <p className="text-white">{toneAnalysis.data.clarity}</p>
                      </div>
                    </div>
                    {toneAnalysis.data.suggestions && (
                      <div className="mt-3">
                        <span className="text-slate-400">Suggestions:</span>
                        <ul className="text-white text-sm mt-1 space-y-1">
                          {toneAnalysis.data.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
                  placeholder="Paste the message context (one message per line)..."
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
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Suggested Reply</h4>
                    <p className="text-white mb-3 p-3 bg-slate-600 rounded">
                      {replyGeneration.data.suggestedReply}
                    </p>
                    <p className="text-sm text-slate-400">
                      <strong>Reasoning:</strong> {replyGeneration.data.reasoning}
                    </p>
                    <p className="text-sm text-slate-400">
                      <strong>Confidence:</strong> {Math.round(replyGeneration.data.confidence * 100)}%
                    </p>
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
                <Input
                  placeholder="Enter channel ID (e.g., 1 for #general)"
                  value={meetingChannelId}
                  onChange={(e) => setMeetingChannelId(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
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
                
                {meetingNotes.data && (
                  <div className="mt-4 p-4 bg-slate-700 rounded-lg">
                    <h4 className="text-white font-semibold mb-3">{meetingNotes.data.title}</h4>
                    <p className="text-white mb-4">{meetingNotes.data.summary}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {meetingNotes.data.keyPoints && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Key Points:</h5>
                          <ul className="text-white text-sm space-y-1">
                            {meetingNotes.data.keyPoints.map((point: string, index: number) => (
                              <li key={index}>• {point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {meetingNotes.data.actionItems && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Action Items:</h5>
                          <ul className="text-white text-sm space-y-1">
                            {meetingNotes.data.actionItems.map((item: string, index: number) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {meetingNotes.data.participants && (
                        <div>
                          <h5 className="text-slate-400 font-medium mb-2">Participants:</h5>
                          <p className="text-white text-sm">{meetingNotes.data.participants.join(", ")}</p>
                        </div>
                      )}
                      
                      {meetingNotes.data.decisions && (
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