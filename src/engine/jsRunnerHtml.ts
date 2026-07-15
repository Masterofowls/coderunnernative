/** Hardened JS sandbox with console + prompt/input bridging + timeout. */
export const JS_RUNNER_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; background: #0b1016; color: #8b9bb4; font: 12px/1.4 monospace; }
    #status { padding: 8px; }
  </style>
</head>
<body>
  <div id="status">JavaScript ready</div>
  <script>
    const statusEl = document.getElementById('status');
    const pendingInputs = new Map();
    let running = false;
    let interrupted = false;
    let runTimer = null;
    let stdoutBuf = [];
    let flushTimer = null;

    // Soft sandbox: block network / navigation APIs (do not rebind eval — illegal in strict mode).
    try {
      window.fetch = function () {
        throw new Error('fetch() is disabled in the sandbox. Use console I/O instead.');
      };
    } catch (e) {}
    try {
      window.XMLHttpRequest = function () {
        throw new Error('XMLHttpRequest is disabled in the sandbox.');
      };
    } catch (e) {}
    try {
      window.open = function () { throw new Error('window.open is disabled.'); };
    } catch (e) {}

    function send(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function flushStdout() {
      flushTimer = null;
      if (stdoutBuf.length) {
        send({ type: 'stdout', data: stdoutBuf.join('') });
        stdoutBuf = [];
      }
    }

    function queueStdout(text) {
      stdoutBuf.push(String(text));
      if (!flushTimer) flushTimer = setTimeout(flushStdout, 32);
    }

    function setStatus(message) {
      statusEl.textContent = message;
      send({ type: 'status', message: String(message) });
    }

    function uuid() {
      return 'in_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function formatArgs(args) {
      return Array.prototype.slice.call(args).map(function (arg) {
        if (typeof arg === 'string') return arg;
        try { return JSON.stringify(arg); } catch (e) { return String(arg); }
      }).join(' ');
    }

    console.log = function () { queueStdout(formatArgs(arguments) + '\\n'); };
    console.info = console.log;
    console.warn = function () {
      send({ type: 'stderr', data: formatArgs(arguments) + '\\n' });
    };
    console.error = function () {
      send({ type: 'stderr', data: formatArgs(arguments) + '\\n' });
    };

    globalThis.__rn_input = function (promptText) {
      const id = uuid();
      return new Promise(function (resolve, reject) {
        pendingInputs.set(id, { resolve: resolve, reject: reject });
        send({ type: 'input_request', prompt: String(promptText || ''), id: id });
      });
    };

    async function runCode(code, timeoutMs) {
      if (running) throw new Error('A program is already running');
      running = true;
      interrupted = false;
      const started = Date.now();
      const limit = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 15000;
      try {
        setStatus('Running…');
        // Avoid "use strict" + eval/arguments bindings (SyntaxError in browsers).
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction(String(code || ''));
        const work = Promise.resolve(fn());
        const timeout = new Promise(function (_, reject) {
          runTimer = setTimeout(function () {
            interrupted = true;
            reject(new Error('Timed out after ' + limit + ' ms (possible infinite loop)'));
          }, limit);
        });
        await Promise.race([work, timeout]);
        flushStdout();
        send({ type: 'done', ok: !interrupted, durationMs: Date.now() - started });
      } catch (err) {
        flushStdout();
        const message = String(err && err.stack ? err.stack : err && err.message ? err.message : err);
        if (!interrupted || message.indexOf('Timed out') >= 0) {
          send({ type: 'stderr', data: message + '\\n' });
          send({ type: 'error_detail', message: message, line: null });
        }
        send({ type: 'done', ok: false, durationMs: Date.now() - started });
      } finally {
        if (runTimer) clearTimeout(runTimer);
        runTimer = null;
        running = false;
        setStatus('Ready');
      }
    }

    function handleMessage(raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        return;
      }
      if (!msg || !msg.type) return;

      if (msg.type === 'ping') {
        send({ type: 'status', message: 'Ready' });
        return;
      }

      if (msg.type === 'stdin') {
        const waiter = pendingInputs.get(msg.id);
        if (waiter) {
          pendingInputs.delete(msg.id);
          waiter.resolve(msg.value == null ? '' : String(msg.value));
        }
        return;
      }

      if (msg.type === 'interrupt') {
        interrupted = true;
        if (runTimer) clearTimeout(runTimer);
        pendingInputs.forEach(function (waiter) {
          waiter.reject(new Error('Interrupted'));
        });
        pendingInputs.clear();
        return;
      }

      if (msg.type === 'run') {
        runCode(msg.code || '', msg.timeoutMs).catch(function (err) {
          send({ type: 'error', message: String(err && err.message ? err.message : err) });
          running = false;
        });
      }
    }

    // RN WebView posts to document on Android, window on some hosts.
    document.addEventListener('message', function (event) {
      handleMessage(event.data);
    });
    window.addEventListener('message', function (event) {
      handleMessage(event.data);
    });
    // Also accept injected bridge calls.
    window.__coderunner_handle = handleMessage;

    setStatus('Ready');
    send({ type: 'ready', version: 'javascript', engine: 'javascript', pyodideVersion: 'javascript' });
  </script>
</body>
</html>`;
