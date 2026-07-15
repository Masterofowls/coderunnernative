import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { CodeExample } from '../engine/examples';
import type { RunnerStatus } from '../engine/protocol';
import { colors } from '../theme/colors';

interface ToolbarProps {
  status: RunnerStatus;
  statusMessage: string;
  autoInstall: boolean;
  onAutoInstallChange: (value: boolean) => void;
  examples: CodeExample[];
  onSelectExample: (example: CodeExample) => void;
  onRun: () => void;
  onStop: () => void;
  onClear: () => void;
  canRun: boolean;
}

export function Toolbar({
  status,
  statusMessage,
  autoInstall,
  onAutoInstallChange,
  examples,
  onSelectExample,
  onRun,
  onStop,
  onClear,
  canRun,
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
          accessibilityLabel="Run Python code"
        >
          <Text style={styles.btnTextDark}>Run</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.stop, pressed && styles.pressed]}
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Stop Python code"
        >
          <Text style={styles.btnTextDark}>Stop</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.ghost, pressed && styles.pressed]}
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear console"
        >
          <Text style={styles.btnTextLight}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={styles.switchLabel}>Auto-import packages</Text>
        <Switch
          value={autoInstall}
          onValueChange={onAutoInstallChange}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
          accessibilityLabel="Automatically install imported packages"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {examples.map((example) => (
          <Pressable
            key={example.id}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            onPress={() => onSelectExample(example)}
            accessibilityRole="button"
            accessibilityLabel={`Load example ${example.title}`}
          >
            <Text style={styles.chipText}>{example.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBlock: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  status: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  run: {
    backgroundColor: colors.success,
  },
  stop: {
    backgroundColor: colors.error,
  },
  ghost: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
  btnTextDark: {
    color: '#0b1016',
    fontWeight: '700',
    fontSize: 13,
  },
  btnTextLight: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  chips: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
