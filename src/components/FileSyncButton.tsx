import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { RefreshCw, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export const FileSyncButton: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const syncFiles = useMutation(api.fileDocuments.syncFilesToDocuments);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const createdDocuments = await syncFiles();
      if (createdDocuments.length > 0) {
        toast.success(`${createdDocuments.length} file(s) added to your documents!`);
      } else {
        toast.info('All files are already synced as documents');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync files');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={() => void handleSync()}
      disabled={isSyncing}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Convert uploaded files to documents"
    >
      {isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <FileCheck className="h-4 w-4" />
      )}
      {isSyncing ? 'Syncing...' : 'Sync Files'}
    </button>
  );
};

export default FileSyncButton;
