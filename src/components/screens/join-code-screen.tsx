import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { PrimaryButton } from '@/components/ui/buttons';
import { CodeDigitBoxes } from '@/components/ui/code-digit-boxes';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

const CODE_LENGTH = 6;
// Visual sample only - there is no backend for discovering who else is in a
// not-yet-joined session, so this row is illustrative, matching the mockup.
const SAMPLE_PARTICIPANTS = ['Anna Brown', 'Lucas Martin', 'James Smith', 'Tran Hung', 'Maria Chen'];

type Props = {
  onBack: () => void;
  onScanQrInstead: () => void;
};

export function JoinCodeScreen({ onBack, onScanQrInstead }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const handleKeyPress = (key: string) => {
    setMessage('');
    setCode((prev) => (prev.length >= CODE_LENGTH ? prev : prev + key));
  };

  const handleBackspace = () => {
    setMessage('');
    setCode((prev) => prev.slice(0, -1));
  };

  const handleJoin = () => {
    setMessage(t('codeJoinComingSoon'));
  };

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
        <Text style={[styles.headerTitle, { color: theme.primary }]}>{t('joinWithCode')}</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={[styles.instruction, { color: theme.text }]}>{t('enterSixDigit')}</Text>

      <CodeDigitBoxes value={code} length={CODE_LENGTH} />

      <PrimaryButton label={t('joinSession')} onPress={handleJoin} disabled={code.length < CODE_LENGTH} />

      {message ? <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text> : null}

      <View style={[styles.peopleCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.peopleHeader}>
          <Text style={[styles.peopleTitle, { color: theme.text }]}>{t('peopleInSession')}</Text>
          <Text style={[styles.peopleCount, { color: theme.textSecondary }]}>
            {SAMPLE_PARTICIPANTS.length} / 20
          </Text>
        </View>
        <View style={styles.avatarRow}>
          {SAMPLE_PARTICIPANTS.map((name, i) => (
            <View key={name} style={i > 0 && styles.avatarOverlap}>
              <Avatar name={name} size={32} />
            </View>
          ))}
        </View>
      </View>

      <NumericKeypad onKeyPress={handleKeyPress} onBackspace={handleBackspace} />

      <Pressable onPress={onScanQrInstead} style={styles.scanInsteadRow}>
        <Text style={[styles.scanInsteadText, { color: theme.primary }]}>{t('scanQrInstead')}</Text>
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
  message: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  peopleCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  peopleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  peopleCount: {
    fontSize: 13,
  },
  avatarRow: {
    flexDirection: 'row',
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  scanInsteadRow: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 8,
  },
  scanInsteadText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
