import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface NewProjectModalProps {
  onClose: () => void;
  onSubmit: (repoName: string, prompt: string, isPrivate: boolean) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onSubmit }) => {
  const [repoName, setRepoName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!repoName.trim() || !prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
        await onSubmit(repoName.trim().replace(/\s+/g, '-'), prompt, isPrivate);
        // On success, the parent component will close the modal.
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-indigo-400 mb-4">New AI Project</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Describe the project you want to build. The AI will create a new repository, plan the file structure, and generate all the necessary code.
        </p>
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                    <label htmlFor="repoName" className="block text-sm font-medium text-gray-300 mb-2">
                    New Repository Name
                    </label>
                    <input
                        id="repoName"
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="my-new-ai-project"
                        required
                        autoFocus
                    />
                </div>
                <div>
                     <label htmlFor="repoVisibility" className="block text-sm font-medium text-gray-300 mb-2">
                        Visibility
                    </label>
                    <select 
                        id="repoVisibility"
                        value={isPrivate ? 'private' : 'public'}
                        onChange={(e) => setIsPrivate(e.target.value === 'private')}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                    </select>
                </div>
            </div>

          <div className="mb-4">
             <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                Project Description
            </label>
            <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'A simple to-do list app using React, TypeScript, and Tailwind CSS. It should have a main component to display and add tasks.'"
                className="w-full h-40 bg-gray-900 p-3 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
            />
          </div>
        
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

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
              disabled={isLoading || !repoName.trim() || !prompt.trim()}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[150px]"
            >
              {isLoading ? <Spinner /> : 'Generate Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
