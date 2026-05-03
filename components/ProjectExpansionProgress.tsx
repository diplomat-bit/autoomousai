import React, { useState } from 'react';
import { ProjectExpansionJob, ProjectExpansionPhase } from '../types';
import { Spinner } from './Spinner';

const StatusIcon: React.FC<{ status: ProjectExpansionJob['status'] }> = ({ status }) => {
    switch (status) {
        case 'queued': 
            return <div title="Queued" className="w-4 h-4 rounded-full bg-gray-600 flex-shrink-0"></div>;
        case 'generating': 
            return <Spinner className="w-4 h-4 text-blue-400" />;
        case 'committing': 
            return <Spinner className="w-4 h-4 text-yellow-400" />;
        case 'retrying':
            return <Spinner className="w-4 h-4 text-orange-400" />;
        case 'success': 
            return <div title="Success" className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</div>;
        case 'failed': 
            return <div title="Failed" className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">!</div>;
        default: 
            return null;
    }
};

interface ProjectExpansionProgressProps {
  jobs: ProjectExpansionJob[];
  phase: ProjectExpansionPhase;
  onClose: () => void;
  isComplete: boolean;
}

const PhaseIndicator: React.FC<{title: string, isActive: boolean, isComplete: boolean}> = ({ title, isActive, isComplete }) => (
    <div className="flex items-center gap-2">
        {isActive && <Spinner className="h-4 w-4" />}
        {isComplete && <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</div>}
        <span className={isActive ? "text-purple-300" : isComplete ? "text-gray-300" : "text-gray-500"}>{title}</span>
    </div>
);

export const ProjectExpansionProgress: React.FC<ProjectExpansionProgressProps> = ({ jobs, phase, onClose, isComplete }) => {
  const completedCount = jobs.filter(j => j.status === 'success' || j.status === 'failed').length;
  const successCount = jobs.filter(j => j.status === 'success').length;
  const progress = jobs.length > 0 ? (completedCount / jobs.length) * 100 : 0;
  
  const activeJobs = jobs.filter(j => j.status === 'generating' || j.status === 'committing' || j.status === 'retrying');

  const getStatusMessage = () => {
    switch(phase) {
        case 'planning': return 'Master agent is analyzing the seed file and planning massive expansion...';
        case 'generating': return `Executing plan: ${jobs.length} file operations...`;
        case 'complete': return 'Project expansion complete!';
        default: return 'Initializing...';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-gray-700">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-purple-400">AI Project Expansion</h2>
            {isComplete && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            )}
        </div>
        
        <div className="mb-4 flex-shrink-0 space-y-3">
            <div className="flex items-center justify-around p-2 bg-gray-900 rounded-md">
                <PhaseIndicator title="1. Planning" isActive={phase === 'planning'} isComplete={['generating', 'complete'].includes(phase)} />
                <div className="flex-grow h-px bg-gray-700 mx-4"></div>
                <PhaseIndicator title="2. Execution" isActive={phase === 'generating'} isComplete={phase === 'complete'} />
            </div>
             <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span className="flex items-center gap-2">
                    {phase !== 'complete' && <Spinner className="h-4 w-4" />}
                    {getStatusMessage()}
                </span>
                <span>{`${successCount} / ${jobs.length} file operations successful`}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
        
        {phase === 'planning' ? (
             <div className="flex-grow min-h-0 bg-gray-900 rounded-md p-4 flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <Spinner className="h-8 w-8 mx-auto mb-4" />
                    <p>Master agent is analyzing the seed file...</p>
                    <p className="text-sm text-gray-500">This may take a few moments.</p>
                </div>
             </div>
        ) : (
            <div className="grid grid-cols-3 gap-4 flex-grow min-h-0">
                <div className="col-span-1 bg-gray-900 rounded-md p-4 overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-2 text-gray-200">Execution Plan ({jobs.length} Operations)</h3>
                    <ul className="space-y-1">
                        {jobs.map(job => (
                            <li key={job.id} className="flex items-center justify-between text-sm p-1.5 bg-gray-800 rounded">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <StatusIcon status={job.status} />
                                {job.type === 'edit' ? 
                                    <span className="text-xs font-mono text-yellow-400 bg-yellow-900 px-1.5 py-0.5 rounded flex-shrink-0">[EDIT]</span> :
                                    <span className="text-xs font-mono text-green-400 bg-green-900 px-1.5 py-0.5 rounded flex-shrink-0">[NEW]</span>
                                }
                                <span className="truncate" title={job.path}>{job.path}</span>
                            </div>
                             {(job.status === 'failed' || job.status === 'retrying') && <span className="text-red-400 text-xs truncate ml-2 cursor-pointer" title={job.error || 'Unknown error'}>{job.error}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="col-span-2 bg-gray-900 rounded-md p-4 flex flex-col">
                    <h3 className="text-lg font-semibold mb-2 text-gray-200">Live Workstream ({activeJobs.length} active)</h3>
                    {activeJobs.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-grow min-h-0">
                        {activeJobs.slice(0, 8).map(job => (
                            <div key={job.id} className="flex-grow flex flex-col min-h-0 bg-gray-850 rounded-lg p-2">
                                <p className="text-blue-300 font-mono text-xs mb-2 truncate" title={job.path}>
                                    Agent {job.agentIndex} {job.status === 'generating' ? 'Generating' : 'Committing'}: <span className="font-bold">{job.path.split('/').pop()}</span>
                                </p>
                                <div className="bg-gray-950 rounded p-2 flex-grow overflow-y-auto">
                                        <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                                            <code>{job.content}</code>
                                        </pre>
                                </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            {isComplete ? "All jobs complete." : "Waiting for next job..."}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};