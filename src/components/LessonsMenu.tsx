import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Lesson } from '../engine/lessons';
import type { CodeLanguage } from '../engine/language';
import { colors } from '../theme/colors';

interface LessonsMenuProps {
  visible: boolean;
  onClose: () => void;
  language: CodeLanguage;
  lessons: Lesson[];
  onStart: (lesson: Lesson) => void;
}

export function LessonsMenu({
  visible,
  onClose,
  language,
  lessons,
  onStart,
}: LessonsMenuProps) {
  const filtered = lessons.filter((l) => l.language === language);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Lessons</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>
            Load a challenge, run your code, then tap Check on the toolbar.
          </Text>
          <ScrollView style={styles.list}>
            {filtered.map((lesson) => (
              <Pressable
                key={lesson.id}
                style={styles.item}
                onPress={() => onStart(lesson)}
              >
                <Text style={styles.itemTitle}>{lesson.title}</Text>
                <Text style={styles.itemPrompt}>{lesson.prompt}</Text>
                <Text style={styles.itemHint}>Hint: {lesson.hint}</Text>
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
    gap: 10,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  close: { color: colors.accent, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: 12 },
  list: { maxHeight: 360 },
  item: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  itemTitle: { color: colors.text, fontWeight: '700' },
  itemPrompt: { color: colors.text, fontSize: 13 },
  itemHint: { color: colors.textMuted, fontSize: 12 },
});
