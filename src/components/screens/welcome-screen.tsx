import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { HintBanner } from '@/components/ui/hint-banner';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';

type Props = {
  nameInput: string;
  onNameChange: (name: string) => void;
  onJoinQr: () => void;
  onJoinCode: () => void;
  onPresenter: () => void;
  onSolo: () => void;
  onOpenHistory: () => void;
  statusMessage?: string;
};

export function WelcomeScreen({
  nameInput,
  onNameChange,
  onJoinQr,
  onJoinCode,
  onPresenter,
  onSolo,
  onOpenHistory,
  statusMessage,
}: Props) {
  const theme = useTheme();
  const { t, lang, setLang } = useI18n();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Pressable
        style={[styles.historyIcon, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpenHistory}
        hitSlop={8}
      >
        <SymbolView
          name={{ ios: 'clock', android: 'history', web: 'history' }}
          tintColor={theme.textSecondary}
          size={18}
        />
      </Pressable>

      <Pressable
        style={[styles.languageIcon, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setLang(lang === 'en' ? 'vi' : 'en')}
        hitSlop={8}
      >
        <SymbolView
          name={{ ios: 'globe', android: 'language', web: 'language' }}
          tintColor={theme.textSecondary}
          size={18}
        />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.hero}>
        <View style={styles.logoStack}>
          <View style={[styles.logoHalo, { backgroundColor: theme.primarySoft }]} />
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              tintColor="#FFFFFF"
              size={34}
            />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{t('welcomeTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('welcomeSubtitle')}</Text>
      </View>

      <HintBanner
        icon={{ ios: 'wifi', android: 'wifi', web: 'wifi' }}
        title={t('sameWifiTitle')}
        body={t('sameWifiBody')}
        trailingIcon={{ ios: 'checkmark.shield.fill', android: 'verified', web: 'verified' }}
      />

      <TextInput
        style={[styles.nameInput, { borderColor: theme.border, color: theme.text }]}
        value={nameInput}
        onChangeText={onNameChange}
        placeholder={t('displayName')}
        placeholderTextColor={theme.textSecondary}
      />

      <View style={styles.buttonGroup}>
        <PrimaryButton
          label={t('joinWithQr')}
          onPress={onJoinQr}
          icon={{ ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }}
        />
        <SecondaryButton
          label={t('joinWithCode')}
          onPress={onJoinCode}
          icon={{ ios: 'square.grid.3x3.fill', android: 'dialpad', web: 'dialpad' }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>{t('or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <SecondaryButton
          label={t('imPresenter')}
          onPress={onPresenter}
          icon={{ ios: 'person.wave.2.fill', android: 'record_voice_over', web: 'record_voice_over' }}
        />
      </View>

      <GhostButton label={t('soloMode')} onPress={onSolo} style={styles.soloButton} />

      {statusMessage ? (
        <Text style={[styles.status, { color: theme.textSecondary }]}>{statusMessage}</Text>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  logoStack: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoHalo: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  buttonGroup: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
  },
  soloButton: {
    alignSelf: 'center',
  },
  status: {
    fontSize: 13,
    textAlign: 'center',
  },
  languageIcon: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
