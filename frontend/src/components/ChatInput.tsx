import { FormEvent, useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = message.trim();

    if (!trimmed || isLoading) return;

    onSend(trimmed);
    setMessage("");
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Message your AI assistant..."
        aria-label="Message your AI assistant"
        rows={1}
        maxLength={10000}
        disabled={isLoading}
      />

      <button
        className="send-button"
        type="submit"
        disabled={isLoading || !message.trim()}
        aria-label="Send message"
      >
        {isLoading ? (
          <LoaderCircle size={19} className="spin" />
        ) : (
          <ArrowUp size={20} />
        )}
      </button>
    </form>
  );
}
