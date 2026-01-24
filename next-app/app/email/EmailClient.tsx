'use client';

import { useState } from 'react';
import {
  Inbox,
  FileText,
  Mail,
  Star,
  Archive,
  Trash2,
  Send,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Clock,
  Paperclip,
} from 'lucide-react';

type Tab = 'inbox' | 'starred' | 'sent' | 'archive';

interface EmailThread {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
}

const sampleEmails: EmailThread[] = [
  {
    id: '1',
    from: 'Research Team',
    subject: 'Q1 Market Analysis Report',
    preview: 'Please find attached the comprehensive market analysis for Q1 2026...',
    date: '10:30 AM',
    isRead: false,
    isStarred: true,
    hasAttachment: true,
  },
  {
    id: '2',
    from: 'AI Agent',
    subject: 'Entity Update: NVIDIA Corporation',
    preview: 'New developments detected for tracked entity. Key changes include...',
    date: '9:15 AM',
    isRead: false,
    isStarred: false,
    hasAttachment: false,
  },
  {
    id: '3',
    from: 'System Notification',
    subject: 'Weekly Research Digest',
    preview: 'Your weekly summary of research signals and insights is ready...',
    date: 'Yesterday',
    isRead: true,
    isStarred: false,
    hasAttachment: true,
  },
  {
    id: '4',
    from: 'Deal Radar',
    subject: 'New Deal Alert: Series B Funding',
    preview: 'A new deal matching your criteria has been detected in the market...',
    date: 'Yesterday',
    isRead: true,
    isStarred: true,
    hasAttachment: false,
  },
  {
    id: '5',
    from: 'Collaboration',
    subject: 'Document shared: Investment Thesis',
    preview: 'Sarah has shared a document with you. Click to view the investment...',
    date: 'Jan 22',
    isRead: true,
    isStarred: false,
    hasAttachment: false,
  },
];

export function EmailClient() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'inbox' as Tab, label: 'Inbox', icon: Inbox, count: 2 },
    { id: 'starred' as Tab, label: 'Starred', icon: Star, count: 2 },
    { id: 'sent' as Tab, label: 'Sent', icon: Send, count: 0 },
    { id: 'archive' as Tab, label: 'Archive', icon: Archive, count: 0 },
  ];

  const filteredEmails = sampleEmails.filter((email) => {
    if (activeTab === 'starred') return email.isStarred;
    if (activeTab === 'inbox') return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Email Intelligence</h1>
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <RefreshCw className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Email List */}
        <div className={`${selectedEmail ? 'w-2/5 border-r border-gray-800' : 'w-full'}`}>
          {/* Search */}
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Email List */}
          <div className="overflow-y-auto">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email.id)}
                className={`px-4 py-3 border-b border-gray-800 cursor-pointer transition-colors ${
                  selectedEmail === email.id
                    ? 'bg-gray-800'
                    : 'hover:bg-gray-800/50'
                } ${!email.isRead ? 'bg-gray-800/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className={`mt-1 ${email.isStarred ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-500'}`}
                  >
                    <Star className="h-4 w-4" fill={email.isStarred ? 'currentColor' : 'none'} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${!email.isRead ? 'font-semibold' : 'text-gray-300'}`}>
                        {email.from}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {email.hasAttachment && <Paperclip className="h-3 w-3" />}
                        {email.date}
                      </span>
                    </div>
                    <div className={`text-sm mt-0.5 ${!email.isRead ? 'text-white' : 'text-gray-400'}`}>
                      {email.subject}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {email.preview}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Detail */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Back to list
              </button>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
                  <Archive className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {(() => {
                const email = sampleEmails.find((e) => e.id === selectedEmail);
                if (!email) return null;
                return (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">{email.subject}</h2>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{email.from}</div>
                        <div className="text-sm text-gray-500">to me</div>
                      </div>
                      <div className="ml-auto text-sm text-gray-500">{email.date}</div>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300">
                        {email.preview}
                      </p>
                      <p className="text-gray-300 mt-4">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                        incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                        exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      </p>
                      <p className="text-gray-300 mt-4">
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                        fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                        culpa qui officia deserunt mollit anim id est laborum.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedEmail && filteredEmails.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>No emails in this folder</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
