import { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildPyodideHtml, cdnPyodideIndexUrl, PYODIDE_VERSION } from '../engine/pyodideHtml';

// re-export helpers used by screen
void PYODIDE_VERSION;

interface PythonEngineProps {
  onMessage: (raw: string) => void;
  /** Local file:// index or CDN URL ending with / */
  indexUrl: string | null;
  active: boolean;
}

export const PythonEngine = forwardRef<WebView, PythonEngineProps>(function PythonEngine(
  { onMessage, indexUrl, active },
  ref,
) {
  const resolved = indexUrl ?? cdnPyodideIndexUrl();
  const html = useMemo(() => buildPyodideHtml(resolved), [resolved]);

  if (!active) return null;

  return (
    <View style={styles.host} pointerEvents="none" accessibilityElementsHidden>
      <WebView
        ref={ref}
        key={resolved}
        source={{
          html,
          baseUrl: resolved.startsWith('file') ? resolved : 'https://cdn.jsdelivr.net',
        }}
        onMessage={(event: WebViewMessageEvent) => onMessage(event.nativeEvent.data)}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  webview: {
    width: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
});
