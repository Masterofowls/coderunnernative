export type CodeLanguage = 'python' | 'javascript';

export function fileLabelFor(language: CodeLanguage): string {
  return language === 'python' ? 'editor.py' : 'editor.js';
}

export function storageKeyFor(language: CodeLanguage): string {
  return `coderunner.editor.code.${language}`;
}
