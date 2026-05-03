import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface MultiFileAiEditModalProps {
  fileCount: number;
  onClose: () => void;
  onSubmit: (instruction: string) => Promise<void>;
}

export const MultiFileAiEditModal: React.FC<MultiFileAiEditModalProps> = ({ fileCount, onClose, onSubmit }) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;
    setIsLoading(true);
    await onSubmit(instruction);
    // No need to set isLoading(false) as the component will be unmounted.
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-amber-400 mb-2">Multi-File AI Edit</h2>
        <p className="text-gray-400 mb-4">{fileCount} file{fileCount > 1 ? 's' : ''} selected for editing.</p>
        
        <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-md mb-6 text-sm">
            <p><strong>Warning:</strong> This is an experimental feature. It will:</p>
            <ul className="list-disc list-inside mt-2">
                <li>Commit changes directly to the <strong>current branch</strong> for each repository.</li>
                <li>Process up to 8 files concurrently using a pool of AI workers.</li>
                <li>Each worker starts a new job every 31 seconds to manage rate limits.</li>
                <li>If a file fails, it will automatically retry with a different AI model (including fallback models) until it succeeds.</li>
            </ul>
             <p className="mt-2">It is highly recommended to create a new branch before starting and to review all changes carefully.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="instruction" className="block text-sm font-medium text-gray-300 mb-2">
              High-Level Instruction for All Selected Files
            </label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., 'Refactor all selected components to use functional components and hooks.'"
              className="w-full h-32 bg-gray-900 p-3 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
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
              disabled={isLoading || !instruction.trim()}
              className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? <Spinner /> : 'Start AI Edit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};