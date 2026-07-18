import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { HintBanner } from '@/components/ui/hint-banner';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

type Props = {
  host: string;
  port: number;
  peerCount: number;
  onStart: () => void;
  onCancel: () => void;
};

export function HostQrScreen({ host, port, peerCount, onStart, onCancel }: Props) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.backButton}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            tintColor={theme.primary}
            size={22}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>{t('shareQrTitle')}</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={[styles.instruction, { color: theme.text }]}>{t('shareQrInstruction')}</Text>

      <HintBanner
        icon={{ ios: 'wifi', android: 'wifi', web: 'wifi' }}
        body={t('makeSureSameWifi')}
      />

      <View style={[styles.qrBox, { borderColor: theme.border }]}>
        <QRCode value={JSON.stringify({ host, port })} size={220} />
      </View>

      <Text style={[styles.address, { color: theme.textSecondary }]}>
        {host}:{port}
      </Text>

      <View style={styles.lockRow}>
        <SymbolView
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          tintColor={theme.textSecondary}
          size={14}
        />
        <Text style={[styles.lockText, { color: theme.textSecondary }]}>{t('onlyDiscoverableLan')}</Text>
      </View>

      <Text style={[styles.peopleJoined, { color: theme.text }]}>{t('peopleJoined', peerCount)}</Text>

      <View style={styles.buttonGroup}>
        <PrimaryButton label={t('startSession')} onPress={onStart} />
        <SecondaryButton label={t('cancel')} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 32,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
  },
  qrBox: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  address: {
    fontSize: 13,
    textAlign: 'center',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lockText: {
    fontSize: 12.5,
  },
  peopleJoined: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
    marginTop: 'auto',
  },
});
