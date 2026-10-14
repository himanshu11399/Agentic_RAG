const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export class ChatApiError extends Error {
  public readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

export async function sendMessage(
  message: string,
  history: ChatHistoryItem[] = [],
  signal?: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: history.slice(-20),
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new ChatApiError(
      "Unable to connect to the AI server. Check that the backend is running.",
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    const detail =
      typeof errorBody?.detail === "string"
        ? errorBody.detail
        : `The server returned an error (${response.status}).`;
    throw new ChatApiError(detail, response.status);
  }
  let data: ChatResponse;
  try {
    data = await response.json();
  } catch {
    throw new ChatApiError("The server returned an invalid response.");
  }

  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new ChatApiError("The AI returned an empty or invalid response.");
  }

  return data.reply;
}
