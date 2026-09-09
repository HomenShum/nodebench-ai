import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyCodeBlock } from "./LazyCodeBlock";

vi.mock("shiki", () => ({
  bundledLanguages: { json: () => {} },
  codeToTokens: vi.fn(async (code: string) => ({
    bg: "transparent",
    fg: "inherit",
    tokens: code.split("\n").map((content) => [{ content, color: "inherit" }]),
  })),
}));

const writeText = vi.fn<(code: string) => Promise<void>>();
beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("A trace reviewer copies the source being shown", () => {
  it("keeps a named copy action and caller styling while the lazy renderer loads", async () => {
    const code = "青山 🧭\n\n  <script>literal</script>\n";
    const view = render(
      <LazyCodeBlock
        code={code}
        language="json"
        showLineNumbers
        className="trace-code"
      />,
    );
    expect(view.getByRole("button", { name: "Copy code" })).toHaveTextContent(
      "Copy",
    );
    expect(view.container.querySelector(".trace-code")).not.toBeNull();
    expect(view.container.querySelector("pre code")?.textContent).toBe(code);
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    await view.findByRole("button", { name: "Code copied" });
    expect(writeText).toHaveBeenCalledWith(code);
    expect(view.container.querySelector("script")).toBeNull();
  });

  it("announces permission failure and lets the same reviewer retry", async () => {
    writeText.mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );
    const view = render(<LazyCodeBlock code={"retry source\n"} />);
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    expect(await view.findByRole("alert")).toHaveTextContent(
      "Try again or select the code manually",
    );
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    await view.findByRole("button", { name: "Code copied" });
    expect(view.queryByRole("alert")).toBeNull();
    expect(writeText.mock.calls).toEqual([
      ["retry source\n"],
      ["retry source\n"],
    ]);
  });

  it("does not mark a changed source copied when an older clipboard request resolves", async () => {
    let finish!: () => void;
    writeText.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<LazyCodeBlock code="old source" />);
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    view.rerender(<LazyCodeBlock code="new source" />);
    await act(async () => finish());
    expect(view.queryByRole("button", { name: "Code copied" })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    await view.findByRole("button", { name: "Code copied" });
    expect(writeText.mock.calls).toEqual([["old source"], ["new source"]]);
  });

  it("coalesces a burst of 12 clicks while one clipboard request is pending", async () => {
    let finish!: () => void;
    writeText.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<LazyCodeBlock code="one current source" />);
    const button = view.getByRole("button", { name: "Copy code" });
    for (let i = 0; i < 12; i++) fireEvent.click(button);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => finish());
    expect(
      view.getByRole("button", { name: "Code copied" }),
    ).not.toBeDisabled();
  });

  it("clears copied feedback and timers over 24 source changes and unmount", async () => {
    vi.useFakeTimers();
    const view = render(<LazyCodeBlock code="revision 0" />);
    for (let i = 0; i < 24; i++) {
      view.rerender(<LazyCodeBlock code={`revision ${i}`} />);
      await act(async () =>
        fireEvent.click(view.getByRole("button", { name: "Copy code" })),
      );
      expect(view.getByRole("button", { name: "Code copied" })).toBeVisible();
      view.rerender(<LazyCodeBlock code={`next ${i}`} />);
      expect(view.getByRole("button", { name: "Copy code" })).toBeVisible();
      act(() => vi.advanceTimersByTime(2500));
      expect(view.queryByRole("button", { name: "Code copied" })).toBeNull();
    }
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("offers manual selection when the browser has no clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    const view = render(<LazyCodeBlock code={"manual\n\n  source\n"} />);
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    expect(await view.findByRole("alert")).toHaveTextContent(
      "select the code manually",
    );
    expect(view.container.querySelector("pre code")?.textContent).toBe(
      "manual\n\n  source\n",
    );
  });

  it("copies an empty source without submitting its surrounding review form", async () => {
    const submit = vi.fn((event) => event.preventDefault());
    const view = render(
      <form onSubmit={submit}>
        <LazyCodeBlock code="" />
      </form>,
    );
    fireEvent.click(view.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(""));
    expect(submit).not.toHaveBeenCalled();
    expect(view.container.querySelector("pre code")?.textContent).toBe("");
  });
});
