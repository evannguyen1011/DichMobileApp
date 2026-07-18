import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const BAR_COUNT = 20;
const MIN_HEIGHT = 6;
const MAX_EXTRA_HEIGHT = 34;

// Relative height multiplier per bar - smooth bell curve so the middle bars peak higher.
const BAR_SHAPE = Array.from({ length: BAR_COUNT }, (_, i) => {
  const t = i / (BAR_COUNT - 1);
  return 0.25 + 0.75 * Math.sin(t * Math.PI);
});

function Bar({ volume, shape }: { volume: SharedValue<number>; shape: number }) {
  const style = useAnimatedStyle(() => ({
    height: MIN_HEIGHT + volume.value * MAX_EXTRA_HEIGHT * shape,
  }));
  return <Animated.View style={[styles.bar, style]} />;
}

/** Reacts in real time to the recognizer's `volumechange` event (see index.tsx). */
export function Waveform({ volume }: { volume: SharedValue<number> }) {
  return (
    <View style={styles.container}>
      {BAR_SHAPE.map((shape, i) => (
        <Bar key={i} volume={volume} shape={shape} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    width: '100%',
    height: MIN_HEIGHT + MAX_EXTRA_HEIGHT,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#1976D2',
  },
});
