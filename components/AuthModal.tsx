import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner';

interface AuthModalProps {
  onSubmit: (credentials: { githubToken: string; geminiKey?: string }) => void;
  isLoading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSubmit, isLoading }) => {
  const [githubToken, setGithubToken] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    // Auto-fill from env if in dev/preview environment (optional convenience)
    if (process.env.API_KEY) {
        setGeminiKey(process.env.API_KEY);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      githubToken: githubToken.trim(),
      geminiKey: geminiKey.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-850 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-2">
          GitHub AI Code Editor
        </h2>
        <p className="text-center text-gray-400 mb-6">Enter your credentials to begin.</p>

        <form onSubmit={handleSubmit}>
          {/* GitHub Token */}
          <div className="mb-4">
            <label htmlFor="githubToken" className="block text-sm font-medium text-gray-300 mb-2">
              GitHub Token
            </label>
            <input
              id="githubToken"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ghp_..."
              required
            />
          </div>

          {/* Gemini API Key - Explicit Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gemini API Key
            </label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter Gemini API key (AIza...)"
                className="flex-grow px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {geminiKey && (
              <p className="text-green-400 text-sm mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                Key Ready
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500 mb-6 space-y-2">
            <p>
                A <strong className="text-gray-400">classic</strong> GitHub token with <code className="bg-gray-700 p-1 rounded-sm text-xs">repo</code> scope is required.
            </p>
            <a 
                href="https://github.com/settings/tokens/new?scopes=repo" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-indigo-400 hover:text-indigo-300 underline"
            >
                Create a new token here.
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading || !githubToken}
            className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-850 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : 'Load Repositories'}
          </button>
        </form>
      </div>
    </div>
  );
};