import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WebView } from 'react-native-webview';

import { postEngineMessage } from './postEngineMessage';
import { parseErrorLine } from './pythonPackages';
import {
  EngineToHostSchema,
  type ConsoleLine,
  type HostToEngineMessage,
  type RunnerStatus,
} from './protocol';
import { transformJsInputCalls, wrapJsUserCode } from './transformJsInput';

let lineCounter = 0;
function nextLineId(): string {
  lineCounter += 1;
  return `js_line_${lineCounter}`;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function useJsRunner(enabled: boolean) {
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState<RunnerStatus>(enabled ? 'booting' : 'idle');
  const [statusMessage, setStatusMessage] = useState(
    enabled ? 'Starting JavaScript runtime…' : 'JavaScript idle',
  );
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [pendingInput, setPendingInput] = useState<{ id: string; prompt: string } | null>(null);
  const [lastErrorLine, setLastErrorLine] = useState<number | null>(null);
  const [lastStdout, setLastStdout] = useState('');
  const stdoutAcc = useRef('');

  useEffect(() => {
    if (enabled && !ready) {
      setStatus('booting');
      setStatusMessage('Starting JavaScript runtime…');
    } else if (!enabled) {
      setStatusMessage('JavaScript idle');
    }
  }, [enabled, ready]);

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
        case 'ready':
          setReady(true);
          setStatus('ready');
          setStatusMessage('JavaScript ready (sandboxed)');
          appendLine(
            'system',
            'JavaScript ready. prompt()/input() supported. fetch/XHR disabled.',
          );
          break;
        case 'status':
          setStatusMessage(msg.message);
          break;
        case 'stdout':
          stdoutAcc.current += msg.data;
          appendLine('stdout', msg.data);
          break;
        case 'stderr': {
          appendLine('stderr', msg.data);
          const line = parseErrorLine(msg.data);
          if (line) setLastErrorLine(line);
          break;
        }
        case 'error_detail': {
          appendLine('stderr', msg.message);
          const line = msg.line ?? parseErrorLine(msg.message);
          if (line) setLastErrorLine(line);
          break;
        }
        case 'input_request':
          setStatus('awaiting_input');
          setPendingInput({ id: msg.id, prompt: msg.prompt });
          appendLine('prompt', msg.prompt || 'prompt> ');
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
        default:
          break;
      }
    },
    [appendLine],
  );

  const runCode = useCallback(
    (code: string, timeoutMs = DEFAULT_TIMEOUT_MS) => {
      if (!enabled || !ready) {
        appendLine('system', 'JavaScript runtime is not ready…');
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
      postToEngine({ type: 'run', code: wrapped, autoInstall: false, timeoutMs });
    },
    [appendLine, clearConsole, enabled, postToEngine, ready, status],
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
    setStatus(ready ? 'ready' : 'booting');
    setStatusMessage('Interrupted');
    appendLine('system', 'Interrupted');
  }, [appendLine, postToEngine, ready]);

  const consoleText = useMemo(() => lines.map((l) => l.text).join(''), [lines]);

  return {
    webViewRef,
    status,
    statusMessage,
    ready,
    lines,
    consoleText,
    lastStdout,
    lastErrorLine,
    pendingInput,
    onEngineMessage,
    runCode,
    submitStdin,
    interrupt,
    clearConsole,
  };
}
