import { preloadQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

export const metadata = {
  title: "Test HITL - NodeBench AI",
  description: "Testing HITL query on Vercel",
};

export default async function TestHITLPage() {
  let error = null;
  let data = null;

  try {
    const preloadedData = await preloadQuery(
      api.domains.hitl.decisions.getHitlApprovalRate,
      {}
    );
    data = JSON.stringify(preloadedData, null, 2);
  } catch (e: any) {
    error = e.message || e.toString();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test HITL SSR</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-red-800 font-semibold mb-2">Error:</h2>
            <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {data && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h2 className="text-green-800 font-semibold mb-2">Success:</h2>
            <pre className="text-green-700 text-sm whitespace-pre-wrap">{data}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
