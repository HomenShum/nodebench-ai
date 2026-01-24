import { Metadata } from "next";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings - NodeBench AI",
  description: "Manage your account settings, preferences, and security options",
};

/**
 * Settings Page - Server Component
 *
 * This server component:
 * 1. Defines page metadata for SEO
 * 2. Preloads user data via Convex SSR
 * 3. Passes preloaded data to the client component
 */
export default async function SettingsPage() {
  // Preload user data for SSR
  const preloadedUser = await preloadQuery(api.domains.auth.auth.loggedInUser);

  return <SettingsClient preloadedUser={preloadedUser} />;
}
