/* @vitest-environment jsdom */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AgentChats } from "../AgentChats";

vi.mock("convex/react", async () => {
  const threads = [
    { threadId: "d1", title: "Chat — Product Ideas", lastModified: Date.now(), messageCount: 5, lastMessage: { role: "assistant", text: "Here are ideas...", createdAt: Date.now() } },
    { threadId: "d2", title: "Chat — Debugging", lastModified: Date.now() - 1000, messageCount: 2 },
  ];
  return {
    useQuery: () => threads,
  } as any;
});

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("AgentChats table", () => {
  it("renders rows for chat threads", () => {
    render(<AgentChats />);
    const table = screen.getByRole("table");
    expect(table).toBeTruthy();
    // titles visible as buttons
    expect(screen.getByText("Chat — Product Ideas")).toBeTruthy();
    expect(screen.getByText("Chat — Debugging")).toBeTruthy();
  });
});

