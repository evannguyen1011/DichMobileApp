import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

type Props = {
  /** 0..1 */
  value: number;
  onValueChange: (value: number) => void;
};

/** Minimal drag slider (no native dependency) - used for the mic silence-threshold control. */
export function SensitivitySlider({ value, onValueChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const handleTouch = (locationX: number) => {
    if (trackWidthRef.current <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidthRef.current));
    onValueChange(ratio);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => handleTouch(evt.nativeEvent.locationX),
      onPanResponderMove: (evt: GestureResponderEvent) => handleTouch(evt.nativeEvent.locationX),
    })
  ).current;

  return (
    <View style={styles.track} onLayout={onLayout} {...panResponder.panHandlers}>
      <View style={styles.trackBase} />
      <View style={[styles.filled, { width: `${value * 100}%` }]} />
      <View style={[styles.thumb, { left: trackWidth * value - 9 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 32,
    justifyContent: 'center',
  },
  trackBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
  },
  filled: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1976D2',
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1976D2',
  },
});
