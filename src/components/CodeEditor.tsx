import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  errorLine?: number | null;
  flex?: number;
}

export function CodeEditor({
  language,
  value,
  onChange,
  editable = true,
  errorLine = null,
  flex = 2.4,
}: CodeEditorProps) {
  const webRef = useRef<WebView>(null);
  const valueRef = useRef(value);
  const lastLocalRef = useRef(value);
  const languageRef = useRef(language);
  const seedRef = useRef(value);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  valueRef.current = value;

  if (languageRef.current !== language) {
    languageRef.current = language;
    seedRef.current = value;
    lastLocalRef.current = value;
  }

  const html = useMemo(() => buildEditorHtml(language, seedRef.current), [language]);

  useEffect(() => {
    if (value === lastLocalRef.current) return;
    lastLocalRef.current = value;
    webRef.current?.postMessage(JSON.stringify({ type: 'setValue', value }));
  }, [value]);

  useEffect(() => {
    if (errorLine && errorLine > 0) {
      webRef.current?.postMessage(JSON.stringify({ type: 'jumpLine', line: errorLine }));
    }
  }, [errorLine]);

  const postCmd = useCallback((payload: Record<string, unknown>) => {
    webRef.current?.postMessage(JSON.stringify(payload));
  }, []);

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
        if (parsed.value !== valueRef.current) onChange(parsed.value);
      }
    },
    [onChange],
  );

  const clearEditor = useCallback(async () => {
    Alert.alert('Clear editor?', 'This removes the current buffer.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => onChange(''),
      },
    ]);
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
    const next = current
      ? `${current}${current.endsWith('\n') ? '' : '\n'}${text}`
      : text;
    onChange(next);
  }, [onChange]);

  const runFind = useCallback(() => {
    if (!findQuery.trim()) return;
    postCmd({ type: 'findQuery', query: findQuery.trim() });
    setFindOpen(false);
  }, [findQuery, postCmd]);

  return (
    <View style={[styles.wrap, { flex }]}>
      <View style={styles.header}>
        <Text style={styles.label}>{fileLabelFor(language)}</Text>
        <View style={styles.actions}>
          <ActionChip label="Undo" onPress={() => postCmd({ type: 'undo' })} />
          <ActionChip label="Redo" onPress={() => postCmd({ type: 'redo' })} />
          <ActionChip label="Find" onPress={() => setFindOpen(true)} />
          <ActionChip label="Copy" onPress={copyCode} />
          <ActionChip label="Paste" onPress={pasteCode} disabled={!editable} />
          <ActionChip label="Clear" onPress={clearEditor} disabled={!editable} tone="danger" />
        </View>
      </View>

      <View style={styles.keys}>
        {['Tab', '()', '[]', '{}', ':', '=', '"'].map((key) => (
          <Pressable
            key={key}
            style={styles.keyChip}
            onPress={() => {
              if (key === 'Tab') postCmd({ type: 'insertText', value: '    ' });
              else if (key === '()') postCmd({ type: 'insertText', value: '()' });
              else if (key === '[]') postCmd({ type: 'insertText', value: '[]' });
              else if (key === '{}') postCmd({ type: 'insertText', value: '{}' });
              else postCmd({ type: 'insertText', value: key });
            }}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>

      <WebView
        ref={webRef}
        key={language}
        source={{ html, baseUrl: 'https://localhost' }}
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

      <Modal visible={findOpen} transparent animationType="fade" onRequestClose={() => setFindOpen(false)}>
        <Pressable style={styles.findBackdrop} onPress={() => setFindOpen(false)}>
          <Pressable style={styles.findSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.findTitle}>Find in editor</Text>
            <TextInput
              value={findQuery}
              onChangeText={setFindQuery}
              autoFocus
              placeholder="Search…"
              placeholderTextColor={colors.textMuted}
              style={styles.findInput}
              onSubmitEditing={runFind}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.findBtn} onPress={runFind}>
              <Text style={styles.findBtnText}>Find next</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 180,
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
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 4,
    flex: 1,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipDanger: { borderColor: colors.error },
  chipDisabled: { opacity: 0.4 },
  chipPressed: { opacity: 0.8 },
  chipText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  keys: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  keyChip: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  keyText: { color: colors.textMuted, fontFamily: 'monospace', fontSize: 12 },
  webview: { flex: 1, backgroundColor: colors.editorBg },
  disabled: { opacity: 0.7 },
  findBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  findSheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  findTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  findInput: {
    backgroundColor: colors.editorBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: 'monospace',
  },
  findBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  findBtnText: { color: '#0b1016', fontWeight: '700' },
});
