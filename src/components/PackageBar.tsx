import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';

interface PackageBarProps {
  disabled?: boolean;
  onInstall: (packages: string[]) => void;
  installedPackages: string[];
}

export function PackageBar({ disabled, onInstall, installedPackages }: PackageBarProps) {
  const [value, setValue] = useState('');

  const handleInstall = () => {
    const packages = value
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!packages.length) return;
    onInstall(packages);
    setValue('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>micropip install</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="numpy, pandas, matplotlib…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleInstall}
          accessibilityLabel="Python package names"
        />
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            disabled && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={handleInstall}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Install packages"
        >
          <Text style={styles.btnText}>Install</Text>
        </Pressable>
      </View>
      {installedPackages.length > 0 ? (
        <Text style={styles.hint} numberOfLines={2}>
          Loaded: {installedPackages.slice(0, 12).join(', ')}
          {installedPackages.length > 12 ? '…' : ''}
        </Text>
      ) : (
        <Text style={styles.hint}>
          Stdlib works offline after runtime load. Pure-Python / Pyodide wheels via micropip.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    backgroundColor: colors.accentPressed,
  },
  btnText: {
    color: '#0b1016',
    fontWeight: '700',
    fontSize: 13,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
