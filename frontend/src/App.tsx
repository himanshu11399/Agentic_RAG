import { useEffect, useRef, useState } from "react";
import { Menu, Sparkles, SquarePen } from "lucide-react";

import ChatMessage from "./components/ChatMessage";
import type { Message } from "./components/ChatMessage.types";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import { sendMessage } from "./services/chatApi";
import "./App.css";

const REQUEST_TIMEOUT_MS = 60_000;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  function newChat() {
    requestRef.current?.abort();
    requestRef.current = null;

    setMessages([]);
    setError("");
    setIsLoading(false);
  }

  async function requestReply(content: string, history: Message[]) {
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

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
        },
      ]);
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

    const history = messages.slice(-20);

    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
      },
    ]);

    await requestReply(content.trim(), history);
  }

  async function retryLastMessage() {
    if (requestRef.current) return;

    const lastIndex = messages.length - 1;
    const lastMessage = messages[lastIndex];

    // Retry only when the latest message is a failed user message.
    if (!lastMessage || lastMessage.role !== "user" || !error) {
      return;
    }

    // Exclude the failed message itself to avoid sending it twice.
    const history = messages.slice(0, lastIndex).slice(-20);

    await requestReply(lastMessage.content, history);
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <Sidebar onNewChat={newChat} onClose={() => setSidebarOpen(false)} />
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
            <span className="model-label">V1</span>
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
