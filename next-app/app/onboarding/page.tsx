import { Metadata } from "next";
import { OnboardingClient } from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Get Started - NodeBench AI",
  description: "Welcome to NodeBench AI - your AI-powered research and analytics platform",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
