import {
  Component,
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const HighlightedContent = lazy(() =>
  import("@/components/ai-elements/code-block").then(
    ({ CodeBlockContent }) => ({
      default: CodeBlockContent,
    }),
  ),
);

interface LazyCodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

function PlainCode({ code, showLineNumbers }: LazyCodeBlockProps) {
  const lines = code.split("\n");
  return (
    <pre
      className="m-0 overflow-auto p-4 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      tabIndex={0}
      role="region"
      aria-label="Plain text code"
    >
      <code className="[counter-reset:line]">
        {lines.map((line, index) => (
          <Fragment key={index}>
            <span
              className={cn(
                showLineNumbers &&
                  "before:mr-4 before:inline-block before:w-8 before:select-none before:text-right before:text-muted-foreground/50 before:content-[counter(line)] before:[counter-increment:line]",
              )}
            >
              {line}
            </span>
            {index < lines.length - 1 ? "\n" : null}
          </Fragment>
        ))}
      </code>
    </pre>
  );
}

class HighlightBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <>
        <p role="status" className="px-3 pt-2 text-xs text-muted-foreground">
          Syntax highlighting unavailable. Code can still be copied.
        </p>
        {this.props.fallback}
      </>
    ) : (
      this.props.children
    );
  }
}

/** A stable, copyable source display while the shared Shiki renderer loads. */
export function LazyCodeBlock({
  code,
  language = "text",
  showLineNumbers = false,
  className,
}: LazyCodeBlockProps) {
  const [feedback, setFeedback] = useState<{
    code: string;
    state: "idle" | "copying" | "copied" | "failed";
  }>({ code, state: "idle" });
  const request = useRef(0);
  const copying = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const state = feedback.code === code ? feedback.state : "idle";

  useEffect(() => {
    setFeedback({ code, state: "idle" });
    return () => {
      request.current += 1;
      copying.current = false;
      clearTimeout(timer.current);
    };
  }, [code]);

  async function copyCode() {
    if (copying.current) return;
    copying.current = true;
    const current = ++request.current;
    clearTimeout(timer.current);
    setFeedback({ code, state: "copying" });
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      if (request.current !== current) return;
      setFeedback({ code, state: "copied" });
      timer.current = setTimeout(
        () => setFeedback({ code, state: "idle" }),
        2000,
      );
    } catch {
      if (request.current === current) setFeedback({ code, state: "failed" });
    } finally {
      if (request.current === current) copying.current = false;
    }
  }

  const fallback = <PlainCode code={code} showLineNumbers={showLineNumbers} />;
  return (
    <div
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-md border bg-background text-foreground",
        className,
      )}
      data-language={language}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 border-b bg-muted/80 px-3 py-1.5">
        <span
          className="min-w-0 truncate font-mono text-xs text-muted-foreground"
          title={language}
        >
          {language}
        </span>
        <button
          type="button"
          onClick={copyCode}
          disabled={state === "copying"}
          aria-label={state === "copied" ? "Code copied" : "Copy code"}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-safe:transition-colors"
        >
          {state === "copied" ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {state === "copying"
            ? "Copying…"
            : state === "copied"
              ? "Copied"
              : "Copy"}
        </button>
      </div>
      <p
        role={state === "failed" ? "alert" : "status"}
        className={cn(
          "transition-none",
          state === "failed"
            ? "px-3 pt-2 text-sm text-red-700 dark:text-red-300"
            : "sr-only",
        )}
      >
        {state === "failed"
          ? "Could not copy. Try again or select the code manually."
          : state === "copied"
            ? "Code copied."
            : ""}
      </p>
      <HighlightBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <HighlightedContent
            code={code}
            language={language}
            showLineNumbers={showLineNumbers}
          />
        </Suspense>
      </HighlightBoundary>
    </div>
  );
}

export default LazyCodeBlock;
