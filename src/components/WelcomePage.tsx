import { useState, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  Send, 
  Loader2, 
  FileText, 
  Plus, 
  BookOpen,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Users,
  Brain,
  Terminal
} from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'tool_code_output';
  content: string;
  timestamp: Date;
  isProcessing?: boolean;
  documentCreated?: {
    id: Id<"documents">;
    title: string;
  };
  data?: any;
}

interface WelcomePageProps {
  onGetStarted: () => void;
  onDocumentSelect: (documentId: Id<"documents">) => void;
}

export function WelcomePage({ onGetStarted, onDocumentSelect }: WelcomePageProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: "👋 Welcome to your AI-powered document workspace!",
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'assistant',
      content: "Hi there! I'm your AI assistant, and I'm excited to help you get started. I can help you create documents, organize your workspace, and answer any questions you have.\n\nLet's begin with a quick tour. What would you like to learn about first?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const createDocument = useMutation(api.documents.create);
  const generateAIResponse = useAction(api.ai.generateResponse);

  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to Your Workspace',
      description: 'Get familiar with the AI-powered document management system',
      icon: <Sparkles className="h-5 w-5" />,
      completed: true
    },
    {
      id: 'create-first-doc',
      title: 'Create Your First Document',
      description: 'Learn how to create and structure documents with AI assistance',
      icon: <Plus className="h-5 w-5" />,
      completed: false,
      action: "How do I create my first document?"
    },
    {
      id: 'ai-features',
      title: 'Discover AI Features',
      description: 'Explore how AI can help with content generation and editing',
      icon: <Brain className="h-5 w-5" />,
      completed: false,
      action: "What AI features are available?"
    },
    {
      id: 'organize-workspace',
      title: 'Organize Your Workspace',
      description: 'Learn about document organization and search capabilities',
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      action: "Show me organization tips"
    },
    {
      id: 'collaboration',
      title: 'Collaboration Features',
      description: 'Discover real-time editing and sharing capabilities',
      icon: <Users className="h-5 w-5" />,
      completed: false,
      action: "How does collaboration work?"
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const completeStep = (stepId: string) => {
    setOnboardingSteps(prev => {
      const updatedSteps = prev.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      );
      const currentIndex = updatedSteps.findIndex(step => step.id === stepId);
      if (currentIndex !== -1 && currentIndex < updatedSteps.length - 1) {
        setCurrentStep(currentIndex + 1);
      }
      return updatedSteps;
    });
  };

  const handleSendMessage = async (contentOverride?: string) => {
    const messageContent = contentOverride || input;
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    if (!contentOverride) {
      setInput('');
    }
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isProcessing: true,
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      // Fixed: Remove messageHistory parameter
      const response = await generateAIResponse({
        userMessage: messageContent,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: response.message, isProcessing: false }
            : m
        )
      );
      
      for (const action of response.actions) {
        if (action.type === 'createDocument' && action.title) {
          const newDocId = await createDocument({
            title: action.title,
            content: action.content,
          });

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    documentCreated: {
                      id: newDocId,
                      title: action.title!,
                    },
                  }
                : m
            )
          );
          completeStep('create-first-doc');

          if (action.select) {
            onDocumentSelect(newDocId);
          }
        }
      }
        
      if (messageContent.toLowerCase().includes('ai features') || 
          messageContent.toLowerCase().includes('what can you do')) {
        completeStep('ai-features');
      } else if (messageContent.toLowerCase().includes('organization') || 
                  messageContent.toLowerCase().includes('organize')) {
        completeStep('organize-workspace');
      } else if (messageContent.toLowerCase().includes('collaboration') || 
                  messageContent.toLowerCase().includes('sharing')) {
        completeStep('collaboration');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage = error instanceof Error ? 
        `Sorry, I encountered an error: ${error.message}. Please try again.` :
        'Sorry, I encountered an unexpected error. Please try again.';
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: errorMessage, isProcessing: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    void handleSendMessage(action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / onboardingSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Bot className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Your AI Workspace
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Let's get you started with your intelligent document management system. 
            I'm here to guide you every step of the way!
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 border border-gray-200"
          >
            Skip tutorial and go to workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Onboarding Progress</span>
            <span className="text-sm text-gray-500">{completedSteps} of {onboardingSteps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Getting Started Guide
              </h2>
              <div className="space-y-4">
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      step.completed
                        ? 'bg-green-50 border-green-200'
                        : index === currentStep
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 ring-2 ring-[var(--accent-primary)]/20'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => step.action && !step.completed && void handleQuickAction(step.action)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step.completed ? <CheckCircle className="h-5 w-5" /> : step.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{step.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                        {step.action && !step.completed && (
                          <div className="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1">
                            Try it <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {completedSteps === onboardingSteps.length && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Congratulations!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      You've completed the onboarding! You're ready to start creating amazing documents.
                    </p>
                    <button
                      onClick={onGetStarted}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Enter Your Workspace
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">AI Onboarding Assistant</h3>
                  <p className="text-sm text-gray-500">Ask me anything about getting started!</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  switch (message.type) {
                    case 'user':
                      return (
                        <div key={message.id} className="flex justify-end">
                          <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-lg">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    case 'assistant':
                      return (
                        <div key={message.id} className="flex justify-start">
                          <div className="flex items-start gap-2.5">
                            <div className="bg-gray-200 text-gray-800 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-5 w-5" />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg px-4 py-2 max-w-lg">
                              <ReactMarkdown
                                components={{
                                  p: ({ node: _node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                              {message.isProcessing && (
                                <Loader2 className="h-4 w-4 animate-spin my-2" />
                              )}
                              {message.documentCreated && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm text-gray-700">Document created:</span>
                                  <button
                                    onClick={() => onDocumentSelect(message.documentCreated!.id)}
                                    className="font-semibold text-sm text-blue-600 hover:underline"
                                  >
                                    {message.documentCreated.title}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    case 'system':
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="text-center text-xs text-gray-500 p-2 bg-gray-100 rounded-full">
                            {message.content}
                          </div>
                        </div>
                      );
                    case 'tool_code_output': {
                      const { toolName, output } = message.data || {};
                      return (
                        <div key={message.id} className="my-4 p-3 bg-gray-50 border rounded-lg">
                          <div className="font-semibold text-xs text-gray-500 flex items-center gap-2 mb-1">
                            <Terminal className="h-3 w-3" />
                            <span>Tool Output: {toolName || 'Unknown Tool'}</span>
                          </div>
                          <pre className="text-xs bg-gray-800 text-white p-2 rounded-md overflow-x-auto"><code>{output}</code></pre>
                        </div>
                      );
                    }
                    default:
                      return null;
                  }
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => void handleQuickAction("How do I create my first document?")}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    Create Document
                  </button>
                  <button
                    onClick={() => void handleQuickAction("What AI features are available?")}
                    className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors"
                  >
                    AI Features
                  </button>
                  <button
                    onClick={() => void handleQuickAction("How does collaboration work?")}
                    className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
                  >
                    Collaboration
                  </button>
                  <button
                    onClick={() => void handleQuickAction("Show me organization tips")}
                    className="text-xs bg-orange-50 text-orange-700 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors"
                  >
                    Organization
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about getting started..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => void handleSendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}