import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import UnifiedEditor from './UnifiedEditor';
import {
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  File,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Table
} from 'lucide-react';

interface FileViewerProps {
  documentId: Id<"documents">;
  className?: string;
}

interface CSVData {
  headers: string[];
  rows: string[][];
}

export const FileViewer: React.FC<FileViewerProps> = ({ documentId, className = "" }) => {
  const fileDocument = useQuery(api.fileDocuments.getFileDocument, { documentId });
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Load CSV data when file is a CSV
  useEffect(() => {
    if (fileDocument?.file && fileDocument.document.fileType === 'csv' && fileDocument.storageUrl) {
      setCsvLoading(true);
      setCsvError(null);

      fetch(fileDocument.storageUrl)
        .then(response => response.text())
        .then(csvText => {
          try {
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
              throw new Error('Empty CSV file');
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1).map(line =>
              line.split(',').map(cell => cell.trim().replace(/"/g, ''))
            );

            setCsvData({ headers, rows });
          } catch (error) {
            setCsvError(error instanceof Error ? error.message : 'Failed to parse CSV');
          }
        })
        .catch(_error => {
          setCsvError('Failed to load CSV file');
        })
        .finally(() => {
          setCsvLoading(false);
        });
    }
  }, [fileDocument]);

  if (!fileDocument) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading file...
        </div>
      </div>
    );
  }

  const { document, file, storageUrl } = fileDocument;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'csv':
        return <Table className="h-8 w-8 text-green-500" />;
      case 'image':
        return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <FileVideo className="h-8 w-8 text-purple-500" />;
      case 'audio':
        return <FileAudio className="h-8 w-8 text-orange-500" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'text':
        return <FileText className="h-8 w-8 text-gray-500" />;
      default:
        return <File className="h-8 w-8 text-[var(--text-muted)]" />;
    }
  };

  const renderFileContent = () => {
    switch (document.fileType) {
      case 'csv':
        return renderCSVContent();
      case 'image':
        return renderImageContent();
      case 'pdf':
        return renderPDFContent();
      case 'text':
        return renderTextContent();
      case 'video':
        return renderVideoContent();
      case 'audio':
        return renderAudioContent();
      default:
        return renderGenericContent();
    }
  };

  const renderCSVContent = () => {
    if (csvLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading CSV data...
          </div>
        </div>
      );
    }

    if (csvError) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            {csvError}
          </div>
        </div>
      );
    }

    if (!csvData) return null;

    return (
      <div className="w-full">
        <div className="overflow-auto max-h-96">
          <table className="w-full border-collapse border border-[var(--border-color)]">
            <thead>
              <tr className="bg-[var(--bg-secondary)]">
                {csvData.headers.map((header, index) => (
                  <th
                    key={index}
                    className="border border-[var(--border-color)] p-2 text-left text-sm font-medium text-[var(--text-primary)]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.rows.slice(0, 100).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-[var(--bg-hover)]">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-[var(--border-color)] p-2 text-sm text-[var(--text-secondary)]"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {csvData.rows.length > 100 && (
            <div className="mt-2 text-xs text-[var(--text-muted)] text-center">
              Showing first 100 rows of {csvData.rows.length} total rows
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderImageContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="flex justify-center">
        <img
          src={storageUrl}
          alt={file.fileName}
          className="max-w-full max-h-96 object-contain rounded-lg border border-[var(--border-color)]"
        />
      </div>
    );
  };

  const renderPDFContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="w-full h-96">
        <iframe
          src={storageUrl}
          className="w-full h-full border border-[var(--border-color)] rounded-lg"
          title={file.fileName}
        />
      </div>
    );
  };

  const renderTextContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="w-full">
        <iframe
          src={storageUrl}
          className="w-full h-64 border border-[var(--border-color)] rounded-lg bg-white"
          title={file.fileName}
        />
      </div>
    );
  };

  const renderVideoContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="flex justify-center">
        <video
          controls
          className="max-w-full max-h-96 rounded-lg border border-[var(--border-color)]"
        >
          <source src={storageUrl} type={document.mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  };

  const renderAudioContent = () => {
    if (!storageUrl) return renderGenericContent();

    return (
      <div className="flex justify-center">
        <audio
          controls
          className="w-full max-w-md"
        >
          <source src={storageUrl} type={document.mimeType} />
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  };

  const renderGenericContent = () => {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-4">
        {getFileIcon(document.fileType || 'unknown')}
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Preview not available for this file type
          </p>
          {storageUrl && (
            <a
              href={storageUrl}
              download={file.fileName}
              className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download {file.fileName}
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full bg-[var(--bg-primary)] ${className}`}>
      {/* File Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          {getFileIcon(document.fileType || 'unknown')}
          <div>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">
              {document.title}
            </h3>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span>{formatFileSize(file.fileSize)}</span>
              <span>{document.mimeType}</span>
              {document.lastModified && (
                <span>
                  Modified {new Date(document.lastModified).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {storageUrl && (
            <>
              <button
                onClick={() => window.open(storageUrl, '_blank')}
                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Open in new tab"
              >
                <Eye className="h-4 w-4" />
              </button>
              <a
                href={storageUrl}
                download={file.fileName}
                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Download file"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* File Content */}
      <div className="p-4 flex-1 overflow-auto">
        {renderFileContent()}
      </div>

      {/* Quick Notes Editor */}
      <div className="border-t border-[var(--border-color)] p-4">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Quick notes</h4>
        <div className="min-h-[240px]">
          <UnifiedEditor documentId={documentId} mode="quickNote" autoCreateIfEmpty />
        </div>
      </div>


      {/* Analysis Section (if available) */}
      {file.analysis && (
        <div className="border-t border-[var(--border-color)] p-4">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
            AI Analysis
          </h4>
          <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {file.analysis}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileViewer;
