/** Inline JS sandbox with console + prompt/input bridging. */
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

    function formatArgs(args) {
      return Array.prototype.slice.call(args).map(function (arg) {
        if (typeof arg === 'string') return arg;
        try { return JSON.stringify(arg); } catch (e) { return String(arg); }
      }).join(' ');
    }

    console.log = function () {
      send({ type: 'stdout', data: formatArgs(arguments) + '\\n' });
    };
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

    async function runCode(code) {
      if (running) throw new Error('A program is already running');
      running = true;
      interrupted = false;
      const started = Date.now();
      try {
        setStatus('Running…');
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction(code);
        await fn();
        send({ type: 'done', ok: !interrupted, durationMs: Date.now() - started });
      } catch (err) {
        const message = String(err && err.stack ? err.stack : err && err.message ? err.message : err);
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
        pendingInputs.forEach(function (waiter) {
          waiter.reject(new Error('Interrupted'));
        });
        pendingInputs.clear();
        return;
      }

      if (msg.type === 'run') {
        runCode(msg.code || '').catch(function (err) {
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

    setStatus('Ready');
    send({ type: 'ready', version: 'javascript', engine: 'javascript', pyodideVersion: 'javascript' });
  </script>
</body>
</html>`;
