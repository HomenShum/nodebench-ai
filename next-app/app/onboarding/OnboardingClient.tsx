'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  FileText,
  Plus,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Users,
  Brain,
  ChevronRight,
  Search,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  link?: string;
}

export function OnboardingClient() {
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to Your Workspace',
      description: 'Get familiar with the AI-powered document management system',
      icon: <Sparkles className="h-5 w-5" />,
      completed: true,
    },
    {
      id: 'research',
      title: 'Explore Research Hub',
      description: 'Discover AI-powered research intelligence and real-time signals',
      icon: <Search className="h-5 w-5" />,
      completed: false,
      link: '/research',
    },
    {
      id: 'documents',
      title: 'Create Your First Document',
      description: 'Learn how to create and structure documents with AI assistance',
      icon: <Plus className="h-5 w-5" />,
      completed: false,
      link: '/documents',
    },
    {
      id: 'agents',
      title: 'Meet Your AI Agents',
      description: 'Explore how AI agents can help with research and analysis',
      icon: <Brain className="h-5 w-5" />,
      completed: false,
      link: '/agents',
    },
    {
      id: 'calendar',
      title: 'Manage Your Schedule',
      description: 'Organize meetings and events with the calendar',
      icon: <Calendar className="h-5 w-5" />,
      completed: false,
      link: '/calendar',
    },
  ]);

  const handleStepClick = (stepId: string) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, completed: true } : step))
    );
  };

  const completedSteps = steps.filter((step) => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const features = [
    {
      icon: <Search className="h-6 w-6 text-blue-600" />,
      title: 'Research Intelligence',
      description: 'AI-powered research with real-time market signals and entity tracking',
    },
    {
      icon: <FileText className="h-6 w-6 text-emerald-600" />,
      title: 'Smart Documents',
      description: 'Create and edit documents with AI assistance and templates',
    },
    {
      icon: <Bot className="h-6 w-6 text-purple-600" />,
      title: 'AI Agents',
      description: 'Specialized agents for research, analysis, and automation',
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-orange-600" />,
      title: 'Analytics Dashboard',
      description: 'Track performance and insights with comprehensive analytics',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Bot className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to NodeBench AI
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
            Your AI-powered research and document workspace. Let's get you started!
          </p>
          <Link
            href="/research"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            Skip tutorial and go to workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Getting Started</span>
            <span className="text-sm text-gray-600">
              {completedSteps} of {steps.length} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Video Tutorial */}
        <div className="mb-8 rounded-lg overflow-hidden border border-gray-200 bg-white">
          <div className="w-full aspect-video">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/XRYUUDNh4GQ"
              title="NodeBench AI Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Getting Started Guide
              </h2>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id}>
                    {step.link ? (
                      <Link
                        href={step.link}
                        onClick={() => handleStepClick(step.id)}
                        className={`block p-4 rounded-lg border transition-all ${
                          step.completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              step.completed
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {step.completed ? <CheckCircle className="h-5 w-5" /> : step.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{step.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </Link>
                    ) : (
                      <div
                        className={`p-4 rounded-lg border ${
                          step.completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              step.completed
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {step.completed ? <CheckCircle className="h-5 w-5" /> : step.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{step.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {completedSteps === steps.length && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">All Done!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      You've completed the onboarding. Ready to explore!
                    </p>
                    <Link
                      href="/research"
                      className="block w-full text-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Enter Your Workspace
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Platform Features
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-3">
                      {feature.icon}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Need Help?
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Our AI agents are available to help you with any questions.
                      Click the agent button in the sidebar to start a conversation.
                    </p>
                    <Link
                      href="/agents"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open AI Agent
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
