import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  sessionId: string;
  peopleCount: number;
  leaveLabel: string;
  onLeave: () => void;
};

export function SessionTopBar({ sessionId, peopleCount, leaveLabel, onLeave }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: theme.primary }]}>
      <Text style={styles.sessionId}>Session ID: {sessionId}</Text>
      <View style={styles.right}>
        <View style={styles.peopleChip}>
          <SymbolView
            name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
            tintColor="#FFFFFF"
            size={14}
          />
          <Text style={styles.peopleCount}>{peopleCount}</Text>
        </View>
        <Pressable onPress={onLeave} style={styles.leaveButton}>
          <Text style={[styles.leaveLabel, { color: theme.primary }]}>{leaveLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
  },
  sessionId: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  peopleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  peopleCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  leaveButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  leaveLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
