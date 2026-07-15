import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ConsoleLine } from '../engine/protocol';
import { colors } from '../theme/colors';

interface ConsolePanelProps {
  lines: ConsoleLine[];
}

export function ConsolePanel({ lines }: ConsolePanelProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>console</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        accessibilityLabel="Program console output"
      >
        {lines.length === 0 ? (
          <Text style={styles.empty}>Output appears here. input() opens a prompt below.</Text>
        ) : (
          lines.map((line) => (
            <Text key={line.id} style={[styles.line, styleForKind(line.kind)]} selectable>
              {line.text.endsWith('\n') ? line.text : `${line.text}`}
            </Text>
          ))
        )}
      </ScrollView>
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
    flex: 1,
    backgroundColor: colors.consoleBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 2,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  line: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  stdout: {
    color: colors.text,
  },
  stderr: {
    color: colors.error,
  },
  system: {
    color: colors.textMuted,
  },
  stdin: {
    color: colors.stdin,
  },
  prompt: {
    color: colors.warning,
  },
});
