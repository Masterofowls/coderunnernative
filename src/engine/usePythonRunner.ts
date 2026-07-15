import { useCallback, useMemo, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';

import { EngineToHostSchema, type ConsoleLine, type HostToEngineMessage, type RunnerStatus } from './protocol';
import { transformInputCalls, wrapUserCode } from './transformInput';

let lineCounter = 0;
function nextLineId(): string {
  lineCounter += 1;
  return `line_${lineCounter}`;
}

export function usePythonRunner() {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState<RunnerStatus>('booting');
  const [statusMessage, setStatusMessage] = useState('Starting Python runtime…');
  const [pyodideVersion, setPyodideVersion] = useState<string | null>(null);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [pendingInput, setPendingInput] = useState<{ id: string; prompt: string } | null>(null);
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [autoInstall, setAutoInstall] = useState(true);

  const appendLine = useCallback((kind: ConsoleLine['kind'], text: string) => {
    setLines((prev) => [...prev, { id: nextLineId(), kind, text }]);
  }, []);

  const clearConsole = useCallback(() => {
    setLines([]);
  }, []);

  const postToEngine = useCallback((message: HostToEngineMessage) => {
    const payload = JSON.stringify(message);
    webViewRef.current?.postMessage(payload);
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
        case 'ready':
          setStatus('ready');
          setPyodideVersion(msg.pyodideVersion);
          setStatusMessage(`Python ${msg.pyodideVersion} ready`);
          appendLine('system', `Pyodide ${msg.pyodideVersion} ready. Libraries via micropip / loadPackagesFromImports.`);
          break;
        case 'status':
          setStatusMessage(msg.message);
          if (msg.message.toLowerCase().includes('install')) {
            setStatus((prev) => (prev === 'running' ? prev : 'installing'));
          }
          break;
        case 'stdout':
          appendLine('stdout', msg.data);
          break;
        case 'stderr':
          appendLine('stderr', msg.data);
          break;
        case 'input_request':
          setStatus('awaiting_input');
          setPendingInput({ id: msg.id, prompt: msg.prompt });
          appendLine('prompt', msg.prompt || 'input> ');
          break;
        case 'done':
          setPendingInput(null);
          setStatus('ready');
          setStatusMessage(
            msg.ok ? `Finished in ${msg.durationMs} ms` : `Stopped with errors (${msg.durationMs} ms)`,
          );
          appendLine('system', msg.ok ? `Done (${msg.durationMs} ms)` : `Finished with errors (${msg.durationMs} ms)`);
          break;
        case 'error':
          setStatus('error');
          setStatusMessage(msg.message);
          appendLine('stderr', msg.message);
          break;
        case 'packages':
          setInstalledPackages(msg.packages);
          setStatus('ready');
          appendLine('system', `Installed packages: ${msg.packages.join(', ') || '(none listed)'}`);
          break;
        default:
          break;
      }
    },
    [appendLine],
  );

  const runCode = useCallback(
    (code: string) => {
      if (status === 'booting') {
        appendLine('system', 'Runtime is still booting…');
        return;
      }
      if (status === 'running' || status === 'awaiting_input') {
        appendLine('system', 'Stop the current run before starting another.');
        return;
      }

      clearConsole();
      appendLine('system', '>>> run');
      setStatus('running');
      setStatusMessage('Running…');

      const transformed = transformInputCalls(code);
      const wrapped = wrapUserCode(transformed);
      postToEngine({ type: 'run', code: wrapped, autoInstall });
    },
    [appendLine, autoInstall, clearConsole, postToEngine, status],
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
    setStatus('ready');
    setStatusMessage('Interrupted');
    appendLine('system', 'Interrupted');
  }, [appendLine, postToEngine]);

  const consoleText = useMemo(() => lines.map((l) => l.text).join(''), [lines]);

  return {
    webViewRef,
    status,
    statusMessage,
    pyodideVersion,
    lines,
    consoleText,
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
