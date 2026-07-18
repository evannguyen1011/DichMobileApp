import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type HistorySession = {
  id: string;
  title: string;
  time: string;
  langPair: string;
  peopleCount: number;
  duration: string;
};

export function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: HistorySession;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable style={[styles.card, { borderColor: theme.border }]} onPress={onPress}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: theme.text }]}>{session.title}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {session.time} · {session.langPair}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={styles.peopleChip}>
          <SymbolView
            name={{ ios: 'person.2', android: 'group', web: 'group' }}
            tintColor={theme.textSecondary}
            size={13}
          />
          <Text style={[styles.peopleCount, { color: theme.textSecondary }]}>{session.peopleCount}</Text>
        </View>
        <Text style={[styles.duration, { color: theme.textSecondary }]}>{session.duration}</Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10}>
          <SymbolView
            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
            tintColor={theme.danger}
            size={16}
          />
        </Pressable>
      ) : null}
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={theme.textSecondary}
        size={16}
      />
    </Pressable>
  );
}

export function SavedTranslationRow({
  title,
  time,
  langPair,
}: {
  title: string;
  time: string;
  langPair: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {time} · {langPair}
        </Text>
      </View>
      <SymbolView
        name={{ ios: 'star.fill', android: 'star', web: 'star' }}
        tintColor={theme.star}
        size={18}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12.5,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  peopleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  peopleCount: {
    fontSize: 12,
  },
  duration: {
    fontSize: 12,
  },
});
