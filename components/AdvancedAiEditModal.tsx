import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner';
import { getRepoWorkflows } from '../services/githubService';
import { Workflow } from '../types';

interface AdvancedAiEditModalProps {
  onClose: () => void;
  onSubmit: (instruction: string, workflowId: string) => Promise<void>;
  token: string | null;
  repoFullName: string;
}

export const AdvancedAiEditModal: React.FC<AdvancedAiEditModalProps> = ({ onClose, onSubmit, token, repoFullName }) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      if (token && repoFullName) {
        try {
          setLoadingWorkflows(true);
          const [owner, repo] = repoFullName.split('/');
          const response = await getRepoWorkflows(token, owner, repo);
          const activeWorkflows = response.workflows.filter(w => w.state === 'active');
          setWorkflows(activeWorkflows);
          if (activeWorkflows.length > 0) {
            setSelectedWorkflow(String(activeWorkflows[0].id)); // Select the first one by default
          }
        } catch (error) {
          console.error("Failed to fetch workflows", error);
        } finally {
          setLoadingWorkflows(false);
        }
      }
    };
    fetchWorkflows();
  }, [token, repoFullName]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading || !selectedWorkflow) return;
    setIsLoading(true);
    await onSubmit(instruction, selectedWorkflow);
    // The parent will close the modal upon completion/start of the next phase
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-indigo-400 mb-4">Advanced AI Edit & Test</h2>
        <div className="bg-blue-900 border border-blue-700 text-blue-200 p-4 rounded-md mb-6 text-sm space-y-2">
            <p><strong>This is a powerful, repository-aware AI agent.</strong></p>
            <ul className="list-disc list-inside">
                <li>It analyzes your entire repository for context.</li>
                <li>It can edit multiple files to fulfill your request.</li>
                <li>It will <strong>commit changes and run a GitHub Actions workflow</strong> to verify its work.</li>
                <li>If the build fails, it will analyze the logs and attempt to fix its own mistakes.</li>
            </ul>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="instruction-advanced" className="block text-sm font-medium text-gray-300 mb-2">
              Your Request
            </label>
            <textarea
                id="instruction-advanced"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., 'Refactor the authentication logic to use a context provider instead of prop drilling.'"
                className="w-full h-40 bg-gray-900 p-3 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                autoFocus
            />
          </div>
          <div className="mb-6">
            <label htmlFor="workflow-select" className="block text-sm font-medium text-gray-300 mb-2">
              Select Workflow for Verification
            </label>
            {loadingWorkflows ? (
                 <div className="flex items-center gap-2 text-gray-400">
                    <Spinner className="w-4 h-4" />
                    <span>Loading workflows...</span>
                </div>
            ) : workflows.length > 0 ? (
                <select
                    id="workflow-select"
                    value={selectedWorkflow}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {workflows.map(wf => (
                        <option key={wf.id} value={wf.id}>{wf.name} ({wf.path.split('/').pop()})</option>
                    ))}
                </select>
            ) : (
                <p className="text-sm text-yellow-400 bg-yellow-900 p-2 rounded-md">No active GitHub Actions workflows found in this repository.</p>
            )}
          </div>
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
              disabled={isLoading || !instruction.trim() || !selectedWorkflow}
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? <Spinner /> : 'Execute & Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
