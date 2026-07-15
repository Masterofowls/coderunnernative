import { StyleSheet, TextInput, View, Text } from 'react-native';

import { colors } from '../theme/colors';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}

export function CodeEditor({ value, onChange, editable = true }: CodeEditorProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>editor.py</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        style={styles.input}
        accessibilityLabel="Python code editor"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1.15,
    backgroundColor: colors.editorBg,
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
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
