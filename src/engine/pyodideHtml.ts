/** Inline HTML shell that boots Pyodide inside the WebView. */
export const PYODIDE_VERSION = '0.27.5';

export const PYODIDE_HTML = `<!DOCTYPE html>
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
  <script src="https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js"></script>
  <script>
    const statusEl = document.getElementById('status');
    const pendingInputs = new Map();
    let pyodide = null;
    let running = false;
    let interrupted = false;

    function send(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
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
        setStatus('Downloading Pyodide ' + '${PYODIDE_VERSION}' + '…');
        pyodide = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/',
          fullStdLib: true,
        });

        pyodide.setStdout({
          batched: function (text) {
            if (text) send({ type: 'stdout', data: String(text) });
          },
        });
        pyodide.setStderr({
          batched: function (text) {
            if (text) send({ type: 'stderr', data: String(text) });
          },
        });

        await pyodide.loadPackage(['micropip']);
        setStatus('Python ready');
        send({ type: 'ready', pyodideVersion: pyodide.version || '${PYODIDE_VERSION}' });
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

    async function runCode(code, autoInstall) {
      if (!pyodide) throw new Error('Python runtime not ready');
      if (running) throw new Error('A program is already running');
      running = true;
      interrupted = false;
      const started = Date.now();
      try {
        if (autoInstall) {
          setStatus('Resolving imports…');
          await pyodide.loadPackagesFromImports(code);
        }
        setStatus('Running…');
        await pyodide.runPythonAsync(code);
        send({ type: 'done', ok: !interrupted, durationMs: Date.now() - started });
      } catch (err) {
        const message = String(err && err.message ? err.message : err);
        if (!interrupted) {
          send({ type: 'stderr', data: message + '\\n' });
        }
        send({ type: 'done', ok: false, durationMs: Date.now() - started });
      } finally {
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
        pendingInputs.forEach(function (waiter) {
          waiter.reject(new Error('Interrupted'));
        });
        pendingInputs.clear();
        try {
          if (pyodide) pyodide.globals.set('__interrupt__', true);
        } catch (e) {}
        return;
      }

      if (msg.type === 'install') {
        installPackages(msg.packages || []).catch(function (err) {
          send({ type: 'error', message: String(err && err.message ? err.message : err) });
        });
        return;
      }

      if (msg.type === 'run') {
        runCode(msg.code || '', !!msg.autoInstall).catch(function (err) {
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

    boot();
  </script>
</body>
</html>`;
