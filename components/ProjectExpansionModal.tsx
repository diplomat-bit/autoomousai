import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface ProjectExpansionModalProps {
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

export const ProjectExpansionModal: React.FC<ProjectExpansionModalProps> = ({ onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    await onSubmit(prompt);
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-purple-400 mb-2">Project Expansion (Seed Mode)</h2>
        <p className="text-gray-400 mb-4">
            You've selected a <strong>single seed file</strong>. Describe your high-level goal, and the AI will generate a massive amount of <strong>new files</strong> to expand this project. The seed file itself will not be modified.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
              High-Level Expansion Goal
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Add a complete user authentication system with sign-up, login, and profile pages. Also add a dashboard to visualize data from the existing components.'"
              className="w-full h-40 bg-gray-900 p-3 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
              disabled={isLoading || !prompt.trim()}
              className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? <Spinner /> : 'Unleash Agents'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};