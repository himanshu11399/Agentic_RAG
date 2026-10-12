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
  const language = /language-([\w-]+)/.exec(className || "")?.[1];
  const code = String(children ?? "").replace(/\n$/, "");

  // Inline code, such as `npm install`.
  if (!language) {
    return <code className="inline-code">{children}</code>;
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language}</span>
        <button
          type="button"
          className="copy-code-button"
          onClick={() => void copyCode()}
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
