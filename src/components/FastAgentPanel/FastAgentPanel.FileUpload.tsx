// src/components/FastAgentPanel/FastAgentPanel.FileUpload.tsx
// File upload component for Fast Agent Panel

import React, { useCallback, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../convex/_generated/dataModel';

interface FileUploadProps {
  threadId: Id<"chatThreadsStream">;
  onFileSubmitted?: () => void;
}

export function FileUpload({ threadId, onFileSubmitted }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<{
    fileId: string;
    url: string;
    filename: string;
    mimeType: string;
  } | null>(null);
  const [question, setQuestion] = useState("What's in this file?");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadFile = useAction(api.fastAgentPanelStreaming.uploadFile);
  const submitFileQuestion = useMutation(api.fastAgentPanelStreaming.submitFileQuestion);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const { fileId, url } = await uploadFile({
          bytes: arrayBuffer,
          filename: file.name,
          mimeType: file.type,
        });

        setUploadedFile({
          fileId,
          url,
          filename: file.name,
          mimeType: file.type,
        });

        toast.success(`File "${file.name}" uploaded successfully!`);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile]
  );

  const handleSubmitQuestion = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!uploadedFile || !question.trim()) return;

      setIsSubmitting(true);
      try {
        await submitFileQuestion({
          threadId,
          fileId: uploadedFile.fileId,
          question: question.trim(),
        });

        // Reset state
        setUploadedFile(null);
        setQuestion("What's in this file?");
        
        toast.success('Question submitted!');
        onFileSubmitted?.();
      } catch (error) {
        console.error('Submit question error:', error);
        toast.error(`Failed to submit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [uploadedFile, question, threadId, submitFileQuestion, onFileSubmitted]
  );

  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    setQuestion("What's in this file?");
  }, []);

  const isImage = uploadedFile?.mimeType.startsWith('image/');

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <div className="max-w-2xl mx-auto">
        {!uploadedFile ? (
          <div className="flex items-center justify-center">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload File or Image</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFileUpload(file);
                  }
                }}
                accept="image/*,.pdf,.txt,.doc,.docx"
                disabled={isUploading}
              />
            </label>
          </div>
        ) : (
          <form onSubmit={handleSubmitQuestion} className="space-y-3">
            {/* File Preview */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-start gap-3">
                {isImage ? (
                  <div className="flex-shrink-0">
                    <img
                      src={uploadedFile.url}
                      alt={uploadedFile.filename}
                      className="w-20 h-20 object-cover rounded border border-gray-300"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadedFile.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {uploadedFile.mimeType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about this file..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!question.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Ask</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
