import { preloadQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { TestClient } from "./TestClient";

export const metadata = {
  title: "SSR Test - NodeBench AI",
  description: "Testing Convex SSR with preloadQuery",
};

export default async function TestSSRPage() {
  // Test preloadQuery with a simple query
  // Using auth.loggedInUser as it's a basic query that should work
  const preloadedUser = await preloadQuery(api.domains.auth.auth.loggedInUser);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          SSR Test Page
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Server-Side Rendered</h2>
          <p className="text-gray-600 mb-4">
            This page was rendered on the server using Convex preloadQuery.
            The data below was fetched during server-side rendering.
          </p>

          <TestClient preloadedUser={preloadedUser} />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Server calls preloadQuery during SSR</li>
            <li>Data is embedded in the HTML</li>
            <li>Client component uses usePreloadedQuery</li>
            <li>No additional API call needed on client</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
