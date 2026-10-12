import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import { sendMessage } from "./services/chatApi";

vi.mock("./services/chatApi", () => ({
  sendMessage: vi.fn(),
}));

const mockedSendMessage = vi.mocked(sendMessage);

describe("App chat flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // jsdom does not implement browser scrolling.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("sends a message and displays the assistant reply", async () => {
    const user = userEvent.setup();

    mockedSendMessage.mockResolvedValueOnce("Hello! I am your AI assistant.");

    render(<App />);

    await user.type(screen.getByRole("textbox"), "Hello assistant");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("Hello! I am your AI assistant."),
    ).toBeInTheDocument();

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "Hello assistant",
      [],
      expect.any(AbortSignal),
    );
  });

  it("shows an error and retries a failed request", async () => {
    const user = userEvent.setup();

    mockedSendMessage
      .mockRejectedValueOnce(new Error("Server unavailable"))
      .mockResolvedValueOnce("The retry worked!");

    render(<App />);

    await user.type(screen.getByRole("textbox"), "Test retry");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Server unavailable",
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("The retry worked!")).toBeInTheDocument();

    expect(mockedSendMessage).toHaveBeenCalledTimes(2);
  });

  it("clears the conversation when New Chat is clicked", async () => {
    const user = userEvent.setup();

    mockedSendMessage.mockResolvedValueOnce("This message will be cleared.");

    render(<App />);

    await user.type(screen.getByRole("textbox"), "Start a conversation");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText("This message will be cleared."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /new chat/i }));

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
});
