import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDatabase, closeDatabase, getDatabase } from '../database.js';
import { projectsRepository } from './projects.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

const TEST_DB_PATH = path.join(os.tmpdir(), 'umf-tts-test.sqlite');

describe('projectsRepository', () => {
  beforeAll(() => {
    initDatabase(TEST_DB_PATH);
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clean up projects table
    const db = getDatabase();
    db.exec('DELETE FROM project_lines');
    db.exec('DELETE FROM projects');
  });

  describe('create', () => {
    it('should create a new project', () => {
      const project = projectsRepository.create({
        name: 'Test Project',
        rawText: 'Hello world\nLine two',
        inputType: 'text',
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.rawText).toBe('Hello world\nLine two');
      expect(project.inputType).toBe('text');
      expect(project.status).toBe('draft');
    });
  });

  describe('list', () => {
    it('should return all projects', () => {
      projectsRepository.create({ name: 'Project 1', rawText: 'Text 1' });
      projectsRepository.create({ name: 'Project 2', rawText: 'Text 2' });

      const projects = projectsRepository.list();

      expect(projects).toHaveLength(2);
    });

    it('should return projects sorted by creation date desc', () => {
      const p1 = projectsRepository.create({ name: 'First', rawText: 'Text' });
      const p2 = projectsRepository.create({ name: 'Second', rawText: 'Text' });

      const projects = projectsRepository.list();

      // Most recent first
      expect(projects[0]?.id).toBe(p2.id);
      expect(projects[1]?.id).toBe(p1.id);
    });
  });

  describe('getById', () => {
    it('should return project by id', () => {
      const created = projectsRepository.create({ name: 'Test', rawText: 'Text' });
      const found = projectsRepository.getById(created.id);

      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test');
    });

    it('should return null for non-existent id', () => {
      const found = projectsRepository.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update project fields', () => {
      const project = projectsRepository.create({ name: 'Original', rawText: 'Text' });
      const updated = projectsRepository.update({ id: project.id, name: 'Updated' });

      expect(updated?.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete project and return true', () => {
      const project = projectsRepository.create({ name: 'To Delete', rawText: 'Text' });
      const result = projectsRepository.delete(project.id);

      expect(result).toBe(true);
      expect(projectsRepository.getById(project.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      const result = projectsRepository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('project lines', () => {
    it('should create and retrieve lines', () => {
      const project = projectsRepository.create({ name: 'Test', rawText: 'Text' });

      const line = projectsRepository.createLine({
        projectId: project.id,
        lineNo: 1,
        text: 'Hello world',
        presetId: null,
        status: 'pending',
      });

      expect(line.id).toBeDefined();
      expect(line.text).toBe('Hello world');

      const lines = projectsRepository.getLines(project.id);
      expect(lines).toHaveLength(1);
    });

    it('should update line status', () => {
      const project = projectsRepository.create({ name: 'Test', rawText: 'Text' });
      const line = projectsRepository.createLine({
        projectId: project.id,
        lineNo: 1,
        text: 'Test',
        presetId: null,
      });

      projectsRepository.updateLine(line.id, { status: 'done', clipPath: '/path/to/clip.mp3' });

      const updated = projectsRepository.getLine(line.id);
      expect(updated?.status).toBe('done');
      expect(updated?.clipPath).toBe('/path/to/clip.mp3');
    });

    it('should maintain line order', () => {
      const project = projectsRepository.create({ name: 'Test', rawText: 'Text' });

      projectsRepository.createLines([
        { projectId: project.id, lineNo: 3, text: 'Third', presetId: null },
        { projectId: project.id, lineNo: 1, text: 'First', presetId: null },
        { projectId: project.id, lineNo: 2, text: 'Second', presetId: null },
      ]);

      const lines = projectsRepository.getLines(project.id);

      expect(lines.map((l) => l.lineNo)).toEqual([1, 2, 3]);
      expect(lines.map((l) => l.text)).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('getProjectStats', () => {
    it('should return correct stats', () => {
      const project = projectsRepository.create({ name: 'Test', rawText: 'Text' });

      projectsRepository.createLines([
        { projectId: project.id, lineNo: 1, text: 'Done 1', presetId: null, status: 'done' },
        { projectId: project.id, lineNo: 2, text: 'Done 2', presetId: null, status: 'done' },
        { projectId: project.id, lineNo: 3, text: 'Failed', presetId: null, status: 'failed' },
        { projectId: project.id, lineNo: 4, text: 'Pending', presetId: null, status: 'pending' },
      ]);

      const stats = projectsRepository.getProjectStats(project.id);

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.processing).toBe(0);
    });
  });
});
