'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react';

interface Export {
  id: string;
  bookId: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  filesize?: number;
  createdAt: string;
  completedAt?: string;
}

interface ExportsListProps {
  bookId: string;
}

export function ExportsList({ bookId }: ExportsListProps) {
  const [exports, setExports] = useState<Export[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExports();
  }, [bookId]);

  const fetchExports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/exports?bookId=' + bookId);

      if (!response.ok) {
        throw new Error('Failed to fetch exports');
      }

      const result = await response.json();
      setExports(result.data || []);
    } catch (error) {
      console.error('Error fetching exports:', error);
      setError('Failed to load export history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Clock
            size={16}
            className="text-gray-400"
          />
        );

      case 'processing':
        return (
          <Loader2
            size={16}
            className="animate-spin text-blue-500"
          />
        );

      case 'completed':
        return (
          <CheckCircle
            size={16}
            className="text-green-500"
          />
        );

      case 'failed':
        return (
          <XCircle
            size={16}
            className="text-red-500"
          />
        );

      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) {
      return 'Unknown';
    }

    const sizes = ['B', 'KB', 'MB', 'GB'];

    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      sizes.length - 1
    );

    return (
      (bytes / Math.pow(1024, i)).toFixed(1) +
      ' ' +
      sizes[i]
    );
  };

  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(
        '/api/exports/' + exportId + '/download'
      );

      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'puzzle_book.pdf';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download export');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2
          size={24}
          className="animate-spin text-blue-600"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (exports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText
          size={32}
          className="mx-auto mb-2"
        />

        <p>No exports yet</p>

        <p className="text-sm">
          Export your book to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exports.map((exp) => (
        <div
          key={exp.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center gap-3">
            {getStatusIcon(exp.status)}

            <div>
              <p className="text-sm font-medium text-gray-800">
                Export #{exp.id.slice(0, 8)}
              </p>

              <p className="text-xs text-gray-400">
                {new Date(exp.createdAt).toLocaleString()}

                {exp.filesize && (
                  ' ? ' + formatFileSize(exp.filesize)
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {getStatusText(exp.status)}
            </span>

            {exp.status === 'completed' && (
              <button
                type="button"
                onClick={() => handleDownload(exp.id)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Download"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}