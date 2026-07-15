import { useCallback, useMemo, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';

import { postEngineMessage } from './postEngineMessage';
import { hintForImportError, parseErrorLine } from './pythonPackages';
import {
  EngineToHostSchema,
  type ConsoleLine,
  type HostToEngineMessage,
  type RunnerStatus,
} from './protocol';
import { prepareUserPython } from './transformInput';

let lineCounter = 0;
function nextLineId(): string {
  lineCounter += 1;
  return `line_${lineCounter}`;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export function usePythonRunner(_enabled: boolean) {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState<RunnerStatus>('booting');
  const [statusMessage, setStatusMessage] = useState('Starting Python runtime…');
  const [pyodideVersion, setPyodideVersion] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [pendingInput, setPendingInput] = useState<{ id: string; prompt: string } | null>(null);
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [autoInstall, setAutoInstall] = useState(true);
  const [lastErrorLine, setLastErrorLine] = useState<number | null>(null);
  const [lastStdout, setLastStdout] = useState('');
  const stdoutAcc = useRef('');

  const appendLine = useCallback((kind: ConsoleLine['kind'], text: string) => {
    setLines((prev) => [...prev, { id: nextLineId(), kind, text }]);
  }, []);

  const clearConsole = useCallback(() => {
    setLines([]);
    setLastStdout('');
    stdoutAcc.current = '';
    setLastErrorLine(null);
  }, []);

  const postToEngine = useCallback((message: HostToEngineMessage) => {
    postEngineMessage(webViewRef.current, message);
  }, []);

  const onEngineMessage = useCallback(
    (raw: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      const result = EngineToHostSchema.safeParse(parsed);
      if (!result.success) return;
      const msg = result.data;

      switch (msg.type) {
        case 'ready': {
          const version = msg.pyodideVersion || msg.version || 'unknown';
          setStatus('ready');
          setPyodideVersion(version);
          setOffline(Boolean(msg.offline));
          setStatusMessage(
            msg.offline ? `Python ${version} ready (offline)` : `Python ${version} ready`,
          );
          appendLine(
            'system',
            `Pyodide ${version} ready${msg.offline ? ' from offline cache' : ''}.`,
          );
          break;
        }
        case 'status':
          setStatusMessage(msg.message);
          if (msg.message.toLowerCase().includes('install')) {
            setStatus((prev) => (prev === 'running' ? prev : 'installing'));
          }
          break;
        case 'stdout':
          stdoutAcc.current += msg.data;
          appendLine('stdout', msg.data);
          break;
        case 'stderr': {
          appendLine('stderr', msg.data);
          const hint = hintForImportError(msg.data);
          if (hint) appendLine('system', `Hint: ${hint}`);
          const line = parseErrorLine(msg.data);
          if (line) setLastErrorLine(line);
          break;
        }
        case 'error_detail': {
          appendLine('stderr', msg.message);
          const hint = hintForImportError(msg.message);
          if (hint) appendLine('system', `Hint: ${hint}`);
          const line = msg.line ?? parseErrorLine(msg.message);
          if (line) setLastErrorLine(line);
          break;
        }
        case 'input_request':
          setStatus('awaiting_input');
          setPendingInput({ id: msg.id, prompt: msg.prompt });
          appendLine('prompt', msg.prompt || 'input> ');
          break;
        case 'done':
          setPendingInput(null);
          setLastStdout(stdoutAcc.current);
          setStatus('ready');
          setStatusMessage(
            msg.ok
              ? `Finished in ${msg.durationMs} ms`
              : `Stopped with errors (${msg.durationMs} ms)`,
          );
          appendLine(
            'system',
            msg.ok
              ? `Done (${msg.durationMs} ms)`
              : `Finished with errors (${msg.durationMs} ms)`,
          );
          break;
        case 'error':
          setStatus('error');
          setStatusMessage(msg.message);
          appendLine('stderr', msg.message);
          {
            const line = parseErrorLine(msg.message);
            if (line) setLastErrorLine(line);
          }
          break;
        case 'packages':
          setInstalledPackages((prev) => Array.from(new Set([...prev, ...msg.packages])));
          setStatus('ready');
          appendLine('system', `Installed: ${msg.packages.join(', ') || '(none)'}`);
          break;
        default:
          break;
      }
    },
    [appendLine],
  );

  const runCode = useCallback(
    (code: string, timeoutMs = DEFAULT_TIMEOUT_MS) => {
      if (!pyodideVersion || status === 'booting') {
        appendLine('system', 'Python runtime is not ready…');
        return;
      }
      if (status === 'running' || status === 'awaiting_input' || status === 'installing') {
        appendLine('system', 'Stop the current run before starting another.');
        return;
      }

      clearConsole();
      appendLine('system', '>>> run python');
      setStatus('running');
      setStatusMessage('Running…');
      stdoutAcc.current = '';

      const wrapped = prepareUserPython(code);
      postToEngine({ type: 'run', code: wrapped, autoInstall, timeoutMs });
    },
    [appendLine, autoInstall, clearConsole, postToEngine, pyodideVersion, status],
  );

  const submitStdin = useCallback(
    (value: string) => {
      if (!pendingInput) return;
      appendLine('stdin', value);
      postToEngine({ type: 'stdin', id: pendingInput.id, value });
      setPendingInput(null);
      setStatus('running');
      setStatusMessage('Running…');
    },
    [appendLine, pendingInput, postToEngine],
  );

  const installPackages = useCallback(
    (packages: string[]) => {
      const cleaned = packages.map((p) => p.trim()).filter(Boolean);
      if (!cleaned.length) return;
      setStatus('installing');
      setStatusMessage(`Installing ${cleaned.join(', ')}…`);
      appendLine('system', `Installing: ${cleaned.join(', ')}`);
      postToEngine({ type: 'install', packages: cleaned });
    },
    [appendLine, postToEngine],
  );

  const interrupt = useCallback(() => {
    postToEngine({ type: 'interrupt' });
    setPendingInput(null);
    setStatus(pyodideVersion ? 'ready' : 'booting');
    setStatusMessage('Interrupted');
    appendLine('system', 'Interrupted');
  }, [appendLine, postToEngine, pyodideVersion]);

  const consoleText = useMemo(() => lines.map((l) => l.text).join(''), [lines]);

  return {
    webViewRef,
    status,
    statusMessage,
    pyodideVersion,
    offline,
    lines,
    consoleText,
    lastStdout,
    lastErrorLine,
    pendingInput,
    installedPackages,
    autoInstall,
    setAutoInstall,
    onEngineMessage,
    runCode,
    submitStdin,
    installPackages,
    interrupt,
    clearConsole,
  };
}
