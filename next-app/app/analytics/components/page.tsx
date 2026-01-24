import { Metadata } from "next";
import { ComponentAnalyticsClient } from "./ComponentAnalyticsClient";

export const metadata: Metadata = {
  title: "Component Analytics - NodeBench AI",
  description: "Track and analyze component performance metrics",
};

export default function ComponentAnalyticsPage() {
  return <ComponentAnalyticsClient />;
}
