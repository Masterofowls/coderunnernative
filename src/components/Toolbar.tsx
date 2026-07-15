import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CodeExample } from '../engine/examples';
import type { CodeLanguage } from '../engine/language';
import type { RunnerStatus } from '../engine/protocol';
import { colors } from '../theme/colors';

interface ToolbarProps {
  language: CodeLanguage;
  onLanguageChange: (language: CodeLanguage) => void;
  status: RunnerStatus;
  statusMessage: string;
  examples: CodeExample[];
  onSelectExample: (example: CodeExample) => void;
  onRun: () => void;
  onStop: () => void;
  onClearConsole: () => void;
  onOpenPackages?: () => void;
  onOpenProjects: () => void;
  onOpenLessons: () => void;
  onCheckLesson?: () => void;
  canRun: boolean;
  lessonActive?: boolean;
}

export function Toolbar({
  language,
  onLanguageChange,
  status,
  statusMessage,
  examples,
  onSelectExample,
  onRun,
  onStop,
  onClearConsole,
  onOpenPackages,
  onOpenProjects,
  onOpenLessons,
  onCheckLesson,
  canRun,
  lessonActive,
}: ToolbarProps) {
  const busy = status === 'running' || status === 'awaiting_input' || status === 'installing';

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.statusBlock}>
          <Text style={styles.brand}>CodeRunner Native</Text>
          <Text style={styles.status} numberOfLines={1}>
            {statusMessage}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.run,
            (!canRun || busy) && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={onRun}
          disabled={!canRun || busy}
          accessibilityRole="button"
        >
          <Text style={styles.btnTextDark}>Run</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.stop, pressed && styles.pressed]}
          onPress={onStop}
        >
          <Text style={styles.btnTextDark}>Stop</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.ghost, pressed && styles.pressed]}
          onPress={onClearConsole}
        >
          <Text style={styles.btnTextLight}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={styles.langGroup}>
          <LangTab
            label="Python"
            active={language === 'python'}
            onPress={() => onLanguageChange('python')}
          />
          <LangTab
            label="JavaScript"
            active={language === 'javascript'}
            onPress={() => onLanguageChange('javascript')}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable style={styles.chip} onPress={onOpenProjects}>
          <Text style={styles.chipText}>Projects</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={onOpenLessons}>
          <Text style={styles.chipText}>Lessons</Text>
        </Pressable>
        {lessonActive && onCheckLesson ? (
          <Pressable style={[styles.chip, styles.chipAccent]} onPress={onCheckLesson}>
            <Text style={styles.chipTextDark}>Check</Text>
          </Pressable>
        ) : null}
        {language === 'python' && onOpenPackages ? (
          <Pressable style={styles.chip} onPress={onOpenPackages}>
            <Text style={styles.chipText}>Packages</Text>
          </Pressable>
        ) : null}
        {examples.map((example) => (
          <Pressable
            key={example.id}
            style={styles.chip}
            onPress={() => onSelectExample(example)}
          >
            <Text style={styles.chipText}>{example.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function LangTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.langTab, active && styles.langTabActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.langTabText, active && styles.langTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBlock: { flex: 1, minWidth: 0 },
  brand: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  status: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  btn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  run: { backgroundColor: colors.success },
  stop: { backgroundColor: colors.error },
  ghost: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  btnTextDark: { color: '#0b1016', fontWeight: '700', fontSize: 13 },
  btnTextLight: { color: colors.text, fontWeight: '700', fontSize: 13 },
  langGroup: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  langTab: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  langTabActive: { backgroundColor: colors.accent },
  langTabText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  langTabTextActive: { color: '#0b1016' },
  chips: { gap: 8, paddingRight: 4 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  chipTextDark: { color: '#0b1016', fontSize: 12, fontWeight: '700' },
});
