import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ParticipantRow } from '@/components/participant-row';
import { GhostButton } from '@/components/ui/buttons';
import { HintBanner } from '@/components/ui/hint-banner';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

type Participant = {
  name: string;
  isYou: boolean;
  isPresenter: boolean;
  lang: string;
};

type PendingRequest = { deviceId: string; name: string };

type Props = {
  sessionTab: 'chat' | 'participants';
  onChangeSessionTab: (tab: 'chat' | 'participants') => void;
  participants: Participant[];
  isHost: boolean;
  pendingRequests: PendingRequest[];
  onApprove: (deviceId: string) => void;
  onDecline: (deviceId: string) => void;
};

export function SessionParticipantsScreen({
  sessionTab,
  onChangeSessionTab,
  participants,
  isHost,
  pendingRequests,
  onApprove,
  onDecline,
}: Props) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <SegmentedTabs
        options={[
          { value: 'chat', label: t('chat') },
          { value: 'participants', label: t('participants') },
        ]}
        value={sessionTab}
        onChange={onChangeSessionTab}
      />

      {isHost &&
        pendingRequests.map((r) => (
          <View key={r.deviceId} style={[styles.requestRow, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.requestText, { color: theme.text }]}>{t('wantsToSpeak', r.name)}</Text>
            <View style={styles.requestButtons}>
              <GhostButton label={t('approve')} onPress={() => onApprove(r.deviceId)} />
              <GhostButton label={t('decline')} onPress={() => onDecline(r.deviceId)} />
            </View>
          </View>
        ))}

      <ScrollView style={styles.list}>
        {participants.map((p) => (
          <ParticipantRow
            key={p.name}
            name={p.name}
            isYou={p.isYou}
            isPresenter={p.isPresenter}
            youLabel={t('you')}
            presenterLabel={t('presenter')}
            langLabel={p.lang}
          />
        ))}
      </ScrollView>

      <HintBanner
        icon={{ ios: 'wifi', android: 'wifi', web: 'wifi' }}
        body={t('makeSureSameWifi')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  requestRow: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  requestText: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    flex: 1,
  },
});
