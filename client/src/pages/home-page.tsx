import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatArea } from "@/components/chat-area";
import { AiModal } from "@/components/ai-modal";
import { useWebSocket } from "@/hooks/use-websocket";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [selectedDmUser, setSelectedDmUser] = useState<number | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const { isConnected } = useWebSocket();

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar 
        selectedChannel={selectedChannel}
        selectedDmUser={selectedDmUser}
        onChannelSelect={(channelId) => {
          setSelectedChannel(channelId);
          setSelectedDmUser(null);
        }}
        onDmUserSelect={(userId) => {
          setSelectedDmUser(userId);
          setSelectedChannel(null);
        }}
      />
      
      <ChatArea 
        selectedChannel={selectedChannel}
        selectedDmUser={selectedDmUser}
      />

      {/* AI Floating Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsAiModalOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          size="icon"
        >
          <Brain className="h-6 w-6" />
        </Button>
      </div>

      {/* Connection Status */}
      <div className="fixed top-4 right-4 z-40">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isConnected 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <AiModal 
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
}
