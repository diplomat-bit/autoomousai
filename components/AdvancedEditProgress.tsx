
import React from 'react';
import { AdvancedEditJob, AdvancedEditPhase } from '../types';
import { Spinner } from './Spinner';
import { BotIcon } from './icons/BotIcon';

const StatusIcon: React.FC<{ status: AdvancedEditJob['status'] }> = ({ status }) => {
    switch (status) {
        case 'planning':
        case 'editing':
            return <Spinner className="w-4 h-4 text-blue-400" />;
        case 'verifying':
            return <Spinner className="w-4 h-4 text-yellow-400" />;
        case 'committing':
            return <Spinner className="w-4 h-4 text-orange-400" />;
        case 'success': 
            return <div title="Success" className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</div>;
        case 'failed': 
            return <div title="Failed" className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">!</div>;
        default: 
             return <div title="Pending" className="w-4 h-4 rounded-full bg-gray-600 flex-shrink-0"></div>;
    }
};

const PhaseIndicator: React.FC<{title: string, isActive: boolean, isComplete: boolean}> = ({ title, isActive, isComplete }) => (
    <div className="flex items-center gap-2">
        {isActive && <Spinner className="h-4 w-4" />}
        {isComplete && <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</div>}
        <span className={isActive ? "text-indigo-300" : isComplete ? "text-gray-300" : "text-gray-500"}>{title}</span>
    </div>
);

interface AdvancedEditProgressProps {
  jobs: AdvancedEditJob[];
  phase: AdvancedEditPhase;
  verificationAttempt: number;
  buildLogs: string | null;
  workflowRunUrl: string | null;
  aiThought: string | null;
  deploymentUrl: string | null;
  onClose: () => void;
  isComplete: boolean;
}

