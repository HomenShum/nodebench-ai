import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LazyCodeBlock } from "./LazyCodeBlock";

vi.mock("@/components/ai-elements/code-block", () => {
  throw new Error("controlled missing renderer chunk");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps a review's source and copy action when its renderer chunk cannot load", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const code = "first\n\n  中文 <script>literal</script>\n";
  const view = render(<LazyCodeBlock code={code} showLineNumbers />);
  expect(
    await view.findByText(
      "Syntax highlighting unavailable. Code can still be copied.",
    ),
  ).toBeVisible();
  expect(view.container.querySelector("pre code")?.textContent).toBe(code);
  fireEvent.click(view.getByRole("button", { name: "Copy code" }));
  await view.findByRole("button", { name: "Code copied" });
  expect(writeText).toHaveBeenCalledWith(code);
  expect(view.container.querySelector("script")).toBeNull();
  expect(errors).toHaveBeenCalled(); // React reports the caught chunk failure.
});
