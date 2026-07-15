/** Inline HTML shell that boots Pyodide inside the WebView. */
export const PYODIDE_VERSION = '0.27.5';

export function buildPyodideHtml(indexURL: string): string {
  const safeIndex = JSON.stringify(indexURL);
  const scriptSrc = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;

  return `<!DOCTYPE html>
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
  <div id="status">Loading Python runtime…</div>
  <script src="${scriptSrc}"></script>
  <script>
    const INDEX_URL = ${safeIndex};
    const statusEl = document.getElementById('status');
    const pendingInputs = new Map();
    let pyodide = null;
    let running = false;
    let interrupted = false;
    let runTimer = null;
    let stdoutBuf = [];
    let stderrBuf = [];
    let flushTimer = null;

    function send(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function flushStreams() {
      flushTimer = null;
      if (stdoutBuf.length) {
        send({ type: 'stdout', data: stdoutBuf.join('') });
        stdoutBuf = [];
      }
      if (stderrBuf.length) {
        send({ type: 'stderr', data: stderrBuf.join('') });
        stderrBuf = [];
      }
    }

    function queueStdout(text) {
      stdoutBuf.push(String(text));
      if (!flushTimer) flushTimer = setTimeout(flushStreams, 32);
    }
    function queueStderr(text) {
      stderrBuf.push(String(text));
      if (!flushTimer) flushTimer = setTimeout(flushStreams, 32);
    }

    function setStatus(message) {
      statusEl.textContent = message;
      send({ type: 'status', message: String(message) });
    }

    function uuid() {
      return 'in_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    globalThis.__rn_input = function (prompt) {
      const id = uuid();
      return new Promise(function (resolve, reject) {
        pendingInputs.set(id, { resolve: resolve, reject: reject });
        send({ type: 'input_request', prompt: String(prompt || ''), id: id });
      });
    };

    async function boot() {
      try {
        setStatus('Loading Pyodide from CDN…');
        // Always boot from CDN for WebView reliability. Offline file:// + wasm is flaky on Android.
        const cdn = 'https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/';
        pyodide = await loadPyodide({
          indexURL: cdn,
          fullStdLib: true,
        });

        pyodide.setStdout({
          batched: function (text) { if (text) queueStdout(text); },
        });
        pyodide.setStderr({
          batched: function (text) { if (text) queueStderr(text); },
        });

        await pyodide.loadPackage(['micropip']);
        setStatus('Python ready');
        send({
          type: 'ready',
          engine: 'python',
          version: pyodide.version || '${PYODIDE_VERSION}',
          pyodideVersion: pyodide.version || '${PYODIDE_VERSION}',
          offline: false,
        });
      } catch (err) {
        send({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    }

    async function installPackages(packages) {
      if (!pyodide) throw new Error('Python runtime not ready');
      const micropip = pyodide.pyimport('micropip');
      for (let i = 0; i < packages.length; i++) {
        const name = packages[i];
        setStatus('Installing ' + name + '…');
        await micropip.install(name);
      }
      send({ type: 'packages', packages: packages.slice() });
      setStatus('Ready');
    }

    async function runCode(code, autoInstall, timeoutMs) {
      if (!pyodide) throw new Error('Python runtime not ready');
      if (running) throw new Error('A program is already running');
      running = true;
      interrupted = false;
      const started = Date.now();
      const limit = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 30000;
      try {
        if (autoInstall) {
          setStatus('Resolving imports…');
          await pyodide.loadPackagesFromImports(code);
        }
        setStatus('Running…');
        const work = pyodide.runPythonAsync(code);
        const timeout = new Promise(function (_, reject) {
          runTimer = setTimeout(function () {
            interrupted = true;
            reject(new Error('Timed out after ' + limit + ' ms (possible infinite loop)'));
          }, limit);
        });
        await Promise.race([work, timeout]);
        flushStreams();
        send({ type: 'done', ok: !interrupted, durationMs: Date.now() - started });
      } catch (err) {
        flushStreams();
        const message = String(err && err.message ? err.message : err);
        if (!interrupted || message.indexOf('Timed out') >= 0) {
          queueStderr(message + '\\n');
          flushStreams();
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
        send({ type: 'status', message: pyodide ? 'Ready' : 'Booting' });
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

      if (msg.type === 'install') {
        installPackages(msg.packages || []).catch(function (err) {
          send({ type: 'error', message: String(err && err.message ? err.message : err) });
        });
        return;
      }

      if (msg.type === 'run') {
        runCode(msg.code || '', !!msg.autoInstall, msg.timeoutMs).catch(function (err) {
          send({ type: 'error', message: String(err && err.message ? err.message : err) });
          running = false;
        });
      }
    }

    document.addEventListener('message', function (event) {
      handleMessage(event.data);
    });
    window.addEventListener('message', function (event) {
      handleMessage(event.data);
    });
    window.__coderunner_handle = handleMessage;

    boot();
  </script>
</body>
</html>`;
}

export function cdnPyodideIndexUrl(): string {
  return `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
}

/** @deprecated Prefer buildPyodideHtml(cdnUrl) */
export const PYODIDE_HTML = buildPyodideHtml(cdnPyodideIndexUrl());
