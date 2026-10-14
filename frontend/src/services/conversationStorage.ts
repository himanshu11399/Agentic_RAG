import type { Conversation } from "../types/conversation";

const STORAGE_KEY = "agentic-rag-conversations";

export function loadConversations(): Conversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isConversation)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    !Array.isArray(item.messages) ||
    typeof item.createdAt !== "number" ||
    typeof item.updatedAt !== "number"
  ) {
    return false;
  }

  return item.messages.every((message: unknown) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }
    const msg = message as Record<string, unknown>;

    return (
      typeof msg.id === "string" &&
      (msg.role === "user" || "assistant") &&
      typeof msg.content === "string"
    );
  });
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    throw new Error(
      "Unable to save conversations. Browser storage may be full or unavailable.",
    );
  }
}
