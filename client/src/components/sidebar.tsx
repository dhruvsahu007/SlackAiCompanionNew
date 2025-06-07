import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Hash, 
  Plus, 
  Users, 
  Settings, 
  Brain, 
  FileText, 
  TrendingUp,
  Circle,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Channel, User, InsertChannel } from "@shared/schema";

interface SidebarProps {
  selectedChannel: number | null;
  selectedDmUser: number | null;
  onChannelSelect: (channelId: number) => void;
  onDmUserSelect: (userId: number) => void;
}

export function Sidebar({ 
  selectedChannel, 
  selectedDmUser, 
  onChannelSelect, 
  onDmUserSelect 
}: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState<string>("");
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const { data: dmUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/direct-message-users"],
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: Omit<InsertChannel, "createdBy">) => {
      const res = await apiRequest("POST", "/api/channels", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      setIsChannelModalOpen(false);
      setChannelName("");
      setChannelDescription("");
      setIsPrivateChannel(false);
      toast({
        title: "Channel Created",
        description: "New channel has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create channel. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-400";
      case "away": return "bg-yellow-400";
      case "busy": return "bg-red-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    return <Circle className={`w-3 h-3 ${getStatusColor(status)} rounded-full`} />;
  };

  const handleCreateChannel = () => {
    const trimmedName = channelName.trim();
    const trimmedDescription = channelDescription?.trim();

    if (!trimmedName) {
      toast({
        title: "Channel Name Required",
        description: "Please enter a name for the channel.",
        variant: "destructive",
      });
      return;
    }

    createChannelMutation.mutate({
      name: trimmedName.toLowerCase().replace(/\s+/g, '-'),
      description: trimmedDescription || undefined,
      isPrivate: isPrivateChannel
    });
  };

  return (
    <div className="w-64 bg-purple-900 flex flex-col border-r border-purple-800">
      {/* Workspace Header */}
      <div className="p-4 border-b border-purple-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="text-white text-sm" />
          </div>
          <div>
            <h1 className="font-semibold text-white">SlackAI Workspace</h1>
            <div className="flex items-center space-x-1">
              <Circle className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-xs text-slate-300">AI Brain Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Channels Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
              Channels
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-slate-300 hover:text-white"
              onClick={() => setIsChannelModalOpen(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`flex items-center space-x-2 px-2 py-1 rounded text-sm w-full text-left transition-colors ${
                  selectedChannel === channel.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-purple-800 hover:text-white'
                }`}
              >
                <Hash className="h-4 w-4" />
                <span className="truncate">{channel.name}</span>
                {/* Mock notification badge for some channels */}
                {channel.name === 'project-atlas' && (
                  <Badge variant="destructive" className="ml-auto text-xs">3</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
              Direct Messages
            </h3>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-300 hover:text-white">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {dmUsers.map((dmUser) => (
              <button
                key={dmUser.id}
                onClick={() => onDmUserSelect(dmUser.id)}
                className={`flex items-center space-x-2 px-2 py-1 rounded text-sm w-full text-left transition-colors ${
                  selectedDmUser === dmUser.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-purple-800 hover:text-white'
                }`}
              >
                {getStatusIcon(dmUser.status)}
                <span className="truncate">{dmUser.displayName}</span>
                {/* Mock notification for some users */}
                {dmUser.username === 'mike' && (
                  <Badge variant="destructive" className="ml-auto text-xs">1</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* AI Features Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
              AI Tools
            </h3>
          </div>
          <div className="space-y-1">
            <button className="flex items-center space-x-2 px-2 py-1 rounded text-sm text-slate-300 hover:bg-purple-800 hover:text-white transition-colors w-full text-left">
              <Brain className="h-4 w-4 text-blue-400" />
              <span>Org Memory</span>
            </button>
            <button className="flex items-center space-x-2 px-2 py-1 rounded text-sm text-slate-300 hover:bg-purple-800 hover:text-white transition-colors w-full text-left">
              <FileText className="h-4 w-4 text-green-400" />
              <span>Meeting Notes</span>
            </button>
            <button className="flex items-center space-x-2 px-2 py-1 rounded text-sm text-slate-300 hover:bg-purple-800 hover:text-white transition-colors w-full text-left">
              <TrendingUp className="h-4 w-4 text-red-400" />
              <span>Tone Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-purple-800">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-slate-600 text-white">
              {user?.displayName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.displayName}</p>
            <p className="text-xs text-slate-300 truncate">{user?.status}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-300 hover:text-white"
            onClick={() => logoutMutation.mutate()}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Channel Modal */}
      <Dialog open={isChannelModalOpen} onOpenChange={setIsChannelModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Channel</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new channel to your workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel-name" className="text-white">Channel Name</Label>
              <Input
                id="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. project-updates"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="channel-description" className="text-white">Description</Label>
              <Textarea
                id="channel-description"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="private-channel"
                checked={isPrivateChannel}
                onCheckedChange={setIsPrivateChannel}
              />
              <Label htmlFor="private-channel" className="text-white">Private Channel</Label>
            </div>
            <Button
              onClick={handleCreateChannel}
              disabled={createChannelMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {createChannelMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>Create Channel</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
