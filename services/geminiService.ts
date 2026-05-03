
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ProjectPlan, ProjectExpansionPlan, RepositoryEditPlan, EditCheckpoint } from '../types';

export const primaryModels = [
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
];

export const fallbackModels = [
    "gemini-2.5-flash-lite-preview-09-2025",
    "gemini-flash-lite-latest",
];

export const modelsToUse = [...primaryModels, ...fallbackModels];

const MAX_CONTEXT_CHARACTERS = 1000000; 

let geminiApiKey = process.env.API_KEY || '';

export const setGeminiApiKey = (key: string) => {
    geminiApiKey = key;
};

const prepareFileContext = (
    allFiles: { path: string, content: string }[],
    activeFilePath?: string
): string => {
    let context = '';
    let remainingChars = MAX_CONTEXT_CHARACTERS;
    
    const filesWithHeaders = allFiles.map(f => {
        const header = `--- START OF FILE ${f.path} ---\n`;
        const footer = `\n`;
        const fullContent = header + f.content + footer;
        return { ...f, fullContent, length: fullContent.length };
    });

    const activeFile = activeFilePath ? filesWithHeaders.find(f => f.path === activeFilePath) : null;
    const otherFiles = filesWithHeaders.filter(f => !activeFilePath || f.path !== activeFilePath);

    if (activeFile && activeFile.length <= remainingChars) {
        context += activeFile.fullContent;
        remainingChars -= activeFile.length;
    }

    for (const file of otherFiles) {
        if (file.length <= remainingChars) {
            context += file.fullContent;
            remainingChars -= file.length;
        } else {
            break;
        }
    }
    
    return context;
};

export const cleanAiCodeResponse = (rawContent: string): string => {
  if (!rawContent) return '';
  let cleaned = rawContent.trim();
  // Remove markdown fences more aggressively
  cleaned = cleaned.replace(/^```[\w]*\n/gm, '');
  cleaned = cleaned.replace(/\n```$/gm, '');
  return cleaned.trim();
};

async function streamAiResponse(
    model: string,
    prompt: string,
    onChunk: (chunk: string) => void
): Promise<void> {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            temperature: 0.2,
            topP: 0.95,
            topK: 64,
        },
    });

    for await (const chunk of responseStream) {
        if (chunk.text) {
            onChunk(chunk.text);
        }
    }
}

async function getAiJsonResponse<T>(
    model: string,
    prompt: string,
    schema: any
): Promise<T> {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.0,
        },
    });
    
    if (response.text) {
        return JSON.parse(response.text.trim()) as T;
    }
    throw new Error('AI returned an empty response.');
}

export const generateEditCheckpoints = async (
    originalContent: string,
    instruction: string,
    filePath: string,
    model: string = "gemini-3-flash-preview"
): Promise<EditCheckpoint[]> => {
    const prompt = `
        You are an expert software architect. Break the following massive change into discrete, logical checkpoints.
        Goal: "${instruction}"
        File: "${filePath}"
        
        Rules:
        1. Create 4-12 sequential checkpoints.
        2. Each checkpoint must be a specific coding task (e.g., "Implement Data Fetching Hooks", "Refactor UI Layout").
        3. The sequence must result in the complete completion of the goal.
        4. Return JSON list of checkpoints.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            checkpoints: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ['id', 'title', 'description']
                }
            }
        },
        required: ['checkpoints']
    };
    const result = await getAiJsonResponse<{ checkpoints: EditCheckpoint[] }>(model, prompt, schema);
    return result.checkpoints.map(cp => ({ ...cp, status: 'pending' }));
};

export const applyCheckpointToCode = async (
    currentContent: string,
    checkpoint: EditCheckpoint,
    fullGoal: string,
    filePath: string,
    onChunk: (chunk: string) => void,
    model: string = "gemini-3-flash-preview"
): Promise<void> => {
    const prompt = `
        Expert AI Engineer. 
        File Path: "${filePath}"
        OVERALL GOAL: "${fullGoal}"
        
        THIS SPECIFIC STEP: "${checkpoint.title}"
        STEP INSTRUCTIONS: "${checkpoint.description}"
        
        TASK:
        You MUST provide the ENTIRE file content including the changes for this step.
        Do NOT truncate. Do NOT omit unchanged sections.
        Return ONLY the raw source code.
        
        CURRENT CODE BASELINE:
        ---
        ${currentContent}
        ---
    `;
    await streamAiResponse(model, prompt, onChunk);
};

export const bulkEditFileWithAI = async (
  originalContent: string,
  instruction: string,
  filePath: string,
  onProgress: (checkpoints: EditCheckpoint[], currentContent: string) => void,
  model: string = "gemini-3-flash-preview",
): Promise<string> => {
    // 1. Plan using a fast model
    const checkpoints = await generateEditCheckpoints(originalContent, instruction, filePath, "gemini-3-flash-preview");
    onProgress(checkpoints, originalContent);
    
    let currentContent = originalContent;
    
    // 2. Execute sequentially with the fastest model to prevent timeouts
    for (let i = 0; i < checkpoints.length; i++) {
        const cp = checkpoints[i];
        cp.status = 'active';
        onProgress([...checkpoints], currentContent);
        
        let checkpointContent = '';
        await applyCheckpointToCode(
            currentContent,
            cp,
            instruction,
            filePath,
            (chunk) => {
                checkpointContent += chunk;
                // Periodic update to keep UI alive
                onProgress([...checkpoints], checkpointContent);
            },
            model // Use the requested model (usually flash for speed)
        );
        
        const cleaned = cleanAiCodeResponse(checkpointContent);
        if (cleaned.length < originalContent.length * 0.3 && originalContent.length > 5000) {
            // Safety check: if output is suspiciously short for a massive file, something failed
            console.warn("Possible truncation detected for checkpoint", cp.title);
        }
        
        currentContent = cleaned;
        cp.status = 'completed';
        onProgress([...checkpoints], currentContent);
    }
    
    return currentContent;
};

export const generateProjectPlan = async (
    prompt: string,
    model: string = "gemini-3-flash-preview"
): Promise<ProjectPlan> => {
    const promptForAI = `Architect goal: "${prompt}". Generate logical file structure JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            files: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        path: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ['path', 'description']
                }
            }
        },
        required: ['files']
    };
    return getAiJsonResponse<ProjectPlan>(model, promptForAI, schema);
};

