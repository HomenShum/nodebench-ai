import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Inbox,
  FileText,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { EmailInboxView, EmailThreadDetail, EmailReportViewer } from '../components/email';
import type { Id } from '../../convex/_generated/dataModel';

type Tab = 'inbox' | 'reports';

export function EmailPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"emailThreads"> | null>(null);

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Email Intelligence</h1>
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
            <TabButton
              active={activeTab === 'inbox'}
              onClick={() => {
                setActiveTab('inbox');
                setSelectedThreadId(null);
              }}
              icon={<Inbox className="h-4 w-4" />}
              label="Inbox"
            />
            <TabButton
              active={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
              icon={<FileText className="h-4 w-4" />}
              label="Reports"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'inbox' ? (
          <>
            {/* Email List */}
            <div className={`${selectedThreadId ? 'hidden md:block md:w-1/3 lg:w-2/5' : 'w-full'} border-r border-slate-800`}>
              <EmailInboxView
                selectedThreadId={selectedThreadId}
                onSelectThread={setSelectedThreadId}
              />
            </div>

            {/* Thread Detail */}
            {selectedThreadId && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1"
              >
                <EmailThreadDetail
                  threadId={selectedThreadId}
                  onBack={() => setSelectedThreadId(null)}
                />
              </motion.div>
            )}

            {/* Empty State for Desktop */}
            {!selectedThreadId && (
              <div className="hidden md:flex flex-1 items-center justify-center text-slate-500">
                <div className="text-center">
                  <Inbox className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p>Select an email to view</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1">
            <EmailReportViewer />
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default EmailPage;
