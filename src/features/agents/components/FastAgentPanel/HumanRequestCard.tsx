// src/components/FastAgentPanel/HumanRequestCard.tsx
// UI component for displaying and responding to human-in-the-loop requests

import React, { useState } from 'react';
import { MessageCircleQuestion, Send, X, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { toast } from 'sonner';
import type { Id } from '../../../../../convex/_generated/dataModel';

interface HumanRequest {
  _id: Id<'humanRequests'>;
  userId: Id<'users'>;
  threadId: string;
  messageId: string;
  toolCallId: string;
  question: string;
  context?: string;
  options?: string[];
  status: 'pending' | 'answered' | 'cancelled';
  response?: string;
  respondedAt?: number;
  _creationTime: number;
}

interface HumanRequestCardProps {
  request: HumanRequest;
  onRespond?: () => void;
}

/**
 * HumanRequestCard - Displays a pending human request from an agent
 * 
 * Features:
 * - Shows question and context
 * - Provides quick-select options if available
 * - Allows free-form text response
 * - Shows status (pending/answered/cancelled)
 * - Animated appearance
 */
export function HumanRequestCard({ request, onRespond }: HumanRequestCardProps) {
  const [response, setResponse] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submitResponse = useMutation(api.agents.humanInTheLoop.submitHumanResponse);
  const cancelRequest = useMutation(api.agents.humanInTheLoop.cancelHumanRequest);

  const handleSubmit = async () => {
    const finalResponse = selectedOption || response.trim();
    if (!finalResponse) {
      toast.error('Please provide a response');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitResponse({
        requestId: request._id,
        response: finalResponse,
      });
      toast.success('Response sent to agent');
      onRespond?.();
    } catch (err) {
      console.error('[HumanRequestCard] Failed to submit response:', err);
      toast.error('Failed to send response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await cancelRequest({ requestId: request._id });
      toast.info('Request cancelled');
      onRespond?.();
    } catch (err) {
      console.error('[HumanRequestCard] Failed to cancel request:', err);
      toast.error('Failed to cancel request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option === selectedOption ? null : option);
    setResponse(''); // Clear text input when selecting option
  };

  const isPending = request.status === 'pending';
  const isAnswered = request.status === 'answered';
  const isCancelled = request.status === 'cancelled';

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4 shadow-md animate-in slide-in-from-top-2 duration-300",
        isPending && "border-amber-400 bg-amber-50",
        isAnswered && "border-green-400 bg-green-50",
        isCancelled && "border-gray-400 bg-gray-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          isPending && "bg-amber-100",
          isAnswered && "bg-green-100",
          isCancelled && "bg-gray-100"
        )}>
          {isPending && <MessageCircleQuestion className="h-5 w-5 text-amber-600" />}
          {isAnswered && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {isCancelled && <X className="h-5 w-5 text-gray-600" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "text-sm font-semibold",
              isPending && "text-amber-900",
              isAnswered && "text-green-900",
              isCancelled && "text-gray-900"
            )}>
              {isPending && 'Agent needs your input'}
              {isAnswered && 'Answered'}
              {isCancelled && 'Cancelled'}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{new Date(request._creationTime).toLocaleTimeString()}</span>
            </div>
          </div>
          
          {/* Question */}
          <p className={cn(
            "text-sm font-medium mb-2",
            isPending && "text-amber-800",
            isAnswered && "text-green-800",
            isCancelled && "text-gray-800"
          )}>
            {request.question}
          </p>
          
          {/* Context */}
          {request.context && (
            <p className="text-xs text-gray-600 mb-3 italic">
              {request.context}
            </p>
          )}
        </div>
      </div>

      {/* Options (if provided) */}
      {isPending && request.options && request.options.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Quick options:</p>
          <div className="flex flex-wrap gap-2">
            {request.options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleOptionSelect(option)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  "border-2",
                  selectedOption === option
                    ? "border-amber-500 bg-amber-100 text-amber-900"
                    : "border-gray-300 bg-white text-gray-700 hover:border-amber-400 hover:bg-amber-50"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text input (if no option selected) */}
      {isPending && !selectedOption && (
        <div className="mb-3">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
          <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd + Enter to send</p>
        </div>
      )}

      {/* Answered response */}
      {isAnswered && request.response && (
        <div className="mb-3 p-3 bg-white rounded-md border border-green-200">
          <p className="text-xs font-medium text-green-700 mb-1">Your response:</p>
          <p className="text-sm text-gray-800">{request.response}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedOption && !response.trim())}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "bg-amber-500 text-white hover:bg-amber-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Sending...' : 'Send Response'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            title="Cancel request"
            aria-label="Cancel request"
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * HumanRequestList - Container for multiple human requests
 */
interface HumanRequestListProps {
  requests: HumanRequest[];
  onRespond?: () => void;
}

export function HumanRequestList({ requests, onRespond }: HumanRequestListProps) {
  if (requests.length === 0) return null;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const answeredRequests = requests.filter(r => r.status === 'answered');

  return (
    <div className="space-y-3">
      {/* Pending requests first */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4" />
            Pending Requests ({pendingRequests.length})
          </h3>
          {pendingRequests.map(request => (
            <HumanRequestCard
              key={request._id}
              request={request}
              onRespond={onRespond}
            />
          ))}
        </div>
      )}

      {/* Answered requests (collapsed by default) */}
      {answeredRequests.length > 0 && (
        <details className="group">
          <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer list-none flex items-center gap-2 hover:text-gray-700">
            <CheckCircle2 className="h-4 w-4" />
            Answered Requests ({answeredRequests.length})
          </summary>
          <div className="mt-3 space-y-3">
            {answeredRequests.map(request => (
              <HumanRequestCard
                key={request._id}
                request={request}
                onRespond={onRespond}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

