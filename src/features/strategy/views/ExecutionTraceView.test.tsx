import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExecutionTraceView } from "./ExecutionTraceView";

describe("ExecutionTraceView", () => {
  it("renders the overview and can switch to the JSON contract", () => {
    render(<ExecutionTraceView />);

    expect(screen.getByText(/Spreadsheet workflow: inspect, research, edit, verify, export/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Structured Decisions/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /json contract/i }));

    expect(screen.getByText(/Typed Output/i)).toBeInTheDocument();
    expect(screen.getByText(/Schema Contract/i)).toBeInTheDocument();
  });
});
