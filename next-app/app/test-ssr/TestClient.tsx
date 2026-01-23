'use client';

import { usePreloadedQuery } from "convex/react";
import { Preloaded } from "convex/nextjs";
import { api } from "../../convex/_generated/api";

interface TestClientProps {
  preloadedUser: Preloaded<typeof api.domains.auth.auth.loggedInUser>;
}

export function TestClient({ preloadedUser }: TestClientProps) {
  const user = usePreloadedQuery(preloadedUser);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">User Data:</h3>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-gray-400'}`}></span>
        <span className="text-sm text-gray-600">
          {user ? 'Authenticated' : 'Not authenticated (guest mode)'}
        </span>
      </div>
    </div>
  );
}
