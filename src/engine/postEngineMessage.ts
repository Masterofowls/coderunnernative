import type { WebView } from 'react-native-webview';

import type { HostToEngineMessage } from './protocol';

/**
 * Deliver host→engine messages. Uses injectJavaScript on Android because
 * WebView.postMessage is unreliable with html-string sources.
 */
export function postEngineMessage(
  webView: WebView | null,
  message: HostToEngineMessage,
): void {
  if (!webView) return;
  const payload = JSON.stringify(message);
  const js = `
    (function(){
      try {
        var raw = ${JSON.stringify(payload)};
        if (typeof window.__coderunner_handle === 'function') {
          window.__coderunner_handle(raw);
        } else if (typeof document !== 'undefined') {
          document.dispatchEvent(new MessageEvent('message', { data: raw }));
        }
      } catch (e) {}
      true;
    })();
  `;
  webView.injectJavaScript(js);
}
