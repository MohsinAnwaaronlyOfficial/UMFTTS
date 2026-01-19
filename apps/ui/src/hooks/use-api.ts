import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AppSettings,
  VoicePreset,
  Project,
  ProjectWithLines,
  ElevenLabsVoice,
  ElevenLabsModel,
  IpcResult,
  LibraryClip,
  LibraryExport,
} from '@umf-tts/shared';

// Helper to unwrap IPC results
function unwrapResult<T>(result: IpcResult<T>): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

// Settings hooks
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const result = await window.electronAPI.getSettings();
      return unwrapResult(result);
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AppSettings>) => {
      const result = await window.electronAPI.updateSettings(data);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useTestApiKey() {
  return useMutation({
    mutationFn: async (apiKey: string) => {
      const result = await window.electronAPI.testApiKey(apiKey);
      return unwrapResult(result);
    },
  });
}

// Presets hooks
export function usePresets() {
  return useQuery({
    queryKey: ['presets'],
    queryFn: async () => {
      const result = await window.electronAPI.listPresets();
      return unwrapResult(result);
    },
  });
}

export function useCreatePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<VoicePreset, 'id' | 'createdAt' | 'updatedAt'>) => {
      const result = await window.electronAPI.createPreset(data);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
  });
}

export function useUpdatePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<VoicePreset> & { id: number }) => {
      const result = await window.electronAPI.updatePreset(data);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
  });
}

export function useDeletePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await window.electronAPI.deletePreset(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] });
    },
  });
}

// Projects hooks
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const result = await window.electronAPI.listProjects();
      return unwrapResult(result);
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) return null;
      const result = await window.electronAPI.getProject(id);
      return unwrapResult(result);
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; rawText: string; inputType?: 'text' | 'srt' }) => {
      const result = await window.electronAPI.createProject(data);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.electronAPI.deleteProject(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ElevenLabs hooks
export function useVoices() {
  return useQuery({
    queryKey: ['voices'],
    queryFn: async () => {
      const result = await window.electronAPI.listVoices();
      return unwrapResult(result);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const result = await window.electronAPI.listModels();
      return unwrapResult(result);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useCloneVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; filePaths: string[]; description?: string }) => {
      const result = await window.electronAPI.cloneVoice(data);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}

export function useDeleteVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (voiceId: string) => {
      const result = await window.electronAPI.deleteVoice(voiceId);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voices'] });
    },
  });
}

// Batch processing hooks
export function useStartBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { projectId: string; concurrency: number }) => {
      const result = await window.electronAPI.startBatch(data);
      return unwrapResult(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

export function useCancelBatch() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await window.electronAPI.cancelBatch(projectId);
      return unwrapResult(result);
    },
  });
}

export function useRetryFailedBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await window.electronAPI.retryFailedBatch(projectId);
      return unwrapResult(result);
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// Audio hooks
export function useMergeAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { projectId: string; delayMs: number; outputFormat: 'mp3' | 'wav' | 'ogg' }) => {
      const result = await window.electronAPI.mergeAudio(data);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
  });
}

// Library hooks
export function useLibraryClips() {
  return useQuery({
    queryKey: ['library', 'clips'],
    queryFn: async () => {
      const result = await window.electronAPI.listClips();
      return unwrapResult(result);
    },
  });
}

export function useLibraryExports() {
  return useQuery({
    queryKey: ['library', 'exports'],
    queryFn: async () => {
      const result = await window.electronAPI.listExports();
      return unwrapResult(result);
    },
  });
}

export function useDeleteClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clipId: string) => {
      const result = await window.electronAPI.deleteClip(clipId);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'clips'] });
    },
  });
}

export function useDeleteExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exportId: string) => {
      const result = await window.electronAPI.deleteExport(exportId);
      return unwrapResult(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', 'exports'] });
    },
  });
}

// File operations
export async function selectFile(options?: {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}): Promise<string[]> {
  const result = await window.electronAPI.selectFile(options ?? {});
  return unwrapResult(result);
}

export async function readFile(filePath: string): Promise<string> {
  const result = await window.electronAPI.readFile(filePath);
  return unwrapResult(result);
}

export async function openFolder(filePath: string): Promise<void> {
  await window.electronAPI.openFolder(filePath);
}
