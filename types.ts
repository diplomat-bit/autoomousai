
export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  default_branch: string;
}

export interface GitTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  url: string;
  size?: number;
}

export interface FileContent {
  path: string;
  content: string; // base64 encoded
  sha: string;
}

export interface FileNode {
  type: 'file';
  path: string;
  name: string;
}

export interface DirNode {
  type: 'dir';
  path: string;
  name: string;
  children: (DirNode | FileNode)[];
}

export type UnifiedFileTree = {
  [repoFullName: string]: {
    repo: GithubRepo;
    tree: (DirNode | FileNode)[];
  };
};

export interface SelectedFile {
  repoFullName: string;
  path: string;
  content: string; // original content from git
  editedContent:string; // content being edited in the UI
  sha: string;
  defaultBranch: string;
}

export interface Alert {
  type: 'success' | 'error';
  message: string;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface PullRequestPayload {
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface PullRequest {
  id: number;
  html_url: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
}

export type BulkEditJobStatus = 'queued' | 'planning' | 'processing' | 'retrying' | 'success' | 'skipped' | 'failed';

export interface EditCheckpoint {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface BulkEditJob {
  id: string; // repoFullName::path
  repoFullName: string;
  path: string;
  status: BulkEditJobStatus;
  content: string; // For streaming preview
  error: string | null;
  checkpoints?: EditCheckpoint[];
  currentCheckpointId?: string | null;
}

export interface ProjectPlan {
    files: {
        path: string;
        description: string;
    }[];
}

export type ProjectGenerationJobStatus = 'queued' | 'generating' | 'committing' | 'retrying' | 'success' | 'failed';

export interface ProjectGenerationJob {
  id: string; // file path
  path: string;
  description: string;
  status: ProjectGenerationJobStatus;
  content: string; // For streaming preview
  error: string | null;
}

export interface ProjectExpansionPlan {
    filesToEdit: {
        path: string;
        changes: string; // Detailed instructions on what to change
    }[];
    filesToCreate: {
        path: string;
        description: string;
        agentIndex: number; 
    }[];
}

export type ProjectExpansionJobStatus = 'queued' | 'generating' | 'committing' | 'retrying' | 'success' | 'failed';
export type ProjectExpansionPhase = 'idle' | 'planning' | 'generating' | 'complete';

export interface ProjectExpansionJob {
  id: string; // file path
  path: string;
  type: 'edit' | 'create';
  description: string; // For creations, it's purpose. For edits, it's the planned changes.
  agentIndex: number;
  status: ProjectExpansionJobStatus;
  content: string; // For streaming preview
  error: string | null;
}

export interface Workflow {
  id: number;
  node_id: string;
  name: string;
  path: string;
  state: string;
}

export interface WorkflowRun {
  id: number;
  name:string;
  head_branch: string;
  status: 'queued' | 'in_progress' | 'completed' | 'requested';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
}

export interface RepositoryEditPlan {
    reasoning: string;
    filesToEdit: {
        path: string;
        changes: string; // Detailed instructions on what to change in this specific file
    }[];
}

export type AdvancedEditJobStatus = 'planning' | 'editing' | 'verifying' | 'committing' | 'success' | 'failed';
export type AdvancedEditPhase = 'idle' | 'analyzing' | 'planning' | 'editing' | 'committing' | 'triggering_workflow' | 'waiting_for_workflow' | 'analyzing_failure' | 'complete';

export interface AdvancedEditJob {
    id: string; // file path
    path: string;
    status: AdvancedEditJobStatus;
    content: string;
    error: string | null;
    checkpoints?: EditCheckpoint[];
    currentCheckpointId?: string | null;
}
