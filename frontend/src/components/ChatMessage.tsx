import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, RotateCcw, ThumbsUp, ThumbsDown, User } from "lucide-react";

import ChatGptIcon from "./ChatGptIcon";
import MarkdownCode from "./MarkdownCode";
import type { Message } from "./ChatMessage.types";

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  userAvatarUrl?: string;
}

const markdownComponents: Components = {
  code: ({ className, children }) => (
    <MarkdownCode className={className}>{children}</MarkdownCode>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export default function ChatMessage({
  message,
  onRegenerate,
  userAvatarUrl = "/avatar.jpg",
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (isUser) {
    return (
      <div className="chat-msg-row user-msg-row">
        <div className="user-msg-container">
          <div className="user-msg-bubble">
            <div className="user-msg-text">{message.content}</div>
          </div>
          <div className="user-avatar-wrap">
            <img
              src={userAvatarUrl}
              alt="User"
              className="user-profile-img"
              onError={(e) => {
                // Fallback to icon if avatar image fails to load
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        </div>

        <div className="user-msg-footer">
          <span className="msg-timestamp">Just now</span>
          <button type="button" className="msg-action-btn edit-btn">
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-msg-row assistant-msg-row">
      <div className="assistant-msg-card">
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>

      <div className="assistant-msg-footer">
        <div className="bot-circle-avatar" aria-label="ChatGPT">
          <ChatGptIcon size={20} />
        </div>

        <div className="assistant-actions">
          <span className="msg-timestamp">Just now</span>

          <button
            type="button"
            className="msg-action-btn"
            onClick={() => void handleCopyMessage()}
            aria-label={copied ? "Response copied" : "Copy response"}
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {onRegenerate && (
            <button
              type="button"
              className="msg-action-btn"
              onClick={onRegenerate}
              aria-label="Regenerate response"
            >
              <RotateCcw size={12} />
              <span>Regenerate response</span>
            </button>
          )}

          <div className="feedback-btns">
            <button
              type="button"
              className={`feedback-btn ${feedback === "up" ? "active" : ""}`}
              onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
              aria-label="Thumbs up"
            >
              <ThumbsUp size={13} />
            </button>
            <button
              type="button"
              className={`feedback-btn ${feedback === "down" ? "active" : ""}`}
              onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
              aria-label="Thumbs down"
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
