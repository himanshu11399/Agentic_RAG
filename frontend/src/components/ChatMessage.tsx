import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Bot, User } from "lucide-react";
import MarkdownCode from "./MarkdownCode";
import type { Message } from "./ChatMessage.types";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ChatMessageProps {
  message: Message;
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

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const [copied, setCopied] = useState(false);
  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`message-row ${isUser ? "user-row" : "assistant-row"}`}>
      <div
        className={`message-avatar ${isUser ? "user-avatar" : "bot-avatar"}`}
      ></div>

      <div className="message-content">
        <div className="message-author">{isUser ? "You" : "Assistant"}</div>

        {isUser ? (
          <div className="message-text">{message.content}</div>
        ) : (
          <div className="message-text markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
            {isUser ? <User size={18} /> : <Bot size={18} />}
            {message.role === "assistant" && (
              <button
                type="button"
                className="message-action-button"
                onClick={() => void handleCopyMessage()}
                aria-label={copied ? "Response copied" : "Copy response"}
                title={copied ? "Copied!" : "Copy response"}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
