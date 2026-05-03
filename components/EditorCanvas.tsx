import React, { useState, useEffect, useCallback } from 'react';
import { SelectedFile, Branch } from '../types';
import { Spinner } from './Spinner';
import { CommitModal } from './CommitModal';
import { SparklesIcon } from './icons/SparklesIcon';
import { BotIcon } from './icons/BotIcon';

interface EditorCanvasProps {
  openFiles: SelectedFile[];
  activeFile: SelectedFile | null;
  onCommit: (commitMessage: string) => Promise<void>;
  onAdvancedAiEdit: () => void;
  onSimpleAiEditRequest: () => void;
  onFileContentChange: (fileKey: string, newContent: string) => void;
  onCloseFile: (fileKey: string) => void;
  onSetActiveFile: (fileKey: string) => void;
  isLoading: boolean;
  branches: Branch[];
  currentBranch: string | null;
  onBranchChange: (newBranch: string) => void;
  onCreateBranch: (newBranchName: string) => Promise<void>;
  onCreatePullRequest: (title: string, body: string) => Promise<void>;
}

const Tab: React.FC<{
  file: SelectedFile;
  isActive: boolean;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
}> = ({ file, isActive, onSelect, onClose }) => {
  const hasChanges = file.content !== file.editedContent;
  const fileKey = file.repoFullName + '::' + file.path;
  const fileName = file.path.split('/').pop();

  return (
    <div
      onClick={() => onSelect(fileKey)}
      className={`flex items-center justify-between p-2 px-4 cursor-pointer border-b-2 ${
        isActive
          ? 'bg-gray-850 border-indigo-500 text-white'
          : 'bg-gray-900 border-transparent text-gray-400 hover:bg-gray-800'
      }`}
    >
      <span className="text-sm font-medium pr-2">{fileName}</span>
      <div className="flex items-center">
        {hasChanges && <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(fileKey);
          }}
          className="text-gray-500 hover:text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-gray-700 text-xs"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  openFiles,
  activeFile,
  onCommit,
  onAdvancedAiEdit,
  onSimpleAiEditRequest,
  onFileContentChange,
  onCloseFile,
  onSetActiveFile,
  isLoading,
  branches,
  currentBranch,
  onBranchChange,
  onCreateBranch,
  onCreatePullRequest,
}) => {
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);

  const [newBranchName, setNewBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');

  useEffect(() => {
    if (activeFile) {
      const defaultPrTitle = `Update ${activeFile.path}`;
      setPrTitle(defaultPrTitle);
    }
  }, [activeFile]);

  const hasChanges = activeFile ? activeFile.editedContent !== activeFile.content : false;

  const handleCommitSubmit = async (commitMessage: string) => {
    if (!commitMessage.trim() || !activeFile) return;
    await onCommit(commitMessage);
    setIsCommitModalOpen(false);
  };

  const handleCreateBranchClick = async () => {
    if (!newBranchName.trim()) return;
    await onCreateBranch(newBranchName);
    setNewBranchName('');
    setIsCreatingBranch(false);
  };

  const handleCreatePrClick = async () => {
    if (!prTitle.trim()) return;
    await onCreatePullRequest(prTitle, prBody);
    setIsCreatingPR(false);
    setPrBody('');
  };

  if (!activeFile) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-850 text-gray-500">
        <p>Select a file from the explorer to begin editing.</p>
      </div>
    );
  }

  const activeFileKey = activeFile.repoFullName + '::' + activeFile.path;
  const defaultCommitMessage = `Update ${activeFile.path}`;

  return (
    <div className="flex flex-col h-full bg-gray-850 relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-900 flex-wrap gap-2">
        <div>
          <h3 className="text-md font-semibold text-gray-200">{activeFile.path}</h3>
          <p className="text-xs text-gray-400">{activeFile.repoFullName}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <select
              id="branch-select"
              value={currentBranch || ''}
              onChange={(e) => onBranchChange(e.target.value)}
              disabled={isLoading}
              className="bg-gray-800 p-2 rounded-md text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {branches.map((b) => (<option key={b.name} value={b.name}>{b.name}</option>))}
            </select>
            {!isCreatingBranch ? (
              <button onClick={() => setIsCreatingBranch(true)} className="text-sm text-cyan-400 hover:underline px-3 py-1.5" disabled={isLoading}>New Branch</button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="new-branch-name"
                  className="bg-gray-800 p-2 rounded-md text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button onClick={handleCreateBranchClick} disabled={isLoading || !newBranchName.trim()} className="text-sm bg-cyan-600 text-white font-semibold py-1 px-2 rounded hover:bg-cyan-700 disabled:bg-gray-500">Create</button>
                <button onClick={() => setIsCreatingBranch(false)} className="text-sm bg-gray-600 text-white font-semibold py-1 px-2 rounded hover:bg-gray-700">X</button>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCommitModalOpen(true)}
            disabled={isLoading || !hasChanges}
            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Commit Active File
          </button>
          {currentBranch && currentBranch !== activeFile.defaultBranch && (
            <button onClick={() => setIsCreatingPR(!isCreatingPR)} className="bg-cyan-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-cyan-700 disabled:bg-gray-500" disabled={isLoading}>
              {isCreatingPR ? 'Cancel PR' : 'Create Pull Request'}
            </button>
          )}
        </div>
      </div>
      
      {isCreatingPR && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
            <h4 className="font-semibold mb-2 text-gray-200">New Pull Request</h4>
            <p className="text-xs text-gray-400 mb-2">From <code className="bg-gray-700 p-1 rounded-sm text-xs">{currentBranch}</code> into <code className="bg-gray-700 p-1 rounded-sm text-xs">{activeFile.defaultBranch}</code></p>
            <input type="text" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="Pull request title" className="w-full bg-gray-900 p-2 rounded-md mb-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
            <textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} placeholder="Describe your changes..." className="w-full h-24 bg-gray-900 p-2 rounded-md mb-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"/>
            <div className="flex gap-2">
                <button onClick={handleCreatePrClick} disabled={isLoading || !prTitle.trim()} className="text-sm bg-cyan-600 text-white font-semibold py-1 px-2 rounded hover:bg-cyan-700 disabled:bg-gray-500 flex items-center justify-center">
                    {isLoading ? <Spinner className="h-4 w-4" /> : 'Submit Pull Request'}
                </button>
            </div>
        </div>
      )}
      
      <div className="flex border-b border-gray-700 bg-gray-900 overflow-x-auto">
        {openFiles.map(file => (
          <Tab 
            key={file.repoFullName + '::' + file.path} 
            file={file} 
            isActive={(file.repoFullName + '::' + file.path) === activeFileKey}
            onSelect={onSetActiveFile}
            onClose={onCloseFile}
          />
        ))}
      </div>

      <div className="flex-grow p-4">
        <textarea
          key={activeFileKey}
          value={activeFile.editedContent}
          onChange={(e) => onFileContentChange(activeFileKey, e.target.value)}
          className="w-full h-full border border-gray-700 rounded-md bg-gray-950 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          spellCheck="false"
        />
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={onAdvancedAiEdit}
          className="bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-offset-gray-850 focus:ring-indigo-500 transition-transform hover:scale-110"
          title="Advanced AI Edit (Repository-Aware)"
          aria-label="Advanced Edit with AI"
        >
          <SparklesIcon className="h-6 w-6" />
        </button>
         <button
          onClick={onSimpleAiEditRequest}
          className="bg-cyan-600 text-white rounded-full p-4 shadow-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-4 focus:ring-offset-gray-850 focus:ring-cyan-500 transition-transform hover:scale-110"
          title="Simple AI Edit (Rewrite Active File)"
          aria-label="Simple Rewrite with AI"
        >
          <BotIcon className="h-6 w-6" />
        </button>
      </div>

      {isCommitModalOpen && (
        <CommitModal
          onClose={() => setIsCommitModalOpen(false)}
          onCommit={handleCommitSubmit}
          isLoading={isLoading}
          defaultMessage={defaultCommitMessage}
        />
      )}
    </div>
  );
};