import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface AiChatModalProps {
  onClose: () => void;
  onSubmit: (instruction: string) => Promise<void>;
}

export const AiChatModal: React.FC<AiChatModalProps> = ({ onClose, onSubmit }) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;
    setIsLoading(true);
    await onSubmit(instruction);
    // The parent will close the modal.
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Simple AI Edit</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Describe how you want to change the current file. The AI will rewrite the file's content directly in the editor. This edit is not automatically committed.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="instruction-simple" className="block text-sm font-medium text-gray-300 mb-2">
              Instruction
            </label>
            <textarea
              id="instruction-simple"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., 'Convert this to an async function and add a try/catch block.'"
              className="w-full h-32 bg-gray-900 p-3 rounded-md text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
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
              className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? <Spinner /> : 'Rewrite Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
