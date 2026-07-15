import {
  CM_CLOSEBRACKETS,
  CM_CORE,
  CM_CSS,
  CM_JAVASCRIPT,
  CM_MATCHBRACKETS,
  CM_PYTHON,
  CM_SEARCHCURSOR,
  CM_THEME,
} from '../vendor/codemirrorEmbedded';
import type { CodeLanguage } from './language';

/** Offline CodeMirror editor (vendored assets, no CDN). */
export function buildEditorHtml(language: CodeLanguage, initialValue: string): string {
  const mode = language === 'python' ? 'python' : 'javascript';
  const escaped = JSON.stringify(initialValue);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>${CM_CSS}</style>
  <style>${CM_THEME}</style>
  <style>
    html, body, #host { height: 100%; margin: 0; background: #0b1016; }
    .CodeMirror {
      height: 100%;
      font-size: 14px;
      line-height: 1.45;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .CodeMirror-scroll { padding-bottom: 24px; }
    .cm-error-line { background: rgba(240, 113, 120, 0.18); }
  </style>
</head>
<body>
  <div id="host"></div>
  <script>${CM_CORE}</script>
  <script>${CM_PYTHON}</script>
  <script>${CM_JAVASCRIPT}</script>
  <script>${CM_MATCHBRACKETS}</script>
  <script>${CM_CLOSEBRACKETS}</script>
  <script>${CM_SEARCHCURSOR}</script>
  <script>
    const initial = ${escaped};
    let suppress = false;
    let errorMark = null;
    const editor = CodeMirror(document.getElementById('host'), {
      value: initial,
      mode: '${mode}',
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      matchBrackets: true,
      autoCloseBrackets: true,
      viewportMargin: Infinity,
      inputStyle: 'contenteditable',
      extraKeys: {
        Tab: function(cm) {
          if (cm.somethingSelected()) cm.indentSelection('add');
          else cm.replaceSelection('    ', 'end');
        },
        'Shift-Tab': function(cm) { cm.indentSelection('subtract'); },
        'Ctrl-Z': function(cm) { cm.undo(); },
        'Cmd-Z': function(cm) { cm.undo(); },
        'Ctrl-Y': function(cm) { cm.redo(); },
        'Cmd-Shift-Z': function(cm) { cm.redo(); },
      }
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

    function clearErrorLine() {
      if (errorMark) {
        errorMark.clear();
        errorMark = null;
      }
    }

    function handleMessage(raw) {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
      if (!msg || !msg.type) return;
      if (msg.type === 'setValue') {
        suppress = true;
        clearErrorLine();
        const cursor = editor.getCursor();
        editor.setValue(msg.value == null ? '' : String(msg.value));
        try { editor.setCursor(cursor); } catch (e) {}
        suppress = false;
      }
      if (msg.type === 'setLanguage') {
        editor.setOption('mode', msg.language === 'python' ? 'python' : 'javascript');
      }
      if (msg.type === 'focus') editor.focus();
      if (msg.type === 'undo') editor.undo();
      if (msg.type === 'redo') editor.redo();
      if (msg.type === 'insertText') {
        editor.replaceSelection(String(msg.value || ''), 'end');
        editor.focus();
      }
      if (msg.type === 'findQuery') {
        var q = String(msg.query || '');
        if (!q) return;
        var cursor = editor.getSearchCursor(q, editor.getCursor(), { caseFold: true });
        if (!cursor.findNext()) {
          cursor = editor.getSearchCursor(q, { line: 0, ch: 0 }, { caseFold: true });
          if (!cursor.findNext()) { editor.focus(); return; }
        }
        editor.setSelection(cursor.from(), cursor.to());
        editor.scrollIntoView(cursor.from(), 60);
        editor.focus();
      }
      if (msg.type === 'jumpLine') {
        clearErrorLine();
        const line = Math.max(0, (Number(msg.line) || 1) - 1);
        editor.setCursor({ line: line, ch: 0 });
        errorMark = editor.markText(
          { line: line, ch: 0 },
          { line: line, ch: editor.getLine(line).length },
          { className: 'cm-error-line' }
        );
        editor.scrollIntoView({ line: line, ch: 0 }, 80);
        editor.focus();
      }
      if (msg.type === 'clearError') clearErrorLine();
    }

    document.addEventListener('message', function (e) { handleMessage(e.data); });
    window.addEventListener('message', function (e) { handleMessage(e.data); });
    send({ type: 'editor_ready' });
  </script>
</body>
</html>`;
}
