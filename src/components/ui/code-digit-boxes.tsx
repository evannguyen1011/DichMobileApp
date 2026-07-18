import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  length?: number;
};

export function CodeDigitBoxes({ value, length = 6 }: Props) {
  const theme = useTheme();
  const cells = Array.from({ length }, (_, i) => value[i] ?? '');
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.row}>
      {cells.map((digit, i) => {
        const isActive = i === activeIndex && value.length < length;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                borderColor: isActive ? theme.primary : theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text style={[styles.digit, { color: theme.text }]}>{digit}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 22,
    fontWeight: '700',
  },
});