export const AdvancedEditProgress: React.FC<AdvancedEditProgressProps> = ({ jobs, phase, verificationAttempt, buildLogs, workflowRunUrl, aiThought, deploymentUrl, onClose, isComplete }) => {
  const completedCount = jobs.filter(j => j.status === 'success').length;
  const progress = jobs.length > 0 ? (completedCount / jobs.length) * 100 : 0;
  
  const getStatusMessage = () => {
    switch(phase) {
        case 'analyzing': return 'Analyzing repository context...';
        case 'planning': return 'AI is creating an edit plan...';
        case 'editing': return `AI is performing iterative edits on ${jobs.length} file(s)...`;
        case 'committing': return 'Committing all changes to trigger workflow...';
        case 'triggering_workflow': return 'Triggering GitHub Actions workflow...';
        case 'waiting_for_workflow': return `Running CI build (Attempt ${verificationAttempt})...`;
        case 'analyzing_failure': return `Build failed (Attempt ${verificationAttempt}). Analyzing logs for correction...`;
        case 'complete': return 'Advanced edit complete and verified!';
        default: return 'Initializing...';
    }
  };

  const currentFocusJob = jobs.find(job => job.status === 'editing') || jobs.find(job => job.status === 'committing') || jobs[jobs.length - 1];

  return (
    <div className="fixed inset-0 bg-gray-950 bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-gray-700">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-indigo-400">Advanced AI Iterative Edit</h2>
                {workflowRunUrl && (
                    <a href={workflowRunUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                        View Workflow Run
                    </a>
                )}
            </div>
            {isComplete && (
              <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">
                Close
              </button>
            )}
        </div>
        
        <div className="mb-4 flex-shrink-0 space-y-3">
            <div className="grid grid-cols-5 items-center justify-around p-2 bg-gray-900 rounded-md text-sm">
                <PhaseIndicator title="1. Plan" isActive={phase === 'analyzing' || phase === 'planning'} isComplete={!['idle', 'analyzing', 'planning'].includes(phase)} />
                <div className="flex-grow h-px bg-gray-700 mx-2"></div>
                <PhaseIndicator title="2. Iterative Edit" isActive={phase === 'editing'} isComplete={!['idle', 'analyzing', 'planning', 'editing'].includes(phase)} />
                <div className="flex-grow h-px bg-gray-700 mx-2"></div>
                <PhaseIndicator title="3. Commit" isActive={phase === 'committing'} isComplete={!['idle', 'analyzing', 'planning', 'editing', 'committing'].includes(phase)} />
                <div className="flex-grow h-px bg-gray-700 mx-2"></div>
                <PhaseIndicator title="4. Verify (CI)" isActive={phase === 'triggering_workflow' || phase === 'waiting_for_workflow' || phase === 'analyzing_failure'} isComplete={phase === 'complete'} />
                <div className="flex-grow h-px bg-gray-700 mx-2"></div>
                 <PhaseIndicator title="5. Done" isActive={false} isComplete={phase === 'complete'} />
            </div>
             <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span className="flex items-center gap-2">{getStatusMessage()}</span>
                <span>{`${completedCount} / ${jobs.length} files committed`}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
        
        {aiThought && (
            <div className="mb-4 p-4 bg-gray-900 rounded-md border border-gray-700 overflow-y-auto max-h-32">
                <h3 className="text-lg font-semibold mb-2 text-indigo-300 flex items-center gap-2">
                    <BotIcon className="w-5 h-5" />
                    Architectural Strategy
                </h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{aiThought}</p>
            </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 flex-grow min-h-0">
            <div className="bg-gray-900 rounded-md p-4 flex flex-col">
                <h3 className="text-lg font-semibold mb-2 text-gray-200">Execution Plan ({jobs.length})</h3>
                <ul className="space-y-2 overflow-y-auto">
                    {jobs.map(job => (
                        <li key={job.id} className="flex flex-col text-sm p-2 bg-gray-800 rounded border border-gray-700">
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3 overflow-hidden">
                                   <StatusIcon status={job.status} />
                                   <span className="truncate font-semibold" title={job.path}>{job.path}</span>
                               </div>
                           </div>
                           {job.checkpoints && job.checkpoints.length > 0 && (
                               <div className="mt-2 pl-7 space-y-1">
                                   {job.checkpoints.map(cp => (
                                       <div key={cp.id} className={`flex items-center gap-2 text-xs ${cp.status === 'completed' ? 'text-green-400' : cp.status === 'active' ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                                           <div className={`w-1.5 h-1.5 rounded-full ${cp.status === 'completed' ? 'bg-green-400' : cp.status === 'active' ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'}`}></div>
                                           <span className="truncate">{cp.title}</span>
                                       </div>
                                   ))}
                               </div>
                           )}
                        </li>
                    ))}
                 </ul>
            </div>
            <div className="bg-gray-900 rounded-md p-4 flex flex-col">
                { isComplete && deploymentUrl ? (
                    <>
                        <h3 className="text-lg font-semibold mb-2 text-green-400">Live Deployment Preview</h3>
                        <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 p-3 rounded-md mb-4 text-sm">
                            <p>GitHub Pages may prevent embedding. If the panel below is blank, please use the direct link.</p>
                            <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold mt-2 inline-block">Open Live Site &rarr;</a>
                        </div>
                        <div className="flex-grow bg-white rounded-md overflow-hidden border-4 border-gray-700">
                            <iframe src={deploymentUrl} title="Live Deployment" className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" />
                        </div>
                    </>
                ) : phase === 'analyzing_failure' && buildLogs ? (
                    <>
                        <h3 className="text-lg font-semibold mb-2 text-red-400">Build Failure Logs</h3>
                        <div className="bg-black rounded p-2 flex-grow overflow-y-auto">
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-mono">
                                <code>{buildLogs}</code>
                            </pre>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-semibold mb-2 text-gray-200">Current Iteration Output</h3>
                        {currentFocusJob ? (
                             <div className="flex-grow flex flex-col min-h-0 bg-gray-850 rounded-lg p-2 border border-blue-900">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-blue-300 font-mono text-xs truncate" title={currentFocusJob.path}>
                                        {currentFocusJob.path.split('/').pop()}
                                    </p>
                                    <span className="text-[10px] bg-blue-900 px-1 rounded text-blue-100 font-mono">
                                        {currentFocusJob.checkpoints?.find(c => c.status === 'active')?.title || 'Processing'}
                                    </span>
                                </div>
                                <div className="bg-gray-950 rounded p-2 flex-grow overflow-y-auto">
                                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                                        <code>{currentFocusJob.content}</code>
                                    </pre>
                                </div>
                            </div>
                        ) : (
                             <div className="flex items-center justify-center h-full text-gray-500 font-mono">
                                <p>&gt; Waiting for architectural plan...</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
