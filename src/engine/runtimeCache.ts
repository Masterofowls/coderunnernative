import * as FileSystem from 'expo-file-system/legacy';

import { PYODIDE_VERSION } from './pyodideHtml';

const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;

/** Core files required to boot Pyodide offline after first successful download. */
export const PYODIDE_CORE_FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'package.json',
] as const;

export interface RuntimeCacheProgress {
  phase: 'checking' | 'downloading' | 'ready' | 'error' | 'cdn_fallback';
  file?: string;
  current: number;
  total: number;
  message: string;
  localIndexUrl: string | null;
}

function cacheRoot(): string {
  return `${FileSystem.documentDirectory}runtime/pyodide/${PYODIDE_VERSION}/`;
}

export async function getLocalPyodideIndexUrl(): Promise<string | null> {
  const root = cacheRoot();
  const marker = `${root}.complete`;
  const info = await FileSystem.getInfoAsync(marker);
  if (!info.exists) return null;
  return root;
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Ensures Pyodide core files are cached under documentDirectory.
 * Returns a local file:// index URL when complete, otherwise null (caller may use CDN).
 */
export async function ensurePyodideCached(
  onProgress?: (p: RuntimeCacheProgress) => void,
): Promise<string | null> {
  const root = cacheRoot();
  const total = PYODIDE_CORE_FILES.length;

  const report = (partial: Omit<RuntimeCacheProgress, 'localIndexUrl'> & { localIndexUrl?: string | null }) => {
    onProgress?.({
      localIndexUrl: partial.localIndexUrl ?? null,
      ...partial,
    });
  };

  report({ phase: 'checking', current: 0, total, message: 'Checking offline Python cache…' });

  const existing = await getLocalPyodideIndexUrl();
  if (existing) {
    report({
      phase: 'ready',
      current: total,
      total,
      message: 'Offline Python runtime ready',
      localIndexUrl: existing,
    });
    return existing;
  }

  try {
    await ensureDir(root);
    let current = 0;
    for (const file of PYODIDE_CORE_FILES) {
      current += 1;
      const dest = `${root}${file}`;
      const destInfo = await FileSystem.getInfoAsync(dest);
      if (destInfo.exists && (destInfo.size ?? 0) > 0) {
        report({
          phase: 'downloading',
          file,
          current,
          total,
          message: `Cached ${file} (${current}/${total})`,
        });
        continue;
      }

      report({
        phase: 'downloading',
        file,
        current,
        total,
        message: `Downloading ${file} (${current}/${total})…`,
      });

      const result = await FileSystem.downloadAsync(`${CDN_BASE}/${file}`, dest);
      if (result.status !== 200) {
        throw new Error(`Failed to download ${file} (HTTP ${result.status})`);
      }
    }

    await FileSystem.writeAsStringAsync(`${root}.complete`, new Date().toISOString());
    report({
      phase: 'ready',
      current: total,
      total,
      message: 'Offline Python runtime ready',
      localIndexUrl: root,
    });
    return root;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    report({
      phase: 'cdn_fallback',
      current: 0,
      total,
      message: `Offline cache failed (${message}). Using CDN.`,
      localIndexUrl: null,
    });
    return null;
  }
}

export { cdnPyodideIndexUrl } from './pyodideHtml';
