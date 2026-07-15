import type { CodeLanguage } from './language';

export interface CodeProject {
  id: string;
  name: string;
  language: CodeLanguage;
  code: string;
  updatedAt: string;
  createdAt: string;
}

export interface ProjectStore {
  projects: CodeProject[];
  activeId: string | null;
}

const STORE_KEY = 'coderunner.projects.v1';

export async function loadProjectStore(
  getItem: (key: string) => Promise<string | null>,
): Promise<ProjectStore> {
  const raw = await getItem(STORE_KEY);
  if (!raw) return { projects: [], activeId: null };
  try {
    const parsed = JSON.parse(raw) as ProjectStore;
    if (!Array.isArray(parsed.projects)) return { projects: [], activeId: null };
    return parsed;
  } catch {
    return { projects: [], activeId: null };
  }
}

export async function saveProjectStore(
  store: ProjectStore,
  setItem: (key: string, value: string) => Promise<void>,
): Promise<void> {
  await setItem(STORE_KEY, JSON.stringify(store));
}

export function createProject(
  name: string,
  language: CodeLanguage,
  code: string,
): CodeProject {
  const now = new Date().toISOString();
  return {
    id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Untitled',
    language,
    code,
    createdAt: now,
    updatedAt: now,
  };
}