export const generateFileContent = async (
    projectPrompt: string,
    filePath: string,
    fileDescription: string,
    onChunk: (chunk: string) => void,
    getFullResponse: () => string,
    model: string = "gemini-3-flash-preview"
): Promise<void> => {
    const prompt = `Goal: "${projectPrompt}". File: "${filePath}" (${fileDescription}). Return raw code ONLY.`;
    await streamAiResponse(model, prompt, onChunk);
};

export const planProjectExpansionEdits = async (
    fileContents: { path: string, content: string }[],
    prompt: string,
    model: string = "gemini-3-flash-preview"
): Promise<ProjectExpansionPlan> => {
    const fileContext = fileContents.map(f => `--- FILE ${f.path} ---\n${f.content}\n`).join('');
    const promptForAI = `Goal: "${prompt}". Context:\n${fileContext}\nGenerate massive expansion JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            filesToEdit: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { path: { type: Type.STRING }, changes: { type: Type.STRING } } } },
            filesToCreate: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { path: { type: Type.STRING }, description: { type: Type.STRING }, agentIndex: { type: Type.NUMBER } } } }
        }
    };
    return getAiJsonResponse<ProjectExpansionPlan>(model, promptForAI, schema);
};

export const streamSingleFileEdit = async (
    originalContent: string,
    instruction: string,
    filePath: string,
    onProgress: (checkpoints: EditCheckpoint[], currentContent: string) => void,
    model: string = "gemini-3-flash-preview"
): Promise<string> => {
    return bulkEditFileWithAI(originalContent, instruction, filePath, onProgress, model);
};

export const planRepositoryEdit = async (
    instruction: string,
    activeFilePath: string,
    allFiles: { path: string, content: string, sha: string }[],
    model: string = "gemini-3-flash-preview"
): Promise<RepositoryEditPlan> => {
    const fileContext = prepareFileContext(allFiles, activeFilePath);
    const promptForAI = `Task: "${instruction}". Current File: "${activeFilePath}". Context:\n${fileContext}\nPlan edits JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            reasoning: { type: Type.STRING },
            filesToEdit: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { path: { type: Type.STRING }, changes: { type: Type.STRING } } } }
        },
        required: ['reasoning', 'filesToEdit']
    };
    return getAiJsonResponse<RepositoryEditPlan>(model, promptForAI, schema);
};

export const streamRepositoryFileEdit = async (
    originalContent: string,
    changesInstruction: string,
    filePath: string,
    onProgress: (checkpoints: EditCheckpoint[], currentContent: string) => void,
    model: string = "gemini-3-flash-preview"
): Promise<string> => {
    return bulkEditFileWithAI(originalContent, changesInstruction, filePath, onProgress, model);
};

export const correctCodeFromBuildError = async (
    originalInstruction: string,
    allFiles: { path: string, content: string, sha: string }[],
    previousEdits: { path: string, newContent: string }[],
    buildLogs: string,
    model: string = "gemini-3-flash-preview",
): Promise<RepositoryEditPlan> => {
    const fileContext = prepareFileContext(allFiles);
    const promptForAI = `Build Error: ${buildLogs}. Context:\n${fileContext}\nFix plan JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            reasoning: { type: Type.STRING },
            filesToEdit: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { path: { type: Type.STRING }, changes: { type: Type.STRING } } } }
        },
        required: ['reasoning', 'filesToEdit']
    };
    return getAiJsonResponse<RepositoryEditPlan>(model, promptForAI, schema);
};
