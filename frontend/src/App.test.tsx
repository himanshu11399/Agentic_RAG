import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  sendMessage,
  listConversations,
  getConversationMessages,
  createConversation,
  renameConversation,
  deleteConversation,
} from "./services/chatApi";

import App from "./App";

vi.mock("./services/chatApi", () => ({
  sendMessage: vi.fn(),
  listConversations: vi.fn(),
  getConversationMessages: vi.fn(),
  createConversation: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

const mockGetToken = vi.fn().mockResolvedValue("test-token");

vi.mock("@clerk/react", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: mockGetToken,
    userId: "test-user",
  }),
}));

const mockedSendMessage = vi.mocked(sendMessage);
const mockedListConversations = vi.mocked(listConversations);
const mockedGetConversationMessages = vi.mocked(getConversationMessages);
const mockedCreateConversation = vi.mocked(createConversation);
const mockedRenameConversation = vi.mocked(renameConversation);
const mockedDeleteConversation = vi.mocked(deleteConversation);

async function renderApp() {
  render(<App />);

  await waitFor(() => {
    expect(mockedListConversations).toHaveBeenCalled();
  });

  // Wait until the conversation-loading request has completed.
  await waitFor(() => {
    expect(
      screen.queryByText("Loading your conversations..."),
    ).not.toBeInTheDocument();
  });
}

describe("App chat flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockGetToken.mockResolvedValue("test-token");
    mockedListConversations.mockResolvedValue([]);
    mockedGetConversationMessages.mockResolvedValue([]);

    mockedCreateConversation.mockResolvedValue({
      id: "test-conversation-1",
      title: "New Chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // jsdom does not implement browser scrolling.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("sends a message and displays the assistant reply", async () => {
    const user = userEvent.setup();

    mockedSendMessage.mockResolvedValueOnce({
      reply: "Hello! I am your AI assistant.",
      conversation_id: "test-conversation-1",
    });

    await renderApp();

    await user.type(
      screen.getByRole("textbox", {
        name: /message your ai assistant/i,
      }),
      "Hello assistant",
    );
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("Hello! I am your AI assistant."),
    ).toBeInTheDocument();

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "Hello assistant",
      [],
      expect.any(AbortSignal),
      expect.any(Function),
      undefined,
    );
  });

  it("shows an error and retries a failed request", async () => {
    const user = userEvent.setup();

    mockedSendMessage
      .mockRejectedValueOnce(new Error("Server unavailable"))
      .mockResolvedValueOnce({
        reply: "The retry worked!",
        conversation_id: "test-conversation-2",
      });

    await renderApp();

    await user.type(
      screen.getByRole("textbox", {
        name: /message your ai assistant/i,
      }),
      "Test retry",
    );
    await user.keyboard("{Enter}");

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent("Server unavailable");

    await user.click(
      screen.getByRole("button", {
        name: /^retry$/i,
      }),
    );

    expect(await screen.findByText("The retry worked!")).toBeInTheDocument();

    expect(mockedSendMessage).toHaveBeenCalledTimes(2);
  });

  it("clears the conversation when New Chat is clicked", async () => {
    const user = userEvent.setup();

    mockedSendMessage.mockResolvedValueOnce({
      reply: "This message will be cleared.",
      conversation_id: "test-conversation-3",
    });

    await renderApp();

    await user.type(
      screen.getByRole("textbox", {
        name: /message your ai assistant/i,
      }),
      "Start a conversation",
    );
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("This message will be cleared."),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: /new chat/i }).at(-1)!,
    );

    await waitFor(() => {
      expect(
        screen.queryByText("This message will be cleared."),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", {
        name: "How can I help you today?",
      }),
    ).toBeInTheDocument();
  });

  it("loads and displays saved messages when an existing conversation is active", async () => {
    mockedListConversations.mockResolvedValueOnce([
      {
        id: "server-conv-1",
        title: "Previous Chat",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    mockedGetConversationMessages.mockResolvedValueOnce([
      {
        id: "msg-1",
        role: "user",
        content: "What is React?",
        created_at: new Date().toISOString(),
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "React is a UI library.",
        created_at: new Date().toISOString(),
      },
    ]);

    await renderApp();

    expect(await screen.findByText("What is React?")).toBeInTheDocument();
    expect(await screen.findByText("React is a UI library.")).toBeInTheDocument();
  });

  it("renames a conversation", async () => {
    const user = userEvent.setup();

    mockedListConversations.mockResolvedValueOnce([
      {
        id: "server-conv-1",
        title: "Old Title",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    mockedRenameConversation.mockResolvedValueOnce({
      id: "server-conv-1",
      title: "Updated Title",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await renderApp();

    const renameBtn = screen.getByRole("button", { name: /rename old title/i });
    await user.click(renameBtn);

    const input = screen.getByRole("textbox", { name: "Conversation title" });
    await user.clear(input);
    await user.type(input, "Updated Title");
    await user.keyboard("{Enter}");

    expect(mockedRenameConversation).toHaveBeenCalledWith(
      "server-conv-1",
      "Updated Title",
      expect.any(Function),
    );
    expect(await screen.findByText("Updated Title")).toBeInTheDocument();
  });

  it("deletes a conversation", async () => {
    const user = userEvent.setup();

    mockedListConversations.mockResolvedValueOnce([
      {
        id: "server-conv-1",
        title: "To Be Deleted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    mockedDeleteConversation.mockResolvedValueOnce(undefined);

    await renderApp();

    const deleteBtn = screen.getByRole("button", { name: /delete to be deleted/i });
    await user.click(deleteBtn);

    expect(mockedDeleteConversation).toHaveBeenCalledWith(
      "server-conv-1",
      expect.any(Function),
    );

    await waitFor(() => {
      expect(screen.queryByText("To Be Deleted")).not.toBeInTheDocument();
    });
  });
});
