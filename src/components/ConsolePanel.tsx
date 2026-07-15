import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import type { ConsoleLine } from '../engine/protocol';
import { colors } from '../theme/colors';

interface ConsolePanelProps {
  lines: ConsoleLine[];
  flex?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onJumpError?: () => void;
  hasErrorJump?: boolean;
}

export function ConsolePanel({
  lines,
  flex = 0.95,
  collapsed = false,
  onToggleCollapse,
  onJumpError,
  hasErrorJump,
}: ConsolePanelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!collapsed) scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines, collapsed]);

  const copyAll = async () => {
    const text = lines.map((l) => l.text).join('');
    await Clipboard.setStringAsync(text || '');
    setCopied(true);
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <View style={[styles.wrap, { flex: collapsed ? 0 : flex }, collapsed && styles.collapsed]}>
      <View style={styles.header}>
        <Text style={styles.label}>console</Text>
        <View style={styles.actions}>
          {hasErrorJump ? (
            <Pressable onPress={onJumpError} style={styles.chip}>
              <Text style={styles.chipText}>Jump error</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={copyAll} style={styles.chip}>
            <Text style={styles.chipText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
          {onToggleCollapse ? (
            <Pressable onPress={onToggleCollapse} style={styles.chip}>
              <Text style={styles.chipText}>{collapsed ? 'Expand' : 'Collapse'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {!collapsed ? (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          accessibilityLabel="Program console output"
        >
          {lines.length === 0 ? (
            <Text style={styles.empty}>
              Output appears here. Python input() / JS prompt() open a prompt below.
            </Text>
          ) : (
            lines.map((line) => (
              <Text key={line.id} style={[styles.line, styleForKind(line.kind)]} selectable>
                {line.text}
              </Text>
            ))
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function styleForKind(kind: ConsoleLine['kind']) {
  switch (kind) {
    case 'stderr':
      return styles.stderr;
    case 'system':
      return styles.system;
    case 'stdin':
      return styles.stdin;
    case 'prompt':
      return styles.prompt;
    default:
      return styles.stdout;
  }
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
    backgroundColor: colors.consoleBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  collapsed: {
    flexGrow: 0,
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actions: { flexDirection: 'row', gap: 6 },
  chip: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 12, paddingBottom: 12, gap: 2 },
  empty: { color: colors.textMuted, fontFamily: 'monospace', fontSize: 13 },
  line: { fontFamily: 'monospace', fontSize: 13, lineHeight: 18 },
  stdout: { color: colors.text },
  stderr: { color: colors.error },
  system: { color: colors.textMuted },
  stdin: { color: colors.stdin },
  prompt: { color: colors.warning },
});
