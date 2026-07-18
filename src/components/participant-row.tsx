import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  name: string;
  isPresenter?: boolean;
  isYou?: boolean;
  presenterLabel: string;
  langLabel: string;
  youLabel: string;
};

export function ParticipantRow({ name, isPresenter, isYou, presenterLabel, langLabel, youLabel }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <Avatar name={name} size={36} />
      <View style={styles.nameColumn}>
        <Text style={[styles.name, { color: theme.text }]}>
          {name}
          {isYou ? ` (${youLabel})` : ''}
        </Text>
      </View>
      {isPresenter ? <Badge label={presenterLabel} variant="primary" /> : null}
      <Badge label={langLabel} variant="neutral" style={styles.langBadge} />
      <SymbolView
        name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
        tintColor={theme.textSecondary}
        size={18}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameColumn: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  langBadge: {
    marginRight: 4,
  },
});
