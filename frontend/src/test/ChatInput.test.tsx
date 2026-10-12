import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChatInput from "../components/ChatInput.tsx";

describe("ChatInput", () => {
  it("submits a message when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} isLoading={false} />);

    const textbox = screen.getByRole("textbox");

    await user.type(textbox, "Hello assistant");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello assistant");
  });

  it("does not submit an empty message", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} isLoading={false} />);

    await user.keyboard("{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the input while loading", () => {
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} isLoading={true} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
