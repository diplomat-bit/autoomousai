
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AuthModal } from './components/AuthModal';
import { FileExplorer } from './components/FileExplorer';
import { EditorCanvas } from './components/EditorCanvas';
import { fetchAllRepos, fetchRepoTree, getFileContent, commitFile, getRepoBranches, createBranch, createPullRequest, createRepo, triggerWorkflow, getWorkflowRuns, getWorkflowRun, getWorkflowRunLogs } from './services/githubService';
import { primaryModels, fallbackModels, planRepositoryEdit, bulkEditFileWithAI, generateProjectPlan, generateFileContent, planProjectExpansionEdits, modelsToUse, streamSingleFileEdit, cleanAiCodeResponse, correctCodeFromBuildError, streamRepositoryFileEdit, setGeminiApiKey } from './services/geminiService';
import { GithubRepo, UnifiedFileTree, SelectedFile, Alert, Branch, FileNode, DirNode, BulkEditJob, ProjectGenerationJob, ProjectExpansionJob, ProjectExpansionPhase, ProjectPlan, AdvancedEditJob, AdvancedEditPhase, WorkflowRun, AdvancedEditJobStatus, RepositoryEditPlan, ProjectExpansionPlan, EditCheckpoint } from './types';
import { Spinner } from './components/Spinner';
import { AlertPopup } from './components/AlertPopup';
import { MultiFileAiEditModal } from './components/BulkAiEditModal';
import { BulkEditProgress } from './components/BulkEditProgress';
import { NewProjectModal } from './components/NewProjectModal';
import { ProjectGenerationProgress } from './components/ProjectGenerationProgress';
import { ProjectExpansionModal } from './components/ProjectExpansionModal';
import { ProjectExpansionProgress } from './components/ProjectExpansionProgress';
import { AdvancedAiEditModal } from './components/AdvancedAiEditModal';
import { AdvancedEditProgress } from './components/AdvancedEditProgress';
import { AiChatModal } from './components/AiChatModal';
import { getAllFilePaths } from './utils';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<UnifiedFileTree>({});
  
  const [openFiles, setOpenFiles] = useState<SelectedFile[]>([]);
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [alert, setAlert] = useState<Alert | null>(null);
  
  const [branchesByRepo, setBranchesByRepo] = useState<Record<string, Branch[]>>({});
  const [currentBranchByRepo, setCurrentBranchByRepo] = useState<Record<string, string>>({});

  const [isMultiEditModalOpen, setMultiEditModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditJobs, setBulkEditJobs] = useState<BulkEditJob[]>([]);
  
  const [isNewProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const [projectGenerationJobs, setProjectGenerationJobs] = useState<ProjectGenerationJob[]>([]);
  const [projectGenerationStatus, setProjectGenerationStatus] = useState('');
  
  const [isExpansionModalOpen, setExpansionModalOpen] = useState(false);
  const [isExpandingProject, setIsExpandingProject] = useState(false);
  const [expansionJobs, setExpansionJobs] = useState<ProjectExpansionJob[]>([]);
  const [expansionPhase, setExpansionPhase] = useState<ProjectExpansionPhase>('idle');
  
  const [isAdvancedEditModalOpen, setAdvancedEditModalOpen] = useState(false);
  const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
  const [advancedEditJobs, setAdvancedEditJobs] = useState<AdvancedEditJob[]>([]);
  const [advancedEditPhase, setAdvancedEditPhase] = useState<AdvancedEditPhase>('idle');
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [advancedEditBuildLogs, setAdvancedEditBuildLogs] = useState<string | null>(null);
  const [workflowRunUrl, setWorkflowRunUrl] = useState<string | null>(null);
  const [aiThought, setAiThought] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);

  const [isAiChatModalOpen, setAiChatModalOpen] = useState(false);

  const activeFile = openFiles.find(f => (f.repoFullName + '::' + f.path) === activeFileKey);
  const currentBranch = activeFile ? currentBranchByRepo[activeFile.repoFullName] : null;
  const branches = activeFile ? branchesByRepo[activeFile.repoFullName] || [] : [];

  const handleTokenSubmit = useCallback(async (credentials: { githubToken: string; geminiKey?: string }) => {
    if (!credentials.githubToken) return;
    if (credentials.geminiKey) setGeminiApiKey(credentials.geminiKey);
    setToken(credentials.githubToken);
    setIsLoading(true);
    setLoadingMessage('Fetching repositories...');
    try {
      const repos: GithubRepo[] = await fetchAllRepos(credentials.githubToken);
      const newFileTree: UnifiedFileTree = {};
      const repoPromises = repos.map(async (repo) => {
        try {
          newFileTree[repo.full_name] = { repo, tree: [] };
          const tree = await fetchRepoTree(credentials.githubToken, repo.owner.login, repo.name, repo.default_branch);
          newFileTree[repo.full_name].tree = tree;
          const repoBranches = await getRepoBranches(credentials.githubToken, repo.owner.login, repo.name);
          setBranchesByRepo(prev => ({ ...prev, [repo.full_name]: repoBranches }));
          setCurrentBranchByRepo(prev => ({ ...prev, [repo.full_name]: repo.default_branch }));
        } catch (e) {
          console.error(`Failed to fetch tree for ${repo.full_name}`, e);
        }
      });
      await Promise.all(repoPromises);
      setFileTree(newFileTree);
    } catch (error) {
      console.error(error);
      setAlert({ type: 'error', message: 'Failed to load repositories. Check your token.' });
      setToken(null);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const handleFileSelect = async (repoFullName: string, path: string) => {
    const fileKey = repoFullName + '::' + path;
    const existingFile = openFiles.find(f => (f.repoFullName + '::' + f.path) === fileKey);
    if (existingFile) { setActiveFileKey(fileKey); return; }
    if (!token) return;
    setIsLoading(true);
    setLoadingMessage(`Opening ${path}...`);
    try {
        const repo = fileTree[repoFullName]?.repo;
        if (!repo) throw new Error("Repo not found");
        const branch = currentBranchByRepo[repoFullName] || repo.default_branch;
        const { content, sha } = await getFileContent(token, repo.owner.login, repo.name, path, branch);
        const newFile: SelectedFile = { repoFullName, path, content, editedContent: content, sha, defaultBranch: repo.default_branch };
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFileKey(fileKey);
    } catch (error) {
        setAlert({ type: 'error', message: `Failed to open file: ${path}` });
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleCloseFile = (fileKey: string) => {
    setOpenFiles(prev => prev.filter(f => (f.repoFullName + '::' + f.path) !== fileKey));
    if (activeFileKey === fileKey) setActiveFileKey(null);
  };

  const handleFileContentChange = (fileKey: string, newContent: string) => {
    setOpenFiles(prev => prev.map(f => {
      if ((f.repoFullName + '::' + f.path) === fileKey) return { ...f, editedContent: newContent };
      return f;
    }));
  };

  const handleSetActiveFile = (fileKey: string) => setActiveFileKey(fileKey);

  const handleCommit = async (commitMessage: string) => {
    if (!activeFile || !token) return;
    setIsLoading(true);
    setLoadingMessage('Committing changes...');
    try {
        const [owner, repoName] = activeFile.repoFullName.split('/');
        const branch = currentBranchByRepo[activeFile.repoFullName] || activeFile.defaultBranch;
        const newSha = await commitFile({ token, owner, repo: repoName, branch, path: activeFile.path, content: activeFile.editedContent, message: commitMessage, sha: activeFile.sha });
        setOpenFiles(prev => prev.map(f => {
            if ((f.repoFullName + '::' + f.path) === activeFileKey) return { ...f, content: f.editedContent, sha: newSha };
            return f;
        }));
        setAlert({ type: 'success', message: 'Changes committed successfully!' });
    } catch (error) {
        setAlert({ type: 'error', message: 'Failed to commit changes.' });
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleBranchChange = async (newBranch: string) => {
      if (!activeFile || !token) return;
      const repoFullName = activeFile.repoFullName;
      setCurrentBranchByRepo(prev => ({ ...prev, [repoFullName]: newBranch }));
      setIsLoading(true);
      try {
          const [owner, repoName] = repoFullName.split('/');
          const { content, sha } = await getFileContent(token, owner, repoName, activeFile.path, newBranch);
           setOpenFiles(prev => prev.map(f => {
            if ((f.repoFullName + '::' + f.path) === activeFileKey) return { ...f, content, editedContent: content, sha };
            return f;
        }));
        const tree = await fetchRepoTree(token, owner, repoName, newBranch);
        setFileTree(prev => ({ ...prev, [repoFullName]: { ...prev[repoFullName], tree } }));
      } catch (e) {
          setAlert({ type: 'error', message: "Failed to switch branch/reload file."});
      } finally {
          setIsLoading(false);
      }
  };

  const handleCreateBranch = async (newBranchName: string) => {
      if (!activeFile || !token) return;
      setIsLoading(true);
      try {
          const [owner, repoName] = activeFile.repoFullName.split('/');
          const currentBranchName = currentBranchByRepo[activeFile.repoFullName] || activeFile.defaultBranch;
          const branchData = await getRepoBranches(token, owner, repoName);
          const currentBranchData = branchData.find(b => b.name === currentBranchName);
          if (!currentBranchData) throw new Error("Could not find current branch tip SHA");
          await createBranch(token, owner, repoName, newBranchName, currentBranchData.commit.sha);
          const newBranches = await getRepoBranches(token, owner, repoName);
          setBranchesByRepo(prev => ({...prev, [activeFile.repoFullName]: newBranches}));
          handleBranchChange(newBranchName);
          setAlert({ type: 'success', message: `Branch ${newBranchName} created and active.`});
      } catch (e) {
          setAlert({ type: 'error', message: 'Failed to create branch.' });
      } finally {
          setIsLoading(false);
      }
  };

  const handleCreatePullRequest = async (title: string, body: string) => {
      if (!activeFile || !token) return;
      setIsLoading(true);
      try {
          const [owner, repoName] = activeFile.repoFullName.split('/');
          const head = currentBranchByRepo[activeFile.repoFullName];
          const base = activeFile.defaultBranch;
          const pr = await createPullRequest({ token, owner, repo: repoName, title, body, head, base });
          setAlert({ type: 'success', message: `Pull Request #${pr.number} created: ${pr.html_url}` });
      } catch (e) {
           setAlert({ type: 'error', message: 'Failed to create Pull Request.' });
      } finally {
          setIsLoading(false);
      }
  };

  const toggleFileSelection = (fileKey: string, isSelected: boolean) => {
      const newSelection = new Set(selectedFiles);
      if (isSelected) newSelection.add(fileKey); else newSelection.delete(fileKey);
      setSelectedFiles(newSelection);
  };

  const toggleDirectorySelection = (nodes: (DirNode | FileNode)[], repoFullName: string, shouldSelect: boolean) => {
      const paths = getAllFilePaths(nodes);
      const newSelection = new Set(selectedFiles);
      paths.forEach(p => {
          const key = `${repoFullName}::${p}`;
          if (shouldSelect) newSelection.add(key); else newSelection.delete(key);
      });
      setSelectedFiles(newSelection);
  };

  const handleStartBulkEdit = () => {
      if (selectedFiles.size === 0) return;
      setMultiEditModalOpen(true);
  };

  const handleBulkEditSubmit = async (instruction: string) => {
      setMultiEditModalOpen(false);
      setIsBulkEditing(true);
      const jobs: BulkEditJob[] = Array.from(selectedFiles).map((key: string) => {
          const [repoFullName, ...pathParts] = key.split('::');
          return { id: key, repoFullName, path: pathParts.join('::'), status: 'queued', content: '', error: null };
      });
      setBulkEditJobs(jobs);

      const processJob = async (job: BulkEditJob) => {
         if (!token) return;
         setBulkEditJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'planning' } : j));
         try {
             const [owner, repo] = job.repoFullName.split('/');
             const { content: originalContent, sha } = await getFileContent(token, owner, repo, job.path, currentBranchByRepo[job.repoFullName]);
             const finalContent = await bulkEditFileWithAI(
                 originalContent,
                 instruction,
                 job.path,
                 (checkpoints, currentContent) => {
                     setBulkEditJobs(prev => prev.map(j => j.id === job.id ? { 
                         ...j, 
                         status: 'processing',
                         checkpoints, 
                         content: currentContent,
                         currentCheckpointId: checkpoints.find(c => c.status === 'active')?.id || j.currentCheckpointId
                     } : j));
                 },
                 "gemini-3-flash-preview" // Faster model for execution
             );
             await commitFile({ token, owner, repo, branch: currentBranchByRepo[job.repoFullName] || 'main', path: job.path, content: finalContent, message: `AI Iterative Edit: ${instruction.slice(0, 50)}...`, sha });
             setBulkEditJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success' } : j));
         } catch (e: any) {
             setBulkEditJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed', error: e.message } : j));
         }
      };

      const CONCURRENCY = 5; // Aggressive concurrency
      let currentIndex = 0;
      const runNext = () => {
          if (currentIndex >= jobs.length) return;
          const job = jobs[currentIndex++];
          processJob(job).finally(() => runNext());
      };
      for (let i = 0; i < Math.min(CONCURRENCY, jobs.length); i++) runNext();
  };

  const handleStartNewProject = () => setNewProjectModalOpen(true);

  const handleProjectGenerationSubmit = async (repoName: string, prompt: string, isPrivate: boolean) => {
      if (!token) return;
      setNewProjectModalOpen(false);
      setIsGeneratingProject(true);
      setProjectGenerationStatus('Initializing repository...');
      setProjectGenerationJobs([]);
      try {
          const repo = await createRepo({ token, name: repoName, description: `AI Generated: ${prompt.slice(0, 50)}...`, isPrivate });
          setProjectGenerationStatus(`Repository ${repo.full_name} created. Planning structure...`);
          const plan = await generateProjectPlan(prompt, "gemini-3-flash-preview");
          
          const jobs: ProjectGenerationJob[] = plan.files.map(f => ({ id: f.path, path: f.path, description: f.description, status: 'queued', content: '', error: null }));
          setProjectGenerationJobs(jobs);
          setProjectGenerationStatus('Generating files...');
          
           const processJob = async (job: ProjectGenerationJob) => {
                setProjectGenerationJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'generating' } : j));
                let finalContent = '';
                try {
                     await generateFileContent(prompt, job.path, job.description, (chunk) => {
                             finalContent += chunk;
                             setProjectGenerationJobs(prev => prev.map(j => j.id === job.id ? { ...j, content: finalContent } : j));
                         }, () => finalContent, "gemini-3-flash-preview" );
                     
                     const cleanedContent = cleanAiCodeResponse(finalContent);
                     setProjectGenerationJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'committing' } : j));
                     await commitFile({ token, owner: repo.owner.login, repo: repo.name, branch: repo.default_branch, path: job.path, content: cleanedContent, message: `AI Create: ${job.path}` });
                     setProjectGenerationJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success' } : j));
                } catch (e: any) {
                    setProjectGenerationJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed', error: e.message } : j));
                }
           };
            const CONCURRENCY = 8;
            let currentIndex = 0;
            const runNext = () => { if (currentIndex >= jobs.length) return; const job = jobs[currentIndex++]; processJob(job).finally(() => runNext()); };
            for (let i = 0; i < Math.min(CONCURRENCY, jobs.length); i++) runNext();
      } catch (error: any) { setProjectGenerationStatus(`Error: ${error.message}`); }
  };

  const handleStartProjectExpansion = () => setExpansionModalOpen(true);

  const handleExpansionSubmit = async (prompt: string) => {
      setExpansionModalOpen(false);
      setIsExpandingProject(true);
      setExpansionPhase('planning');
      setExpansionJobs([]);
      if (!token || selectedFiles.size !== 1) { setAlert({ type: 'error', message: 'Please select exactly one seed file.' }); setIsExpandingProject(false); return; }
      const seedFileKey = Array.from(selectedFiles)[0] as string;
      const [repoFullName, ...pathParts] = seedFileKey.split('::');
      const seedFilePath = pathParts.join('::');
      const [owner, repo] = repoFullName.split('/');
      try {
          const { content: seedContent } = await getFileContent(token, owner, repo, seedFilePath, currentBranchByRepo[repoFullName]);
          const plan = await planProjectExpansionEdits([{ path: seedFilePath, content: seedContent }], prompt, "gemini-3-flash-preview");
          
          const jobs: ProjectExpansionJob[] = plan.filesToCreate.map(f => ({ id: f.path, path: f.path, type: 'create', description: f.description, agentIndex: f.agentIndex, status: 'queued', content: '', error: null }));
          setExpansionJobs(jobs);
          setExpansionPhase('generating');
           const processJob = async (job: ProjectExpansionJob) => {
                setExpansionJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'generating' } : j));
                let finalContent = '';
                try {
                     await generateFileContent(prompt, job.path, job.description, (chunk) => {
                             finalContent += chunk;
                             setExpansionJobs(prev => prev.map(j => j.id === job.id ? { ...j, content: finalContent } : j));
                         }, () => finalContent, "gemini-3-flash-preview" );
                     const cleanedContent = cleanAiCodeResponse(finalContent);
                     setExpansionJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'committing' } : j));
                     await commitFile({ token: token!, owner, repo, branch: currentBranchByRepo[repoFullName] || 'main', path: job.path, content: cleanedContent, message: `AI Expansion: ${job.path}` });
                     setExpansionJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success' } : j));
                } catch (e: any) {
                    setExpansionJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'failed', error: e.message } : j));
                }
           };
            const CONCURRENCY = 10;
            let currentIndex = 0;
            const runNext = () => { if (currentIndex >= jobs.length) return; const job = jobs[currentIndex++]; processJob(job).finally(() => runNext()); };
            for (let i = 0; i < Math.min(CONCURRENCY, jobs.length); i++) runNext();
            const checkCompletion = setInterval(() => {
                const pending = jobs.filter(j => ['queued', 'generating', 'committing', 'retrying'].includes(j.status)).length;
                if (pending === 0 && currentIndex >= jobs.length) { setExpansionPhase('complete'); clearInterval(checkCompletion); }
            }, 1000);
      } catch (error: any) {
          setAlert({ type: 'error', message: `Expansion failed: ${error.message}` });
          setExpansionPhase('complete');
      }
  };

  const handleStartAdvancedEdit = () => setAdvancedEditModalOpen(true);

  const handleAdvancedEditSubmit = async (instruction: string, workflowId: string) => {
      setAdvancedEditModalOpen(false);
      setIsAdvancedEditing(true);
      setAdvancedEditPhase('analyzing');
      setAdvancedEditJobs([]);
      setVerificationAttempt(1);
      setAdvancedEditBuildLogs(null);
      setWorkflowRunUrl(null);
      setAiThought(null);
      setDeploymentUrl(null);
      if (!token || !activeFile) return;
      const [owner, repo] = activeFile.repoFullName.split('/');
      const branch = currentBranchByRepo[activeFile.repoFullName] || activeFile.defaultBranch;
      const getRepositoryContext = async () => openFiles.map(f => ({ path: f.path, content: f.content, sha: f.sha }));
      try {
          let currentFiles = await getRepositoryContext();
          let currentPhaseInstruction = instruction;
          let attempt = 1;
          const MAX_ATTEMPTS = 3;
          while (attempt <= MAX_ATTEMPTS) {
              setVerificationAttempt(attempt);
              if (attempt === 1) setAdvancedEditPhase('planning'); else setAdvancedEditPhase('analyzing_failure');
              const plan = attempt === 1 
                ? await planRepositoryEdit(currentPhaseInstruction, activeFile.path, currentFiles, "gemini-3-flash-preview")
                : await correctCodeFromBuildError(instruction, currentFiles, [], advancedEditBuildLogs || '', "gemini-3-flash-preview");
              
              if (!plan) throw new Error("Failed to generate edit plan.");
              setAiThought(plan.reasoning);
              const jobs: AdvancedEditJob[] = plan.filesToEdit.map(f => ({ id: f.path, path: f.path, status: 'planning', content: '', error: null }));
              setAdvancedEditJobs(jobs);
              setAdvancedEditPhase('editing');
              for (const fileEdit of plan.filesToEdit) {
                  const jobIndex = jobs.findIndex(j => j.path === fileEdit.path);
                  if (jobIndex === -1) continue;
                  setAdvancedEditJobs(prev => prev.map((j, i) => i === jobIndex ? { ...j, status: 'editing' } : j));
                  let originalContent = currentFiles.find(f => f.path === fileEdit.path)?.content || '';
                  if (!originalContent) { try { const f = await getFileContent(token, owner, repo, fileEdit.path, branch); originalContent = f.content; } catch (e) { } }
                  const finalContent = await streamRepositoryFileEdit(originalContent, fileEdit.changes, fileEdit.path, (checkpoints, currentContent) => {
                      setAdvancedEditJobs(prev => prev.map((j, i) => i === jobIndex ? { 
                          ...j, 
                          checkpoints, 
                          content: currentContent,
                          currentCheckpointId: checkpoints.find(c => c.status === 'active')?.id || j.currentCheckpointId
                      } : j));
                  }, "gemini-3-flash-preview");
                  setAdvancedEditPhase('committing');
                  setAdvancedEditJobs(prev => prev.map((j, i) => i === jobIndex ? { ...j, status: 'committing' } : j));
                   await commitFile({ token, owner, repo, branch, path: fileEdit.path, content: finalContent, message: `AI Advanced Edit (Attempt ${attempt}): ${fileEdit.path}`, sha: currentFiles.find(f => f.path === fileEdit.path)?.sha });
                  setAdvancedEditJobs(prev => prev.map((j, i) => i === jobIndex ? { ...j, status: 'success' } : j));
              }
              setAdvancedEditPhase('triggering_workflow');
              await triggerWorkflow(token, owner, repo, workflowId, branch);
              setAdvancedEditPhase('waiting_for_workflow');
              await new Promise(r => setTimeout(r, 5000));
              let run: WorkflowRun | null = null;
              while (true) {
                  const runs = await getWorkflowRuns(token, owner, repo, workflowId, branch);
                  if (runs.workflow_runs.length > 0) { run = runs.workflow_runs[0]; setWorkflowRunUrl(run.html_url); if (run.status === 'completed') break; }
                  await new Promise(r => setTimeout(r, 5000));
              }
              if (run && run.conclusion === 'success') { setAdvancedEditPhase('complete'); setDeploymentUrl(`https://${owner}.github.io/${repo}/`); return; } else {
                  setAdvancedEditPhase('analyzing_failure');
                  const logs = await getWorkflowRunLogs(token, owner, repo, run!.id);
                  setAdvancedEditBuildLogs(logs);
                  attempt++;
              }
          }
          setAlert({ type: 'error', message: 'Max verification attempts reached. Build still failing.' });
          setAdvancedEditPhase('complete');
      } catch (error: any) {
          setAlert({ type: 'error', message: `Advanced edit failed: ${error.message}` });
          setAdvancedEditPhase('complete');
      }
  };

  const handleStartSimpleAiEdit = () => setAiChatModalOpen(true);
  
  const handleSimpleAiEditSubmit = async (instruction: string) => {
      setAiChatModalOpen(false);
      if (!activeFile || !token) return;
      const fileKey = activeFileKey!;
      try {
          const finalContent = await streamSingleFileEdit(
              activeFile.editedContent, 
              instruction, 
              activeFile.path, 
              (checkpoints, currentContent) => {
                  handleFileContentChange(fileKey, currentContent);
              },
              "gemini-3-flash-preview"
          );
          handleFileContentChange(fileKey, finalContent);
      } catch (e) {
          setAlert({ type: 'error', message: "AI Edit failed."});
      }
  };

  if (!token) return <AuthModal onSubmit={handleTokenSubmit} isLoading={isLoading} />;

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200 font-sans">
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <FileExplorer fileTree={fileTree} onFileSelect={handleFileSelect} onStartMultiEdit={handleStartBulkEdit} onStartNewProject={handleStartNewProject} onStartProjectExpansion={handleStartProjectExpansion} selectedFilePath={activeFile?.path} selectedRepo={activeFile?.repoFullName} selectedFiles={selectedFiles} onFileSelection={toggleFileSelection} onDirectorySelection={toggleDirectorySelection} />
      </div>
      <div className="flex-grow flex flex-col relative">
        <EditorCanvas openFiles={openFiles} activeFile={activeFile || null} onCommit={handleCommit} onAdvancedAiEdit={handleStartAdvancedEdit} onSimpleAiEditRequest={handleStartSimpleAiEdit} onFileContentChange={handleFileContentChange} onCloseFile={handleCloseFile} onSetActiveFile={handleSetActiveFile} isLoading={isLoading} branches={branches} currentBranch={currentBranch} onBranchChange={handleBranchChange} onCreateBranch={handleCreateBranch} onCreatePullRequest={handleCreatePullRequest} />
        {isLoading && loadingMessage && (
            <div className="absolute inset-0 bg-gray-950 bg-opacity-50 flex items-center justify-center z-20">
                <div className="bg-gray-850 p-4 rounded-lg shadow-lg flex items-center gap-3 border border-gray-700">
                    <Spinner />
                    <span>{loadingMessage}</span>
                </div>
            </div>
        )}
      </div>
      <AlertPopup alert={alert} onClose={() => setAlert(null)} />
      {isMultiEditModalOpen && <MultiFileAiEditModal fileCount={selectedFiles.size} onClose={() => setMultiEditModalOpen(false)} onSubmit={handleBulkEditSubmit} />}
      {isBulkEditing && <BulkEditProgress jobs={bulkEditJobs} onClose={() => setIsBulkEditing(false)} isComplete={bulkEditJobs.every(j => ['success', 'failed', 'skipped'].includes(j.status))} />}
      {isNewProjectModalOpen && <NewProjectModal onClose={() => setNewProjectModalOpen(false)} onSubmit={handleProjectGenerationSubmit} />}
      {isGeneratingProject && <ProjectGenerationProgress jobs={projectGenerationJobs} statusMessage={projectGenerationStatus} onClose={() => setIsGeneratingProject(false)} isComplete={projectGenerationJobs.length > 0 && projectGenerationJobs.every(j => ['success', 'failed'].includes(j.status))} />}
      {isExpansionModalOpen && <ProjectExpansionModal onClose={() => setExpansionModalOpen(false)} onSubmit={handleExpansionSubmit} />}
      {isExpandingProject && <ProjectExpansionProgress jobs={expansionJobs} phase={expansionPhase} onClose={() => setIsExpandingProject(false)} isComplete={expansionPhase === 'complete'} />}
      {isAdvancedEditModalOpen && activeFile && <AdvancedAiEditModal onClose={() => setAdvancedEditModalOpen(false)} onSubmit={handleAdvancedEditSubmit} token={token} repoFullName={activeFile.repoFullName} />}
      {isAdvancedEditing && <AdvancedEditProgress jobs={advancedEditJobs} phase={advancedEditPhase} verificationAttempt={verificationAttempt} buildLogs={advancedEditBuildLogs} workflowRunUrl={workflowRunUrl} aiThought={aiThought} deploymentUrl={deploymentUrl} onClose={() => setIsAdvancedEditing(false)} isComplete={advancedEditPhase === 'complete'} />}
      {isAiChatModalOpen && <AiChatModal onClose={() => setAiChatModalOpen(false)} onSubmit={handleSimpleAiEditSubmit} />}
    </div>
  );
}
