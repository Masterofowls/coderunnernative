import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';

interface StdinPromptProps {
  prompt: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  history?: string[];
}

export function StdinPrompt({ prompt, onSubmit, onCancel, history = [] }: StdinPromptProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [prompt]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt} numberOfLines={2}>
        {prompt || 'input>'}
      </Text>
      {history.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hist}>
          {history.slice(-8).reverse().map((item, idx) => (
            <Pressable key={`${item}-${idx}`} style={styles.histChip} onPress={() => setValue(item)}>
              <Text style={styles.histText} numberOfLines={1}>
                {item || '(empty)'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
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
        />
        <Pressable style={[styles.btn, styles.primary]} onPress={() => onSubmit(value)}>
          <Text style={styles.btnText}>Send</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.ghost]} onPress={onCancel}>
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
  prompt: { color: colors.warning, fontFamily: 'monospace', fontSize: 13 },
  hist: { gap: 6 },
  histChip: {
    maxWidth: 120,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  histText: { color: colors.textMuted, fontSize: 11, fontFamily: 'monospace' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
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
  btn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  primary: { backgroundColor: colors.accent },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
});
