import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  History,
  Menu,
  Plus,
  Printer,
  Share2,
  Sparkles,
  Sun,
  Square,
} from "lucide-react";

import { useAuth, useUser, UserButton } from "@clerk/react";
import AuthScreen from "./components/AuthScreen";

import ChatMessage from "./components/ChatMessage";
import type { Message } from "./components/ChatMessage.types";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import {
  createConversation as createServerConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
  renameConversation,
  sendMessage,
} from "./services/chatApi";
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
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const { user } = useUser();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConversationsLoaded, setIsConversationsLoaded] = useState(false);

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 768px)")?.matches ?? false
        : false,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const loadedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) return;

    // Cancel requests associated with the previous account.
    requestRef.current?.abort();
    requestRef.current = null;

    // Clear conversations and cached message history.
    setConversations([]);
    setActiveConversationId(null);
    setIsLoading(false);
    setError("");
    setIsConversationsLoaded(false);
    loadedMessagesRef.current.clear();
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setConversations([]);
      setActiveConversationId(null);
      setIsConversationsLoaded(false);
      return;
    }

    let cancelled = false;

    async function fetchConversations() {
      setIsConversationsLoaded(false);
      setError("");

      try {
        const savedConversations = await listConversations(getToken);

        if (cancelled) return;

        const mappedConversations: Conversation[] = savedConversations.map(
          (item) => ({
            id: `server-${item.id}`,
            backendId: item.id,
            title: item.title,
            messages: [],
            createdAt: Date.parse(item.created_at),
            updatedAt: Date.parse(item.updated_at),
          }),
        );

        setConversations(mappedConversations);
        const first = mappedConversations[0];
        setActiveConversationId(first?.id ?? null);
        if (first?.backendId) {
          void loadConversationMessages(first.id, first.backendId);
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your saved conversations.",
        );
      } finally {
        if (!cancelled) {
          setIsConversationsLoaded(true);
        }
      }
    }

    void fetchConversations();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, getToken]);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

  const messages: Message[] = activeConversation?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function loadConversationMessages(
    conversationId: string,
    backendId?: string,
  ) {
    if (loadedMessagesRef.current.has(conversationId)) return;

    const targetBackendId =
      backendId ??
      conversations.find((item) => item.id === conversationId)?.backendId;

    if (!targetBackendId) return;

    try {
      const serverMessages = await getConversationMessages(
        targetBackendId,
        getToken,
      );

      loadedMessagesRef.current.add(conversationId);

      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            messages: serverMessages.map((msg) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: Date.parse(msg.created_at),
            })),
          };
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load messages for this conversation.",
      );
    }
  }

  async function requestReply(
    conversationId: string,
    messageText: string,
    history: Message[],
  ) {
    const controller = new AbortController();
    requestRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    setIsLoading(true);
    setError("");

    try {
      const currentConversation = conversations.find(
        (item) => item.id === conversationId,
      );

      const targetBackendId = currentConversation?.backendId;

      const data = await sendMessage(
        messageText,
        history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        controller.signal,
        getToken,
        targetBackendId,
      );

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        timestamp: Date.now(),
      };

      setConversations((previous) =>
        previous.map((conversation) => {
          if (conversation.id !== conversationId) {
            return conversation;
          }

          return {
            ...conversation,
            backendId: conversation.backendId ?? data.conversation_id,
            messages: [...conversation.messages, assistantMessage],
            updatedAt: Date.now(),
          };
        }),
      );
    } catch (err) {
      if (controller.signal.aborted) {
        setError("The request timed out or was cancelled. Please try again.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while generating a reply.",
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      requestRef.current = null;
      setIsLoading(false);
    }
  }

  async function newChat() {
    requestRef.current?.abort();
    requestRef.current = null;

    setError("");
    setIsLoading(false);

    try {
      const saved = await createServerConversation("New Chat", getToken);

      const serverConversation: Conversation = {
        id: `server-${saved.id}`,
        backendId: saved.id,
        title: saved.title,
        messages: [],
        createdAt: Date.parse(saved.created_at),
        updatedAt: Date.parse(saved.updated_at),
      };

      setConversations((previous) => [
        serverConversation,
        ...previous.filter((item) => item.id !== serverConversation.id),
      ]);
      setActiveConversationId(serverConversation.id);
    } catch {
      const fallback = createConversation();
      setConversations((previous) => [fallback, ...previous]);
      setActiveConversationId(fallback.id);
    }
  }

  async function handleSend(messageText: string) {
    let targetConversationId = activeConversationId;
    let isBrandNewChat = false;

    if (!targetConversationId) {
      try {
        const saved = await createServerConversation(
          createTitle(messageText),
          getToken,
        );

        const serverConversation: Conversation = {
          id: `server-${saved.id}`,
          backendId: saved.id,
          title: saved.title,
          messages: [],
          createdAt: Date.parse(saved.created_at),
          updatedAt: Date.parse(saved.updated_at),
        };

        setConversations((previous) => [
          serverConversation,
          ...previous.filter((item) => item.id !== serverConversation.id),
        ]);
        setActiveConversationId(serverConversation.id);
        targetConversationId = serverConversation.id;
        isBrandNewChat = true;
      } catch {
        const fallback = createConversation();
        fallback.title = createTitle(messageText);

        setConversations((previous) => [fallback, ...previous]);
        setActiveConversationId(fallback.id);
        targetConversationId = fallback.id;
        isBrandNewChat = true;
      }
    }

    const currentTarget = targetConversationId;
    if (!currentTarget) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };

    const currentConversation = conversations.find(
      (item) => item.id === currentTarget,
    );

    const history = currentConversation ? currentConversation.messages : [];

    setConversations((previous) =>
      previous.map((conversation) => {
        if (conversation.id !== currentTarget) {
          return conversation;
        }

        const shouldUpdateTitle =
          conversation.messages.length === 0 && !isBrandNewChat;

        return {
          ...conversation,
          title: shouldUpdateTitle
            ? createTitle(messageText)
            : conversation.title,
          messages: [...conversation.messages, userMessage],
          updatedAt: Date.now(),
        };
      }),
    );

    await requestReply(currentTarget, messageText, history);
  }

  function stopGenerating() {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsLoading(false);
  }

  async function retryLastMessage() {
    if (!activeConversationId || isLoading) return;

    const conversation = conversations.find(
      (item) => item.id === activeConversationId,
    );

    if (!conversation) return;

    const messages = conversation.messages;
    const lastIndex = messages.findLastIndex((msg) => msg.role === "user");

    if (lastIndex === -1) return;

    const lastMessage = messages[lastIndex];

    setConversations((previous) =>
      previous.map((item) => {
        if (item.id !== activeConversationId) return item;

        return {
          ...item,
          messages: item.messages.slice(0, lastIndex + 1),
        };
      }),
    );

    const history = messages.slice(0, lastIndex).slice(-20);

    await requestReply(activeConversationId, lastMessage.content, history);
  }

  if (!isLoaded) {
    return (
      <main className="auth-screen">
        <p>Loading authentication...</p>
      </main>
    );
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

  const displayName = user?.fullName || "S J A Siam";
  const displayEmail = user?.primaryEmailAddress?.emailAddress || "sja.siam@skiff.com";
  const avatarUrl = user?.imageUrl || "/avatar.jpg";

  return (
    <div className="app-shell-dark">
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
            userName={displayName}
            userEmail={displayEmail}
            userAvatar={avatarUrl}
            onSelectConversation={(id) => {
              requestRef.current?.abort();
              requestRef.current = null;

              setActiveConversationId(id);
              setError("");
              setIsLoading(false);

              void loadConversationMessages(id);

              if (window.matchMedia("(max-width: 767px)").matches) {
                setSidebarOpen(false);
              }
            }}
            onDeleteConversation={(id) => {
              void (async () => {
                const conversation = conversations.find(
                  (item) => item.id === id,
                );

                if (!conversation) return;

                if (conversation.backendId) {
                  try {
                    await deleteConversation(conversation.backendId, getToken);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to delete conversation.",
                    );
                    return;
                  }
                }

                setConversations((previous) => {
                  const updated = previous.filter((item) => item.id !== id);

                  if (activeConversationId === id) {
                    const nextActive = updated[0]?.id ?? null;
                    setActiveConversationId(nextActive);
                    if (nextActive) {
                      void loadConversationMessages(nextActive);
                    }
                  }

                  return updated;
                });
              })();
            }}
            onRenameConversation={(id, newTitle) => {
              void (async () => {
                const trimmedTitle = newTitle.trim();
                if (!trimmedTitle) return;

                const conversation = conversations.find(
                  (item) => item.id === id,
                );

                if (!conversation) return;

                if (!conversation.backendId) {
                  setConversations((previous) =>
                    previous.map((item) =>
                      item.id === id ? { ...item, title: trimmedTitle } : item,
                    ),
                  );
                  return;
                }

                try {
                  const updated = await renameConversation(
                    conversation.backendId,
                    trimmedTitle,
                    getToken,
                  );

                  setConversations((previous) =>
                    previous
                      .map((item) =>
                        item.id === id
                          ? {
                              ...item,
                              title: updated.title,
                              updatedAt: Date.parse(updated.updated_at),
                            }
                          : item,
                      )
                      .sort((a, b) => b.updatedAt - a.updatedAt),
                  );

                  setError("");
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to rename conversation.",
                  );
                }
              })();
            }}
            onNewChat={() => {
              void newChat();

              if (window.matchMedia("(max-width: 767px)").matches) {
                setSidebarOpen(false);
              }
            }}
            onClose={() => setSidebarOpen(false)}
          />
        </>
      )}

      {/* Main White Chat Canvas Card */}
      <main className="chat-card-container">
        {/* Top Bar */}
        <header className="chat-card-topbar">
          <div className="topbar-left-group">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              className="new-chat-pill-btn"
              onClick={() => void newChat()}
              aria-label="New chat"
            >
              <Plus size={15} className="new-chat-plus" />
              <span>New chat</span>
            </button>

            <button
              type="button"
              className="topbar-icon-btn history-btn"
              aria-label="History"
              title="Chat History"
            >
              <History size={16} />
            </button>
          </div>

          <div className="topbar-right-group">
            {/* Theme Toggle Switch */}
            <div className="theme-toggle-wrap" title="Theme">
              <Sun size={16} className="sun-icon" />
              <div className="toggle-track-pill">
                <div className="toggle-knob" />
              </div>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              className="topbar-action-square"
              aria-label="Bookmarks"
              title="Bookmarks"
            >
              <Bookmark size={15} />
            </button>

            <button
              type="button"
              className="topbar-action-square"
              aria-label="Print"
              title="Print"
            >
              <Printer size={15} />
            </button>

            <button
              type="button"
              className="topbar-action-square"
              aria-label="Share"
              title="Share"
            >
              <Share2 size={15} />
            </button>

            {/* Clerk User Button */}
            <div className="user-button-wrapper">
              <UserButton />
            </div>
          </div>
        </header>

        {/* Floating Right Collapse Chevron Tab */}
        <div className="right-collapse-tab" aria-hidden="true">
          <ChevronLeft size={14} />
        </div>

        {/* Conversation Message Stream */}
        <section className="chat-canvas-stream" aria-live="polite">
          {messages.length === 0 ? (
            <div className="welcome-chatgpt">
              <div className="welcome-chatgpt-badge">
                <Sparkles size={24} />
              </div>

              <h1>How can I help you today?</h1>
              <p>Your AI assistant is ready. Ask a question to get started.</p>

              <div className="welcome-suggestion-grid">
                {[
                  "Write code (HTML, CSS and JS) for a simple welcome page",
                  "Explain how APIs work in simple terms",
                  "Explain LangGraph simply and step-by-step",
                  "Give me a Python learning plan with projects",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="welcome-card"
                    onClick={() => void handleSend(suggestion)}
                    disabled={isLoading}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-flow">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userAvatarUrl={avatarUrl}
                  onRegenerate={
                    message.role === "assistant"
                      ? () => void retryLastMessage()
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {isLoading && (
            <div className="loading-chat-indicator" role="status">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span>Thinking...</span>

              <button
                type="button"
                className="stop-gen-btn"
                onClick={stopGenerating}
                aria-label="Stop generating"
              >
                <Square size={12} />
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

        {!isConversationsLoaded && (
          <p role="status" className="sr-only">Loading your conversations...</p>
        )}

        {/* Bottom Composer */}
        <footer className="chat-canvas-footer">
          <div className="composer-container">
            <ChatInput
              onSend={(message) => void handleSend(message)}
              isLoading={isLoading}
            />
          </div>
        </footer>
      </main>
    </div>
  );
}
