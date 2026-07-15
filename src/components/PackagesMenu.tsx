import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PackageBar } from './PackageBar';
import { colors } from '../theme/colors';

interface PackagesMenuProps {
  visible: boolean;
  onClose: () => void;
  autoInstall: boolean;
  onAutoInstallChange: (value: boolean) => void;
  disabled?: boolean;
  onInstall: (packages: string[]) => void;
  installedPackages: string[];
}

export function PackagesMenu({
  visible,
  onClose,
  autoInstall,
  onAutoInstallChange,
  disabled,
  onInstall,
  installedPackages,
}: PackagesMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close packages menu">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Python packages</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={styles.close}>Close</Text>
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

          <PackageBar
            disabled={disabled}
            onInstall={onInstall}
            installedPackages={installedPackages}
          />

          <Text style={styles.hint}>
            Uses micropip / Pyodide wheels. Hidden from the main screen to keep the editor large.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  close: {
    color: colors.accent,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
