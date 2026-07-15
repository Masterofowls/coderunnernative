import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PackageBar } from './PackageBar';
import { PYTHON_PACKAGE_CATALOG } from '../engine/pythonPackages';
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
  const [filter, setFilter] = useState('');

  const filtered = PYTHON_PACKAGE_CATALOG.filter((p) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return p.name.includes(q) || p.hint.toLowerCase().includes(q);
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Python packages</Text>
            <Pressable onPress={onClose}>
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
            />
          </View>

          <PackageBar
            disabled={disabled}
            onInstall={onInstall}
            installedPackages={installedPackages}
          />

          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Search catalog…"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {filtered.map((pkg) => (
              <Pressable
                key={pkg.name}
                style={styles.item}
                disabled={disabled}
                onPress={() => onInstall([pkg.name])}
              >
                <Text style={styles.itemName}>{pkg.name}</Text>
                <Text style={styles.itemHint}>{pkg.hint}</Text>
              </Pressable>
            ))}
          </ScrollView>
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
    gap: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  close: { color: colors.accent, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
  search: {
    backgroundColor: colors.editorBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  list: { maxHeight: 220 },
  listContent: { gap: 6 },
  item: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  itemName: { color: colors.text, fontWeight: '700', fontFamily: 'monospace' },
  itemHint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
