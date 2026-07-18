import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

function ControlButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.smallButton}>
      <SymbolView name={icon} tintColor={active ? theme.primary : theme.textSecondary} size={22} />
      <Text style={[styles.smallLabel, { color: active ? theme.primary : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

type Props = {
  isRunning: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleRunning: () => void;
  onToggleSpeaker: () => void;
  speakerOn: boolean;
  onTextSize: () => void;
  onMore: () => void;
  muteLabel: string;
  speakerLabel: string;
  textSizeLabel: string;
  moreLabel: string;
};

export function ControlBar({
  isRunning,
  isMuted,
  onToggleMute,
  onToggleRunning,
  onToggleSpeaker,
  speakerOn,
  onTextSize,
  onMore,
  muteLabel,
  speakerLabel,
  textSizeLabel,
  moreLabel,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ControlButton
        icon={{ ios: isMuted ? 'mic.slash.fill' : 'mic.fill', android: 'mic', web: 'mic' }}
        label={muteLabel}
        onPress={onToggleMute}
        active={isMuted}
      />
      <ControlButton
        icon={{ ios: 'speaker.wave.2.fill', android: 'volume_up', web: 'volume_up' }}
        label={speakerLabel}
        onPress={onToggleSpeaker}
        active={speakerOn}
      />
      <Pressable
        onPress={onToggleRunning}
        style={[styles.mainButton, { backgroundColor: theme.primary }]}
      >
        <SymbolView
          name={{ ios: isRunning ? 'pause.fill' : 'play.fill', android: isRunning ? 'pause' : 'play_arrow', web: isRunning ? 'pause' : 'play_arrow' }}
          tintColor="#FFFFFF"
          size={26}
        />
      </Pressable>
      <ControlButton
        icon={{ ios: 'textformat.size', android: 'format_size', web: 'format_size' }}
        label={textSizeLabel}
        onPress={onTextSize}
      />
      <ControlButton
        icon={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
        label={moreLabel}
        onPress={onMore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  smallButton: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
