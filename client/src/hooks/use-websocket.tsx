import { useEffect, useRef, useState } from "react";
import { useAuth } from "./use-auth";

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Authenticate with the server
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const joinChannel = (channelId: number) => {
    sendMessage({ type: 'join_channel', channelId });
  };

  const leaveChannel = (channelId: number) => {
    sendMessage({ type: 'leave_channel', channelId });
  };

  const sendTyping = (channelId: number, isTyping: boolean) => {
    if (user) {
      sendMessage({ 
        type: 'typing', 
        channelId, 
        userId: user.id, 
        isTyping 
      });
    }
  };

  const broadcastMessage = (channelId: number, messageData: any) => {
    sendMessage({
      type: 'new_message',
      channelId: channelId || null,
      recipientId: messageData.recipientId || null,
      data: messageData
    });
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    joinChannel,
    leaveChannel,
    sendTyping,
    broadcastMessage
  };
}
