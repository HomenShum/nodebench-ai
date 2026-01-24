/**
 * Lazy-loaded SyntaxHighlighter component
 * Reduces initial bundle size by ~130KB by loading react-syntax-highlighter on demand
 */

import React, { Suspense, lazy } from 'react';

// Lazy load the heavy syntax highlighter
const SyntaxHighlighterLazy = lazy(() =>
  import('react-syntax-highlighter').then((mod) => ({
    default: mod.Prism,
  }))
);

// Lazy load the style separately
const loadStyle = () =>
  import('react-syntax-highlighter/dist/esm/styles/prism').then(
    (mod) => mod.vscDarkPlus
  );

// Cache the style once loaded
let cachedStyle: any = null;
const getStyle = async () => {
  if (!cachedStyle) {
    cachedStyle = await loadStyle();
  }
  return cachedStyle;
};

interface LazySyntaxHighlighterProps {
  language: string;
  children: string;
  PreTag?: keyof JSX.IntrinsicElements;
  className?: string;
}

// Simple fallback that shows code without highlighting
function CodeFallback({ children, className }: { children: string; className?: string }) {
  return (
    <pre className={className}>
      <code className="text-sm font-mono text-slate-300 whitespace-pre-wrap">
        {children}
      </code>
    </pre>
  );
}

// Inner component that uses the loaded highlighter
function SyntaxHighlighterInner({
  language,
  children,
  PreTag = 'div',
  className,
}: LazySyntaxHighlighterProps) {
  const [style, setStyle] = React.useState<any>(cachedStyle);

  React.useEffect(() => {
    if (!style) {
      getStyle().then(setStyle);
    }
  }, [style]);

  if (!style) {
    return <CodeFallback className={className}>{children}</CodeFallback>;
  }

  return (
    <SyntaxHighlighterLazy
      style={style}
      language={language}
      PreTag={PreTag}
      className={className}
    >
      {children}
    </SyntaxHighlighterLazy>
  );
}

/**
 * Lazy-loaded syntax highlighter with fallback
 * Use this instead of importing react-syntax-highlighter directly
 */
export function LazySyntaxHighlighter(props: LazySyntaxHighlighterProps) {
  return (
    <Suspense fallback={<CodeFallback className={props.className}>{props.children}</CodeFallback>}>
      <SyntaxHighlighterInner {...props} />
    </Suspense>
  );
}

export default LazySyntaxHighlighter;
