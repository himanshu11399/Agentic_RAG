import type { Message } from "../components/ChatMessage.types";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  backendId?: string;
  createdAt: number;
  updatedAt: number;
}
