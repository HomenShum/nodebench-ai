import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import {
  Plus,
  X,
  FileText,
  Mic,
  Camera,
  CheckSquare,
  Send,
} from 'lucide-react';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { useScreenCapture } from '../../hooks/useScreenCapture';

type CaptureMode = 'note' | 'task' | 'voice' | 'screenshot';

interface QuickCaptureWidgetProps {
  className?: string;
}

export function QuickCaptureWidget({ className = '' }: QuickCaptureWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('note');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveCapture = useMutation(api.domains.quickCapture.quickCapture.saveCapture);
  const generateUploadUrl = useMutation(api.domains.quickCapture.quickCapture.generateUploadUrl);

  const { isRecording, audioBlob, duration, startRecording, stopRecording, clearRecording } =
    useVoiceRecording();
  const { screenshotData, captureScreen, clearScreenshot } = useScreenCapture();

  const handleSave = useCallback(async () => {
    if (!content.trim() && !audioBlob && !screenshotData) {
      toast.error('Please add some content');
      return;
    }

    setIsSaving(true);
    try {
      let audioStorageId;
      let screenshotStorageId;

      // Upload audio if present
      if (audioBlob) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': audioBlob.type },
          body: audioBlob,
        });
        const { storageId } = await response.json();
        audioStorageId = storageId;
      }

      // Upload screenshot if present
      if (screenshotData) {
        const uploadUrl = await generateUploadUrl();
        const blob = await fetch(screenshotData).then((r) => r.blob());
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: blob,
        });
        const { storageId } = await response.json();
        screenshotStorageId = storageId;
      }

      await saveCapture({
        type: mode,
        content: content.trim() || (mode === 'voice' ? 'Voice memo' : 'Screenshot'),
        audioStorageId,
        screenshotStorageId,
      });

      toast.success('Captured!');
      setContent('');
      clearRecording();
      clearScreenshot();
      setIsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [content, mode, audioBlob, screenshotData, saveCapture, generateUploadUrl, clearRecording, clearScreenshot]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const modeButtons: { mode: CaptureMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'note', icon: <FileText className="h-4 w-4" />, label: 'Note' },
    { mode: 'task', icon: <CheckSquare className="h-4 w-4" />, label: 'Task' },
    { mode: 'voice', icon: <Mic className="h-4 w-4" />, label: 'Voice' },
    { mode: 'screenshot', icon: <Camera className="h-4 w-4" />, label: 'Screenshot' },
  ];

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Quick Capture</span>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="flex gap-1 p-2 border-b border-gray-100">
              {modeButtons.map(({ mode: m, icon, label }) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mode === m
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-3">
              {(mode === 'note' || mode === 'task') && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={mode === 'task' ? 'What needs to be done?' : 'Capture a thought...'}
                  className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              )}

              {mode === 'voice' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  {isRecording ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                        <Mic className="h-8 w-8 text-red-600" />
                      </div>
                      <span className="text-lg font-mono">{formatDuration(duration)}</span>
                      <button
                        onClick={stopRecording}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Stop Recording
                      </button>
                    </>
                  ) : audioBlob ? (
                    <>
                      <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                      <button onClick={clearRecording} className="text-xs text-gray-500 hover:text-gray-700">
                        Record again
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors"
                    >
                      <Mic className="h-8 w-8 text-blue-600" />
                    </button>
                  )}
                </div>
              )}

              {mode === 'screenshot' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  {screenshotData ? (
                    <>
                      <img src={screenshotData} alt="Screenshot" className="w-full rounded-lg border" />
                      <button onClick={clearScreenshot} className="text-xs text-gray-500 hover:text-gray-700">
                        Capture again
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={captureScreen}
                      className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center hover:bg-purple-200 transition-colors"
                    >
                      <Camera className="h-8 w-8 text-purple-600" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-3 pb-3">
              <button
                onClick={handleSave}
                disabled={isSaving || (!content.trim() && !audioBlob && !screenshotData)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }}>
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>
    </div>
  );
}

export default QuickCaptureWidget;

