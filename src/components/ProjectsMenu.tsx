import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { CodeProject } from '../engine/projects';
import type { CodeLanguage } from '../engine/language';
import { colors } from '../theme/colors';

interface ProjectsMenuProps {
  visible: boolean;
  onClose: () => void;
  projects: CodeProject[];
  language: CodeLanguage;
  onSaveAs: (name: string) => void;
  onOpen: (project: CodeProject) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
  onShare: () => void;
}

export function ProjectsMenu({
  visible,
  onClose,
  projects,
  language,
  onSaveAs,
  onOpen,
  onDelete,
  onExport,
  onImport,
  onShare,
}: ProjectsMenuProps) {
  const [name, setName] = useState('');
  const filtered = projects.filter((p) => p.language === language);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Projects</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New project name…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Pressable
              style={styles.btn}
              onPress={() => {
                onSaveAs(name.trim() || 'Untitled');
                setName('');
              }}
            >
              <Text style={styles.btnText}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <Pressable style={styles.ghost} onPress={onImport}>
              <Text style={styles.ghostText}>Import file</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={onExport}>
              <Text style={styles.ghostText}>Export</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={onShare}>
              <Text style={styles.ghostText}>Share</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No saved {language} projects yet.</Text>
            ) : (
              filtered.map((p) => (
                <View key={p.id} style={styles.item}>
                  <Pressable style={styles.itemMain} onPress={() => onOpen(p)}>
                    <Text style={styles.itemName}>{p.name}</Text>
                    <Text style={styles.itemMeta}>
                      {new Date(p.updatedAt).toLocaleString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete project?', p.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDelete(p.id),
                        },
                      ])
                    }
                  >
                    <Text style={styles.delete}>Delete</Text>
                  </Pressable>
                </View>
              ))
            )}
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
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  close: { color: colors.accent, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.editorBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnText: { color: '#0b1016', fontWeight: '700' },
  ghost: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  ghostText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  list: { maxHeight: 280 },
  empty: { color: colors.textMuted },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemMain: { flex: 1 },
  itemName: { color: colors.text, fontWeight: '700' },
  itemMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  delete: { color: colors.error, fontWeight: '600' },
});
