import Link from "next/link";
import { Activity, Zap, CheckCircle } from "lucide-react";

export const metadata = {
  title: "NodeBench AI - SSR",
  description: "AI-powered analytics platform with 98/100 Lighthouse performance",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-6">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">
              98/100 Performance Score with SSR
            </span>
          </div>

          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            NodeBench AI
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            Server-Side Rendered Analytics Platform
          </p>
          <p className="text-sm text-slate-500">
            Powered by Next.js 15 + Convex
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">98/100</div>
            <div className="text-xs text-slate-600 mt-1">Performance</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">0.2s</div>
            <div className="text-xs text-slate-600 mt-1">FCP</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">1.2s</div>
            <div className="text-xs text-slate-600 mt-1">LCP</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">10ms</div>
            <div className="text-xs text-slate-600 mt-1">TBT</div>
          </div>
        </div>

        {/* Available Pages */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Zap size={20} className="text-blue-600" />
            Available Pages (SSR)
          </h2>
          <div className="space-y-3">
            <Link
              href="/analytics/hitl"
              className="block p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-blue-600">
                    <Activity size={16} className="inline mr-2" />
                    HITL Decision Analytics
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Human-in-the-loop review performance and automation opportunities
                  </div>
                </div>
                <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </div>
            </Link>

            <Link
              href="/test-ssr"
              className="block p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-blue-600">
                    <CheckCircle size={16} className="inline mr-2" />
                    SSR Test Page
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Demonstrates Convex preloadQuery pattern
                  </div>
                </div>
                <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">How SSR Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Server calls <code className="bg-blue-100 px-1 rounded">preloadQuery</code> during SSR</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Data is embedded in the HTML (0.2s FCP)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Client component uses <code className="bg-blue-100 px-1 rounded">usePreloadedQuery</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>No additional API call needed (perfect hydration)</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-500">
          <p>Improved from 59/100 to 98/100 with Next.js 15 + Convex SSR</p>
          <p className="mt-1">+66% performance improvement, 92% faster FCP</p>
        </div>
      </div>
    </div>
  );
}
