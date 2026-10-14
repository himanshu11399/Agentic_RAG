const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ConversationsResponse {
  conversations: ConversationSummary[];
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
  getToken?: () => Promise<string | null>,
  conversationId?: string,
): Promise<ChatResponse> {
  let token: string | null = null;

  if (getToken) {
    try {
      token = await getToken();
    } catch {
      throw new ChatApiError(
        "Unable to retrieve your authentication token. Please sign in again.",
      );
    }

    if (!token) {
      throw new ChatApiError(
        "Your session has expired. Please sign in again.",
        401,
      );
    }
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        history: history.slice(-20),
        ...(conversationId ? { conversation_id: conversationId } : {}),
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

  return data;
}

export async function listConversations(
  getToken: () => Promise<string | null>,
): Promise<ConversationSummary[]> {
  let token: string | null;

  try {
    token = await getToken();
  } catch {
    throw new ChatApiError(
      "Unable to retrieve your authentication token. Please sign in again.",
    );
  }

  if (!token) {
    throw new ChatApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new ChatApiError(
      "Unable to connect to the server. Check that the backend is running.",
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

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new ChatApiError(
      "The server returned an unexpected conversations response.",
    );
  }

  return data as ConversationSummary[];
}

export async function getConversationMessages(
  conversationId: string,
  getToken: () => Promise<string | null>,
): Promise<SavedMessage[]> {
  let token: string | null;

  try {
    token = await getToken();
  } catch {
    throw new ChatApiError(
      "Unable to retrieve your authentication token. Please sign in again.",
    );
  }

  if (!token) {
    throw new ChatApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    throw new ChatApiError(
      "Unable to connect to the server. Check that the backend is running.",
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

  const data: unknown = await response.json();

  if (
    !Array.isArray(data) ||
    !data.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        typeof item.created_at === "string",
    )
  ) {
    throw new ChatApiError(
      "The server returned invalid conversation messages.",
    );
  }

  return data as SavedMessage[];
}

export async function renameConversation(
  conversationId: string,
  title: string,
  getToken: () => Promise<string | null>,
): Promise<ConversationSummary> {
  let token: string | null;

  try {
    token = await getToken();
  } catch {
    throw new ChatApiError(
      "Unable to retrieve your authentication token. Please sign in again.",
    );
  }

  if (!token) {
    throw new ChatApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      },
    );
  } catch {
    throw new ChatApiError("Unable to connect to the AI server.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const detail =
      typeof errorBody?.detail === "string"
        ? errorBody.detail
        : `The server returned an error (${response.status}).`;

    throw new ChatApiError(detail, response.status);
  }

  return (await response.json()) as ConversationSummary;
}

export async function deleteConversation(
  conversationId: string,
  getToken: () => Promise<string | null>,
): Promise<void> {
  let token: string | null;

  try {
    token = await getToken();
  } catch {
    throw new ChatApiError(
      "Unable to retrieve your authentication token. Please sign in again.",
    );
  }

  if (!token) {
    throw new ChatApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    throw new ChatApiError("Unable to connect to the AI server.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const detail =
      typeof errorBody?.detail === "string"
        ? errorBody.detail
        : `The server returned an error (${response.status}).`;

    throw new ChatApiError(detail, response.status);
  }
}

export async function createConversation(
  title: string,
  getToken: () => Promise<string | null>,
): Promise<ConversationSummary> {
  let token: string | null;

  try {
    token = await getToken();
  } catch {
    throw new ChatApiError(
      "Unable to retrieve your authentication token. Please sign in again.",
    );
  }

  if (!token) {
    throw new ChatApiError(
      "Your session has expired. Please sign in again.",
      401,
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });
  } catch {
    throw new ChatApiError("Unable to connect to the AI server.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    const detail =
      typeof errorBody?.detail === "string"
        ? errorBody.detail
        : `The server returned an error (${response.status}).`;

    throw new ChatApiError(detail, response.status);
  }

  return (await response.json()) as ConversationSummary;
}
