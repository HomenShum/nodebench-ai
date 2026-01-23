"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode } from "react";

// Create Convex client (ensure NEXT_PUBLIC_CONVEX_URL is set)
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
}

const convex = new ConvexReactClient(convexUrl);

/**
 * ConvexClientProvider - Wraps app in Convex + Auth providers
 * Must be used in a Client Component
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        {children}
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}
