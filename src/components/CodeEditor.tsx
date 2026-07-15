import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { buildEditorHtml } from '../engine/editorHtml';
import { fileLabelFor, type CodeLanguage } from '../engine/language';
import { colors } from '../theme/colors';

interface CodeEditorProps {
  language: CodeLanguage;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}

export function CodeEditor({ language, value, onChange, editable = true }: CodeEditorProps) {
  const webRef = useRef<WebView>(null);
  const valueRef = useRef(value);
  const lastLocalRef = useRef(value);
  const languageRef = useRef(language);
  const seedRef = useRef(value);
  valueRef.current = value;

  if (languageRef.current !== language) {
    languageRef.current = language;
    seedRef.current = value;
    lastLocalRef.current = value;
  }

  // Remount editor when language changes; seed with that language's buffer.
  const html = useMemo(() => buildEditorHtml(language, seedRef.current), [language]);

  useEffect(() => {
    if (value === lastLocalRef.current) return;
    lastLocalRef.current = value;
    webRef.current?.postMessage(JSON.stringify({ type: 'setValue', value }));
  }, [value]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let parsed: { type?: string; value?: string };
      try {
        parsed = JSON.parse(event.nativeEvent.data) as { type?: string; value?: string };
      } catch {
        return;
      }
      if (parsed.type === 'change' && typeof parsed.value === 'string') {
        lastLocalRef.current = parsed.value;
        if (parsed.value !== valueRef.current) {
          onChange(parsed.value);
        }
      }
    },
    [onChange],
  );

  const clearEditor = useCallback(async () => {
    onChange('');
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
  }, [onChange]);

  const copyCode = useCallback(async () => {
    await Clipboard.setStringAsync(valueRef.current);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  }, []);

  const pasteCode = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) return;
    const current = valueRef.current;
    const next = current ? `${current}${current.endsWith('\n') ? '' : '\n'}${text}` : text;
    onChange(next);
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
  }, [onChange]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{fileLabelFor(language)}</Text>
        <View style={styles.actions}>
          <ActionChip label="Copy" onPress={copyCode} />
          <ActionChip label="Paste" onPress={pasteCode} disabled={!editable} />
          <ActionChip label="Clear" onPress={clearEditor} disabled={!editable} tone="danger" />
        </View>
      </View>
      <WebView
        ref={webRef}
        key={language}
        source={{ html, baseUrl: 'https://cdnjs.cloudflare.com' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        keyboardDisplayRequiresUserAction={false}
        style={[styles.webview, !editable && styles.disabled]}
        pointerEvents={editable ? 'auto' : 'none'}
        accessibilityLabel={`${language} code editor`}
      />
    </View>
  );
}

function ActionChip({
  label,
  onPress,
  disabled,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        tone === 'danger' && styles.chipDanger,
        disabled && styles.chipDisabled,
        pressed && styles.chipPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label} editor`}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 2.4,
    minHeight: 220,
    backgroundColor: colors.editorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipDanger: {
    borderColor: colors.error,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.editorBg,
  },
  disabled: {
    opacity: 0.7,
  },
});
