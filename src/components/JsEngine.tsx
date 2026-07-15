import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { JS_RUNNER_HTML } from '../engine/jsRunnerHtml';

interface JsEngineProps {
  onMessage: (raw: string) => void;
}

export const JsEngine = forwardRef<WebView, JsEngineProps>(function JsEngine(
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
        source={{ html: JS_RUNNER_HTML, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
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
