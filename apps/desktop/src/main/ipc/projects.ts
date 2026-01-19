import { ipcMain } from 'electron';
import { IPC_CHANNELS, ProjectCreateSchema, ProjectUpdateSchema, ParseInputSchema } from '@umf-tts/shared';
import { projectsRepository } from '@umf-tts/db';
import { parseContent, detectFileType } from '@umf-tts/core';
import { log } from '../logger.js';
import type { IpcResult, Project, ProjectWithLines, ProjectLine, ParseResult } from '@umf-tts/shared';

export function setupProjectsHandlers(): void {
  // List all projects
  ipcMain.handle(IPC_CHANNELS.PROJECTS_LIST, async (): Promise<IpcResult<Project[]>> => {
    try {
      const projects = projectsRepository.list();
      return { success: true, data: projects };
    } catch (error) {
      log.error('Failed to list projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects',
      };
    }
  });

  // Get project by ID
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_GET,
    async (_, id: string): Promise<IpcResult<ProjectWithLines | null>> => {
      try {
        const project = projectsRepository.getWithLines(id);
        return { success: true, data: project };
      } catch (error) {
        log.error('Failed to get project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get project',
        };
      }
    }
  );

  // Create project
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_CREATE,
    async (_, data: unknown): Promise<IpcResult<ProjectWithLines>> => {
      try {
        const parsed = ProjectCreateSchema.parse(data);

        // Auto-detect file type if not specified
        const inputType = parsed.inputType ?? detectFileType(parsed.rawText);

        // Create the project
        const project = projectsRepository.create({
          ...parsed,
          inputType,
        });

        // Parse the content and create lines
        const parseResult = parseContent(parsed.rawText, inputType);

        const lines = projectsRepository.createLines(
          parseResult.lines.map((line) => ({
            projectId: project.id,
            lineNo: line.lineNo,
            text: line.text,
            presetId: line.presetId,
            status: 'pending' as const,
          }))
        );

        // Update project stats
        projectsRepository.updateStatus(project.id, 'draft', {
          totalLines: lines.length,
          completedLines: 0,
          failedLines: 0,
        });

        const result = projectsRepository.getWithLines(project.id)!;
        return { success: true, data: result };
      } catch (error) {
        log.error('Failed to create project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create project',
        };
      }
    }
  );

  // Update project
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_UPDATE,
    async (_, data: unknown): Promise<IpcResult<Project | null>> => {
      try {
        const parsed = ProjectUpdateSchema.parse(data);
        const project = projectsRepository.update(parsed);
        return { success: true, data: project };
      } catch (error) {
        log.error('Failed to update project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update project',
        };
      }
    }
  );

  // Delete project
  ipcMain.handle(IPC_CHANNELS.PROJECTS_DELETE, async (_, id: string): Promise<IpcResult<boolean>> => {
    try {
      // Delete all lines first
      projectsRepository.deleteLines(id);
      const success = projectsRepository.delete(id);
      return { success: true, data: success };
    } catch (error) {
      log.error('Failed to delete project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete project',
      };
    }
  });

  // Get project lines
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_GET_LINES,
    async (_, projectId: string): Promise<IpcResult<ProjectLine[]>> => {
      try {
        const lines = projectsRepository.getLines(projectId);
        return { success: true, data: lines };
      } catch (error) {
        log.error('Failed to get project lines:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get project lines',
        };
      }
    }
  );

  // Update project line
  ipcMain.handle(
    IPC_CHANNELS.PROJECTS_UPDATE_LINE,
    async (
      _,
      { lineId, data }: { lineId: string; data: Partial<ProjectLine> }
    ): Promise<IpcResult<ProjectLine | null>> => {
      try {
        const line = projectsRepository.updateLine(lineId, data);
        return { success: true, data: line };
      } catch (error) {
        log.error('Failed to update project line:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update project line',
        };
      }
    }
  );

  // Parse content
  ipcMain.handle(
    IPC_CHANNELS.PARSER_PARSE,
    async (_, data: unknown): Promise<IpcResult<ParseResult>> => {
      try {
        const parsed = ParseInputSchema.parse(data);
        const result = parseContent(parsed.content, parsed.type);
        return { success: true, data: result };
      } catch (error) {
        log.error('Failed to parse content:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to parse content',
        };
      }
    }
  );
}
