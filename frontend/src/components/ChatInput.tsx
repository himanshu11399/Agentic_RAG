import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const MAX_LENGTH = 10_000;

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const canSend = message.trim().length > 0 && !isLoading;

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 200 ? "auto" : "hidden";
  }

  function handleChange(value: string) {
    setMessage(value.slice(0, MAX_LENGTH));
    requestAnimationFrame(resizeTextarea);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || isLoading) return;

    onSend(trimmedMessage);
    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} className="composer" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        aria-label="Message your AI assistant"
        placeholder="Message your AI assistant..."
        value={message}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        maxLength={MAX_LENGTH}
        rows={1}
      />

      <button
        type="submit"
        className="send-button"
        aria-label={isLoading ? "Sending message" : "Send message"}
        title={isLoading ? "Sending message..." : "Send message"}
        disabled={!canSend}
      >
        {isLoading ? (
          <LoaderCircle className="spin" size={19} />
        ) : (
          <ArrowUp size={20} />
        )}
      </button>
    </form>
  );
}
