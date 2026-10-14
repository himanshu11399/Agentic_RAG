import { beforeEach, describe, expect, it } from "vitest";
import {
  loadConversations,
  saveConversations,
} from "../services/conversationStorage";
import type { Conversation } from "../types/conversation";

const STORAGE_KEY = "agentic-rag-conversations";

const sampleConversation: Conversation = {
  id: "conversation-1",
  title: "Learning LangGraph",
  messages: [
    {
      id: "message-1",
      role: "user",
      content: "What is LangGraph?",
    },
    {
      id: "message-2",
      role: "assistant",
      content: "LangGraph helps build stateful AI workflows.",
    },
  ],
  createdAt: 1000,
  updatedAt: 2000,
};

describe("conversationStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when no conversations exist", () => {
    expect(loadConversations()).toEqual([]);
  });

  it("saves and loads conversations", () => {
    saveConversations([sampleConversation]);

    expect(loadConversations()).toEqual([sampleConversation]);
  });

  it("preserves multiple conversations independently", () => {
    const secondConversation: Conversation = {
      ...sampleConversation,
      id: "conversation-2",
      title: "Learning RAG",
      messages: [],
    };

    saveConversations([sampleConversation, secondConversation]);

    const loaded = loadConversations();

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("conversation-1");
    expect(loaded[1].id).toBe("conversation-2");
  });

  it("returns an empty array when stored JSON is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "{invalid json");

    expect(loadConversations()).toEqual([]);
  });

  it("ignores malformed conversation records", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([sampleConversation, { id: "broken", title: 123 }]),
    );

    expect(loadConversations()).toEqual([sampleConversation]);
  });
});
