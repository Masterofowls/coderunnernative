import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';

interface StdinPromptProps {
  prompt: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function StdinPrompt({ prompt, onSubmit, onCancel }: StdinPromptProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [prompt]);

  return (
    <View style={styles.wrap} accessibilityRole="none">
      <Text style={styles.prompt} numberOfLines={2}>
        {prompt || 'input>'}
      </Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={() => onSubmit(value)}
          placeholder="Type console input…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Console input"
        />
        <Pressable
          style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}
          onPress={() => onSubmit(value)}
          accessibilityRole="button"
          accessibilityLabel="Submit input"
        >
          <Text style={styles.btnText}>Send</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.ghost, pressed && styles.pressed]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel input"
        >
          <Text style={styles.btnText}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: 10,
    gap: 8,
  },
  prompt: {
    color: colors.warning,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.editorBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  btnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
});
