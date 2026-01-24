import { Metadata } from "next";
import { ResearchClient } from "./ResearchClient";

export const metadata: Metadata = {
  title: "Research Hub - NodeBench AI",
  description: "AI-powered research intelligence hub with executive briefings, signals, and deal radar",
};

/**
 * Research Hub Page - Server Component
 *
 * This is a thin server component wrapper that:
 * 1. Defines page metadata for SEO
 * 2. Delegates rendering to the client component
 *
 * The ResearchHub component uses many internal useQuery hooks and context
 * providers, so we use dynamic import with ssr: false in the client component.
 */
export default function ResearchPage() {
  return <ResearchClient />;
}
