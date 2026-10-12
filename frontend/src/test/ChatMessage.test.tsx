import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ChatMessage from "../components/ChatMessage.tsx";
import type { Message } from "../components/ChatMessage.types";

describe("ChatMessage", () => {
  it("renders assistant Markdown headings and lists", () => {
    const message: Message = {
      id: "test-1",
      role: "assistant",
      content: "## LangGraph\n\n- Nodes\n- Edges",
    };

    render(<ChatMessage message={message} />);

    expect(
      screen.getByRole("heading", { name: "LangGraph" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Nodes")).toBeInTheDocument();
    expect(screen.getByText("Edges")).toBeInTheDocument();
  });

  it("renders user messages as text", () => {
    const message: Message = {
      id: "test-2",
      role: "user",
      content: "Explain APIs simply",
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("Explain APIs simply")).toBeInTheDocument();
  });
});
