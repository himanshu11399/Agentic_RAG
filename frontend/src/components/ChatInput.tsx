import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, LoaderCircle, PlusCircle } from "lucide-react";

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
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
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
    <form ref={formRef} className="pill-composer" onSubmit={handleSubmit}>
      <button
        type="button"
        className="composer-add-btn"
        aria-label="Commands and attachments"
        title="Commands"
      >
        <PlusCircle size={20} />
      </button>

      <textarea
        ref={textareaRef}
        aria-label="Message your AI assistant"
        placeholder="Type '/' for commands"
        value={message}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        maxLength={MAX_LENGTH}
        rows={1}
      />

      <button
        type="submit"
        className="green-send-btn"
        aria-label={isLoading ? "Sending message" : "Send message"}
        title={isLoading ? "Sending message..." : "Send message"}
        disabled={!canSend}
      >
        {isLoading ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <ArrowUp size={18} />
        )}
      </button>
    </form>
  );
}
