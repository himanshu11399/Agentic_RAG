import { useEffect, useRef, useState } from "react";
import { Menu, Sparkles, SquarePen, Square } from "lucide-react";

import ChatMessage from "./components/ChatMessage";
import type { Message } from "./components/ChatMessage.types";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import { sendMessage } from "./services/chatApi";
import {
  loadConversations,
  saveConversations,
} from "./services/conversationStorage";
import type { Conversation } from "./types/conversation";
import "./App.css";

const REQUEST_TIMEOUT_MS = 60_000;

function createConversation(): Conversation {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ");
  const maxLength = 40;

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized || "New chat";
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(),
  );

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(() => loadConversations()[0]?.id ?? null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

  const messages: Message[] = activeConversation?.messages ?? [];

  // Persist conversations whenever their contents change.
  useEffect(() => {
    try {
      saveConversations(conversations);
    } catch (err) {
      console.error("Failed to persist conversations:", err);
    }
  }, [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  function updateConversation(
    conversationId: string,
    update: (conversation: Conversation) => Conversation,
  ) {
    setConversations((previous) => {
      const updated = previous.map((conversation) =>
        conversation.id === conversationId
          ? update(conversation)
          : conversation,
      );
      return updated.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  function newChat() {
    requestRef.current?.abort();
    requestRef.current = null;

    const conversation = createConversation();

    setConversations((previous) => [conversation, ...previous]);
    setActiveConversationId(conversation.id);
    setError("");
    setIsLoading(false);
  }

  function stopGenerating() {
    requestRef.current?.abort();
  }

  async function requestReply(
    conversationId: string,
    content: string,
    history: Message[],
  ) {
    if (requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;

    let timedOut = false;

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    setIsLoading(true);
    setError("");

    try {
      const reply = await sendMessage(
        content,
        history.map(({ role, content }) => ({ role, content })),
        controller.signal,
      );

      if (requestRef.current !== controller) return;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
      };

      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, assistantMessage],
        updatedAt: Date.now(),
      }));
    } catch (err) {
      if (requestRef.current !== controller) return;

      if (controller.signal.aborted && !timedOut) return;

      setError(
        timedOut
          ? "The request timed out. Please try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      window.clearTimeout(timeoutId);

      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }

  async function handleSend(content: string) {
    if (requestRef.current || !content.trim()) return;

    let conversationId = activeConversationId;

    // Create a conversation automatically when the user starts chatting.
    if (
      !conversationId ||
      !conversations.some((conversation) => conversation.id === conversationId)
    ) {
      const conversation = createConversation();

      conversationId = conversation.id;
      setConversations((previous) => [conversation, ...previous]);
      setActiveConversationId(conversation.id);
    }

    const trimmedContent = content.trim();
    const currentConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    );

    const history = (currentConversation?.messages ?? []).slice(-20);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedContent,
    };

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? createTitle(trimmedContent)
          : conversation.title,
      messages: [...conversation.messages, userMessage],
      updatedAt: Date.now(),
    }));

    await requestReply(conversationId, trimmedContent, history);
  }

  async function retryLastMessage() {
    if (requestRef.current || !activeConversationId) return;

    const lastIndex = messages.length - 1;
    const lastMessage = messages[lastIndex];

    // Retry only when the latest message is a failed user message.
    if (!lastMessage || lastMessage.role !== "user" || !error) {
      return;
    }

    // Exclude the failed message itself to avoid sending it twice.
    const history = messages.slice(0, lastIndex).slice(-20);

    await requestReply(activeConversationId, lastMessage.content, history);
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <>
          <button
            className="sidebar-backdrop"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={(id) => {
              requestRef.current?.abort();
              requestRef.current = null;

              setActiveConversationId(id);
              setError("");
              setIsLoading(false);

              if (window.matchMedia("(max-width: 767px)").matches) {
                setSidebarOpen(false);
              }
            }}
            onDeleteConversation={(id) => {
              const remaining = conversations.filter(
                (conversation) => conversation.id !== id,
              );

              setConversations(remaining);

              if (activeConversationId === id) {
                requestRef.current?.abort();
                requestRef.current = null;

                setActiveConversationId(remaining[0]?.id ?? null);
                setError("");
                setIsLoading(false);
              }
            }}
            onRenameConversation={(id, title) => {
              setConversations((previous) =>
                previous
                  .map((conversation) =>
                    conversation.id === id
                      ? {
                          ...conversation,
                          title: title.trim().slice(0, 100),
                          updatedAt: Date.now(),
                        }
                      : conversation,
                  )
                  .sort((a, b) => b.updatedAt - a.updatedAt),
              );
            }}
            onNewChat={() => {
              newChat();

              if (window.matchMedia("(max-width: 767px)").matches) {
                setSidebarOpen(false);
              }
            }}
            onClose={() => setSidebarOpen(false)}
          />
        </>
      )}

      <main className="chat-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            <span className="topbar-title">AI Assistant</span>
            <span className="model-label">V3</span>
          </div>

          <button
            className="icon-button"
            onClick={newChat}
            aria-label="New chat"
          >
            <SquarePen size={19} />
          </button>
        </header>

        <section className="conversation" aria-live="polite">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon">
                <Sparkles size={28} />
              </div>

              <h1>How can I help you today?</h1>
              <p>Your AI assistant is ready. Ask a question to get started.</p>

              <div className="suggestion-grid">
                {[
                  "Explain how APIs work",
                  "Help me debug some code",
                  "Explain LangGraph simply",
                  "Give me a Python learning plan",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="suggestion-card"
                    onClick={() => void handleSend(suggestion)}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}

          {isLoading && (
            <div className="loading-indicator" role="status">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span>Thinking...</span>

              <button
                type="button"
                className="stop-generating-button"
                onClick={stopGenerating}
                aria-label="Stop generating"
              >
                <Square size={13} />
                <span>Stop</span>
              </button>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={() => void retryLastMessage()}>Retry</button>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <footer className="chat-footer">
          <div className="composer-wrapper">
            <ChatInput
              onSend={(message) => void handleSend(message)}
              isLoading={isLoading}
            />

            <p className="disclaimer">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
