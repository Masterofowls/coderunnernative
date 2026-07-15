import type { CodeLanguage } from './language';

/** CodeMirror 5 editor shell with Python / JavaScript modes. */
export function buildEditorHtml(language: CodeLanguage, initialValue: string): string {
  const mode = language === 'python' ? 'python' : 'javascript';
  const escaped = JSON.stringify(initialValue);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/theme/material-darker.min.css" />
  <style>
    html, body, #host { height: 100%; margin: 0; background: #0b1016; }
    .CodeMirror {
      height: 100%;
      font-size: 14px;
      line-height: 1.45;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .CodeMirror-scroll { padding-bottom: 24px; }
  </style>
</head>
<body>
  <div id="host"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/mode/python/python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/mode/javascript/javascript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/addon/edit/matchbrackets.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/addon/edit/closebrackets.min.js"></script>
  <script>
    const initial = ${escaped};
    let suppress = false;
    const editor = CodeMirror(document.getElementById('host'), {
      value: initial,
      mode: '${mode}',
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 4,
      tabSize: 4,
      matchBrackets: true,
      autoCloseBrackets: true,
      viewportMargin: Infinity,
      inputStyle: 'contenteditable',
    });

    function send(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    editor.on('change', function () {
      if (suppress) return;
      send({ type: 'change', value: editor.getValue() });
    });

    function handleMessage(raw) {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
      if (!msg || !msg.type) return;
      if (msg.type === 'setValue') {
        suppress = true;
        const cursor = editor.getCursor();
        editor.setValue(msg.value == null ? '' : String(msg.value));
        try { editor.setCursor(cursor); } catch (e) {}
        suppress = false;
      }
      if (msg.type === 'setLanguage') {
        editor.setOption('mode', msg.language === 'python' ? 'python' : 'javascript');
      }
      if (msg.type === 'focus') {
        editor.focus();
      }
    }

    document.addEventListener('message', function (e) { handleMessage(e.data); });
    window.addEventListener('message', function (e) { handleMessage(e.data); });
    send({ type: 'editor_ready' });
  </script>
</body>
</html>`;
}
