import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { PYODIDE_HTML } from '../engine/pyodideHtml';

interface PythonEngineProps {
  onMessage: (raw: string) => void;
}

export const PythonEngine = forwardRef<WebView, PythonEngineProps>(function PythonEngine(
  { onMessage },
  ref,
) {
  const handleMessage = (event: WebViewMessageEvent) => {
    onMessage(event.nativeEvent.data);
  };

  return (
    <View style={styles.host} pointerEvents="none" accessibilityElementsHidden>
      <WebView
        ref={ref}
        source={{ html: PYODIDE_HTML, baseUrl: 'https://cdn.jsdelivr.net' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction
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
