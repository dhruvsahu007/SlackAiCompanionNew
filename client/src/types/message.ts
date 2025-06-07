import type { Message } from "@shared/schema";

export interface MessageAuthor {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  status: string;
  title: string | null;
}

export interface MessageWithAuthor extends Message {
  author: MessageAuthor;
  replies?: MessageWithAuthor[];
} 