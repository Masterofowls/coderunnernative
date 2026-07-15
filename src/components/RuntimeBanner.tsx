import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RuntimeCacheProgress } from '../engine/runtimeCache';
import { colors } from '../theme/colors';

interface RuntimeBannerProps {
  progress: RuntimeCacheProgress | null;
  onRetry?: () => void;
}

export function RuntimeBanner({ progress, onRetry }: RuntimeBannerProps) {
  if (!progress) return null;
  if (progress.phase === 'ready' && progress.localIndexUrl) return null;
  if (progress.phase === 'cdn_fallback' || progress.phase === 'error') {
    return (
      <View style={[styles.wrap, styles.warn]}>
        <Text style={styles.text}>{progress.message}</Text>
        {onRetry ? (
          <Pressable onPress={onRetry} style={styles.btn}>
            <Text style={styles.btnText}>Retry offline cache</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (progress.phase === 'checking' || progress.phase === 'downloading') {
    const pct =
      progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={colors.accent} />
        <View style={styles.meta}>
          <Text style={styles.text}>{progress.message}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  warn: {
    borderColor: colors.warning,
  },
  meta: { flex: 1, gap: 6 },
  text: { color: colors.text, fontSize: 12 },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: colors.accent,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btnText: { color: '#0b1016', fontWeight: '700', fontSize: 11 },
});
