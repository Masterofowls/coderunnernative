import { describe, expect, it } from 'vitest';

import { checkLessonOutput, normalizeOutput, type Lesson } from '../../src/engine/lessons';
import { hintForImportError, parseErrorLine } from '../../src/engine/pythonPackages';
import { createProject } from '../../src/engine/projects';

describe('parseErrorLine', () => {
  it('parses python exec line', () => {
    expect(parseErrorLine('File "<exec>", line 12, in <module>')).toBe(12);
  });

  it('parses js style', () => {
    expect(parseErrorLine('Error\n    at <anonymous>:8:3')).toBe(8);
  });
});

describe('hintForImportError', () => {
  it('hints for cv2', () => {
    expect(hintForImportError("No module named 'cv2'")).toMatch(/OpenCV/i);
  });
});

describe('lessons', () => {
  it('normalizes and checks output', () => {
    const lesson: Lesson = {
      id: 't',
      language: 'python',
      title: 't',
      prompt: 'p',
      starter: '',
      expectedOutput: '1\n2',
      hint: 'h',
    };
    expect(normalizeOutput('1\r\n2\n')).toBe('1\n2');
    expect(checkLessonOutput(lesson, '1\n2').pass).toBe(true);
    expect(checkLessonOutput(lesson, 'nope').pass).toBe(false);
  });
});

describe('projects', () => {
  it('creates project records', () => {
    const p = createProject('Demo', 'javascript', 'console.log(1)');
    expect(p.name).toBe('Demo');
    expect(p.language).toBe('javascript');
    expect(p.id).toMatch(/^proj_/);
  });
});
