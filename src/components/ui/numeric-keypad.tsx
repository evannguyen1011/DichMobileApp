import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

type Props = {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
};

export function NumericKeypad({ onKeyPress, onBackspace }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {KEYS.map((key, i) => {
        if (key === '') return <View key={i} style={styles.key} />;
        if (key === 'del') {
          return (
            <Pressable
              key={i}
              onPress={onBackspace}
              style={({ pressed }) => [styles.key, pressed && { backgroundColor: theme.card }]}
            >
              <SymbolView
                name={{ ios: 'delete.left', android: 'backspace', web: 'backspace' }}
                tintColor={theme.text}
                size={22}
              />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={i}
            onPress={() => onKeyPress(key)}
            style={({ pressed }) => [styles.key, pressed && { backgroundColor: theme.card }]}
          >
            <Text style={[styles.digit, { color: theme.text }]}>{key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.333%',
    aspectRatio: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  digit: {
    fontSize: 24,
    fontWeight: '600',
  },
});
