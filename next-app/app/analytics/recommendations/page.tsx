import { Metadata } from "next";
import { RecommendationsClient } from "./RecommendationsClient";

export const metadata: Metadata = {
  title: "Recommendation Analytics - NodeBench AI",
  description: "AI recommendation performance and insights dashboard",
};

export default function RecommendationsPage() {
  return <RecommendationsClient />;
}
