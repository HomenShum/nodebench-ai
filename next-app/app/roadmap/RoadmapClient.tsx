'use client';

import { useState } from 'react';
import { Flag, CheckCircle, Clock, Loader2, ChevronRight } from 'lucide-react';

type Status = 'completed' | 'in-progress' | 'planned';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: Status;
  quarter: string;
  category: string;
}

const roadmapData: RoadmapItem[] = [
  { id: '1', title: 'SSR Migration', description: 'Migrate to Next.js for improved performance', status: 'completed', quarter: 'Q1 2026', category: 'Infrastructure' },
  { id: '2', title: 'Real-time Collaboration', description: 'Enable multiple users to edit documents simultaneously', status: 'in-progress', quarter: 'Q1 2026', category: 'Features' },
  { id: '3', title: 'AI Agent Improvements', description: 'Enhanced agent capabilities with better context awareness', status: 'in-progress', quarter: 'Q1 2026', category: 'AI' },
  { id: '4', title: 'Mobile App', description: 'Native mobile applications for iOS and Android', status: 'planned', quarter: 'Q2 2026', category: 'Platform' },
  { id: '5', title: 'Advanced Analytics', description: 'Comprehensive analytics dashboard with custom reports', status: 'planned', quarter: 'Q2 2026', category: 'Features' },
  { id: '6', title: 'Enterprise SSO', description: 'Single sign-on support for enterprise customers', status: 'planned', quarter: 'Q2 2026', category: 'Security' },
];

export function RoadmapClient() {
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const filteredItems = filter === 'all'
    ? roadmapData
    : roadmapData.filter(item => item.status === filter);

  const statusIcon = (status: Status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'planned': return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const statusBadge = (status: Status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      'planned': 'bg-gray-100 text-gray-700',
    };
    return colors[status];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Product Roadmap</h1>
          <p className="text-gray-600 mt-1">Our vision and upcoming features</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'completed', 'in-progress', 'planned'] as const).map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{roadmapData.filter(i => i.status === 'completed').length}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Loader2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{roadmapData.filter(i => i.status === 'in-progress').length}</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{roadmapData.filter(i => i.status === 'planned').length}</p>
              <p className="text-sm text-gray-600">Planned</p>
            </div>
          </div>
        </div>

        {/* Roadmap Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Roadmap Items</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer group">
                <div className="flex items-start gap-4">
                  {statusIcon(item.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(item.status)}`}>
                        {item.status.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">{item.category}</span>
                      <span>{item.quarter}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
