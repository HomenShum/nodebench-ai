import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("shiki", () => ({
  bundledLanguages: { json: () => {}, typescript: () => {} },
  codeToTokens: vi.fn(),
}));

import { codeToTokens } from "shiki";
import { CodeBlockContent } from "./code-block";

const tokenize = vi.mocked(codeToTokens);
const result = (code: string) => ({
  bg: "transparent",
  fg: "inherit",
  tokens: code
    .split("\n")
    .map((content) => [{ content, color: "#123456", offset: 0 }]),
});
const deferred = () => {
  let resolve!: (value: ReturnType<typeof result>) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<ReturnType<typeof result>>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const content = (container: HTMLElement) =>
  container.querySelector("pre code")?.textContent;

beforeEach(() => {
  tokenize.mockReset();
  tokenize.mockImplementation(async (code) => result(code) as any);
});
afterEach(cleanup);

describe("A reviewer reads exact agent output while highlighting is optional", () => {
  it("never shows an older equal-length source when its delayed highlight finishes last", async () => {
    const first = deferred(),
      second = deferred();
    tokenize
      .mockReturnValueOnce(first.promise as any)
      .mockReturnValueOnce(second.promise as any);
    const edges = "edge".repeat(40);
    const a = `${edges}const x = 1;${edges}`,
      b = `${edges}const y = 2;${edges}`;
    expect(a.length).toBe(b.length);
    const view = render(<CodeBlockContent code={a} language="typescript" />);
    expect(content(view.container)).toBe(a);
    view.rerender(<CodeBlockContent code={b} language="typescript" />);
    expect(content(view.container)).toBe(b);
    await act(async () => second.resolve(result(b)));
    await act(async () => first.resolve(result(a)));
    expect(content(view.container)).toBe(b);
    expect(
      view.container.querySelector('[style*="rgb(18, 52, 86)"]'),
    ).not.toBeNull();
  });

  it("keeps 12 concurrent reviews distinct when their highlighting completes in reverse order", async () => {
    const jobs = Array.from({ length: 12 }, deferred);
    jobs.forEach((job) => tokenize.mockReturnValueOnce(job.promise as any));
    const codes = jobs.map((_, i) =>
      JSON.stringify(
        { reviewer: i, source: `青山 ${i}`, note: "<script>literal</script>" },
        null,
        2,
      ),
    );
    const view = render(
      <>
        {codes.map((code, i) => (
          <CodeBlockContent key={i} code={code} language="json" />
        ))}
      </>,
    );
    await act(async () => {
      for (let i = jobs.length - 1; i >= 0; i--)
        jobs[i].resolve(result(codes[i]));
    });
    expect(
      [...view.container.querySelectorAll("pre code")].map(
        (el) => el.textContent,
      ),
    ).toEqual(codes);
    expect(view.container.querySelector("script")).toBeNull();
  });

  it("preserves 256 sustained source updates without reusing an earlier snippet", async () => {
    const view = render(<CodeBlockContent code="start" language="json" />);
    for (let i = 0; i < 256; i++) {
      const code = `\n\n{ "revision": ${i}, "source": "中文 🧭" }\n`;
      await act(async () =>
        view.rerender(<CodeBlockContent code={code} language="json" />),
      );
      expect(content(view.container)).toBe(code);
    }
    expect(view.container.querySelectorAll("pre")).toHaveLength(1);
  });

  it("shows the exact source after a rejected grammar load and can highlight a later source", async () => {
    tokenize.mockRejectedValueOnce(new Error("controlled grammar failure"));
    const view = render(
      <CodeBlockContent code={"unavailable\n\n"} language="json" />,
    );
    await act(async () => {});
    expect(content(view.container)).toBe("unavailable\n\n");
    await act(async () =>
      view.rerender(<CodeBlockContent code={"recovered\n"} language="json" />),
    );
    expect(content(view.container)).toBe("recovered\n");
    expect(
      view.container.querySelector('[style*="rgb(18, 52, 86)"]'),
    ).not.toBeNull();
  });

  it("uses readable source for unknown, prototype-shaped, and plain-text language labels", () => {
    const view = render(
      <CodeBlockContent
        code={"literal\n\n  中文\n"}
        language="unknown-language"
      />,
    );
    for (const language of [
      "text",
      "plaintext",
      "constructor",
      "__proto__",
      "unknown-language",
    ]) {
      view.rerender(
        <CodeBlockContent code={"literal\n\n  中文\n"} language={language} />,
      );
      expect(content(view.container)).toBe("literal\n\n  中文\n");
    }
    expect(tokenize).not.toHaveBeenCalled();
  });

  it("preserves an oversized trace entirely without sending it to a synchronous grammar", () => {
    const code = "large trace\n".repeat(6000) + "尾部";
    const view = render(<CodeBlockContent code={code} language="json" />);
    expect(content(view.container)).toBe(code);
    expect(tokenize).not.toHaveBeenCalled();
  });

  it("keeps blank lines, indentation, trailing newlines and HTML-like input as selectable text", async () => {
    const code =
      '\nconst markup = "<img src=x onerror=alert(1)>";\n\n  中文 🧭\n';
    const view = render(
      <CodeBlockContent code={code} language="typescript" showLineNumbers />,
    );
    expect(content(view.container)).toBe(code);
    await act(async () => {});
    expect(content(view.container)).toBe(code);
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.getByRole("region")).toHaveAttribute("tabindex", "0");
  });

  it("ignores results belonging to an unmounted reviewer", async () => {
    const pending = deferred();
    tokenize.mockReturnValueOnce(pending.promise as any);
    const old = render(
      <CodeBlockContent code="closed review" language="json" />,
    );
    old.unmount();
    const current = render(
      <CodeBlockContent code="current review" language="json" />,
    );
    await act(async () => pending.resolve(result("closed review")));
    expect(content(current.container)).toBe("current review");
  });
});
