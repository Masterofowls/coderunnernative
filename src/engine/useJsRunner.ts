import { useCallback, useMemo, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';

import { EngineToHostSchema, type ConsoleLine, type HostToEngineMessage, type RunnerStatus } from './protocol';
import { transformJsInputCalls, wrapJsUserCode } from './transformJsInput';

let lineCounter = 0;
function nextLineId(): string {
  lineCounter += 1;
  return `js_line_${lineCounter}`;
}

export function useJsRunner() {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState<RunnerStatus>('booting');
  const [statusMessage, setStatusMessage] = useState('Starting JavaScript runtime…');
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [pendingInput, setPendingInput] = useState<{ id: string; prompt: string } | null>(null);

  const appendLine = useCallback((kind: ConsoleLine['kind'], text: string) => {
    setLines((prev) => [...prev, { id: nextLineId(), kind, text }]);
  }, []);

  const clearConsole = useCallback(() => {
    setLines([]);
  }, []);

  const postToEngine = useCallback((message: HostToEngineMessage) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
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
          setReady(true);
          setStatus('ready');
          setStatusMessage('JavaScript ready');
          appendLine('system', 'JavaScript runtime ready. Use prompt()/input() for console input.');
          break;
        case 'status':
          setStatusMessage(msg.message);
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
          appendLine('prompt', msg.prompt || 'prompt> ');
          break;
        case 'done':
          setPendingInput(null);
          setStatus('ready');
          setStatusMessage(
            msg.ok ? `Finished in ${msg.durationMs} ms` : `Stopped with errors (${msg.durationMs} ms)`,
          );
          appendLine(
            'system',
            msg.ok ? `Done (${msg.durationMs} ms)` : `Finished with errors (${msg.durationMs} ms)`,
          );
          break;
        case 'error':
          setStatus('error');
          setStatusMessage(msg.message);
          appendLine('stderr', msg.message);
          break;
        default:
          break;
      }
    },
    [appendLine],
  );

  const runCode = useCallback(
    (code: string) => {
      if (!ready || status === 'booting') {
        appendLine('system', 'Runtime is still booting…');
        return;
      }
      if (status === 'running' || status === 'awaiting_input') {
        appendLine('system', 'Stop the current run before starting another.');
        return;
      }

      clearConsole();
      appendLine('system', '>>> run javascript');
      setStatus('running');
      setStatusMessage('Running…');

      const transformed = transformJsInputCalls(code);
      const wrapped = wrapJsUserCode(transformed);
      postToEngine({ type: 'run', code: wrapped, autoInstall: false });
    },
    [appendLine, clearConsole, postToEngine, ready, status],
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
    ready,
    lines,
    consoleText,
    pendingInput,
    onEngineMessage,
    runCode,
    submitStdin,
    interrupt,
    clearConsole,
  };
}
