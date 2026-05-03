import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner';

interface CommitModalProps {
  onClose: () => void;
  onCommit: (commitMessage: string) => Promise<void>;
  isLoading: boolean;
  defaultMessage: string;
}

export const CommitModal: React.FC<CommitModalProps> = ({ onClose, onCommit, isLoading, defaultMessage }) => {
  const [commitMessage, setCommitMessage] = useState(defaultMessage);

  useEffect(() => {
    setCommitMessage(defaultMessage);
  }, [defaultMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim() || isLoading) return;
    await onCommit(commitMessage);
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-green-400 mb-4">Commit Changes</h2>
        <form onSubmit={handleSubmit}>
          <p className="text-gray-400 mb-2 text-sm">Enter a commit message:</p>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full bg-gray-900 p-3 rounded-md mb-4 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !commitMessage.trim()}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? <Spinner /> : 'Commit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
