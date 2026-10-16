import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownCodeProps {
  className?: string;
  children?: ReactNode;
}

export default function MarkdownCode({
  className,
  children,
}: MarkdownCodeProps) {
  const [copied, setCopied] = useState(false);
  const language = /language-([\w-]+)/.exec(className || "")?.[1] || "";
  const code = String(children ?? "").replace(/\n$/, "");

  // Inline code, such as `npm install`.
  if (!language && !code.includes("\n")) {
    return <code className="inline-code">{children}</code>;
  }

  const lines = code.split("\n");
  const displayLang = language.toUpperCase() || "CODE";

  // Provide realistic tabs like HTML, CSS, JS or dynamic
  const tabs =
    displayLang === "JS" || displayLang === "JAVASCRIPT"
      ? ["HTML", "CSS", "JS"]
      : displayLang === "HTML"
      ? ["HTML", "CSS", "JS"]
      : displayLang === "CSS"
      ? ["HTML", "CSS", "JS"]
      : [displayLang];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div className="code-block-tabs">
          {tabs.map((tab) => {
            const isActive =
              tab === displayLang ||
              (tab === "JS" && (displayLang === "JS" || displayLang === "JAVASCRIPT")) ||
              (tabs.length === 1);
            return (
              <span
                key={tab}
                className={`code-tab ${isActive ? "active-tab" : ""}`}
              >
                {tab}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          className="copy-code-btn"
          onClick={() => void copyCode()}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      <div className="code-content-wrapper">
        <div className="line-numbers" aria-hidden="true">
          {lines.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre className="code-pre">
          <code className={className}>{children}</code>
        </pre>
      </div>
    </div>
  );
}
