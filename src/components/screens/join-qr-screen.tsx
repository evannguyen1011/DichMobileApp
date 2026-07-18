import { CameraView } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HintBanner } from '@/components/ui/hint-banner';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

type Props = {
  onBack: () => void;
  onScanned: (data: string) => void;
  statusMessage?: string;
};

const CORNER_SIZE = 28;

export function JoinQrScreen({ onBack, onScanned, statusMessage }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const [torchOn, setTorchOn] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            tintColor={theme.primary}
            size={22}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>{t('joinWithQr')}</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={[styles.instruction, { color: theme.text }]}>{t('scanQrInstruction')}</Text>

      <HintBanner
        icon={{ ios: 'wifi', android: 'wifi', web: 'wifi' }}
        body={t('makeSureSameWifi')}
      />

      <View style={styles.scannerBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result) => onScanned(result.data)}
        />
        <View style={styles.frame} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.cornerTopRight, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: theme.primary }]} />
          <View style={[styles.corner, styles.cornerBottomRight, { borderColor: theme.primary }]} />
        </View>
      </View>

      <View style={styles.lockRow}>
        <SymbolView
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          tintColor={theme.textSecondary}
          size={14}
        />
        <Text style={[styles.lockText, { color: theme.textSecondary }]}>{t('onlyDiscoverableLan')}</Text>
      </View>

      {statusMessage ? (
        <Text style={[styles.status, { color: theme.textSecondary }]}>{statusMessage}</Text>
      ) : null}

      <Pressable style={styles.flashRow} onPress={() => setTorchOn((v) => !v)}>
        <SymbolView
          name={{ ios: torchOn ? 'bolt.fill' : 'bolt.slash', android: 'flash_on', web: 'flash_on' }}
          tintColor={theme.textSecondary}
          size={18}
        />
        <Text style={[styles.flashText, { color: theme.textSecondary }]}>
          {torchOn ? t('tapToTurnOffFlash') : t('tapToTurnOnFlash')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
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
  scannerBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  frame: {
    position: 'absolute',
    top: 32,
    left: 32,
    right: 32,
    bottom: 32,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
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
  status: {
    fontSize: 13,
    textAlign: 'center',
  },
  flashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingVertical: 16,
  },
  flashText: {
    fontSize: 13,
  },
});
