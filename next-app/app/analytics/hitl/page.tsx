import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { HITLDashboard } from "./HITLDashboard";

export const metadata = {
  title: "HITL Analytics - NodeBench AI",
  description: "Human-in-the-loop decision analytics and automation opportunities",
};

export default async function HITLAnalyticsPage() {
  // Preload all data on the server for fast initial render
  const approvalData = await preloadQuery(
    api.domains.hitl.decisions.getHitlApprovalRate,
    {}
  );

  const reviewTimeByType = await preloadQuery(
    api.domains.hitl.decisions.getAverageReviewTimeByType,
    {}
  );

  const modifiedFields = await preloadQuery(
    api.domains.hitl.decisions.getMostModifiedFields,
    { limit: 10 }
  );

  return (
    <HITLDashboard
      preloadedApprovalData={approvalData}
      preloadedReviewTimeByType={reviewTimeByType}
      preloadedModifiedFields={modifiedFields}
    />
  );
}
