import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConversationProgressCard, type ConversationProgressItem } from "./ChatHome";

const progressItems: ConversationProgressItem[] = [
  {
    id: "sources",
    label: "Gather current sources",
    detail: "Searching and checking the first references.",
    state: "active",
    children: [
      { id: "source-1", label: "linkedin.com", tone: "active" },
      { id: "source-2", label: "crunchbase.com", tone: "pending" },
    ],
  },
  {
    id: "answer",
    label: "Draft the first answer",
    detail: "Compiling sections and contradictions.",
    state: "pending",
  },
];

describe("ConversationProgressCard", () => {
  it("lets the active task collapse after the initial auto-expand", () => {
    render(
      <ConversationProgressCard
        progressItems={progressItems}
        completedProgressCount={0}
        isStreaming
        defaultCollapsed={false}
      />,
    );

    expect(screen.getByText("linkedin.com")).toBeInTheDocument();
    expect(screen.getByText("crunchbase.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /gather current sources/i }));

    expect(screen.queryByText("linkedin.com")).not.toBeInTheDocument();
    expect(screen.queryByText("crunchbase.com")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gather current sources/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
