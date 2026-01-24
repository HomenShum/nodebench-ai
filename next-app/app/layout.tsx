import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex-client";
import { Navigation } from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://next-app-khaki-five.vercel.app';

export const metadata: Metadata = {
  title: {
    default: "NodeBench AI - Benchmark AI Research Agents",
    template: "%s | NodeBench AI",
  },
  description: "Benchmark AI agent research capabilities on node-based knowledge graphs. Store context in traversable nodes, measure agent performance, and scale intelligent research workflows.",
  keywords: [
    "AI agent benchmarking",
    "knowledge graph",
    "AI research agents",
    "node-based context",
    "agent performance",
    "research automation",
    "knowledge nodes",
    "AI workflow",
    "agent evaluation",
    "context storage",
  ],
  authors: [{ name: "NodeBench AI" }],
  creator: "NodeBench AI",
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "NodeBench AI",
    title: "NodeBench AI - Benchmark AI Research Agents",
    description: "Benchmark AI agent research capabilities on node-based knowledge graphs. Store context in traversable nodes and measure agent performance at scale.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NodeBench AI - Benchmark AI Research Agents",
    description: "Benchmark AI agents on node-based knowledge graphs. Measure research performance, store context in nodes, scale intelligent workflows.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <Navigation />
          <div className="lg:pl-64">
            <main className="min-h-screen">
              {children}
            </main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
