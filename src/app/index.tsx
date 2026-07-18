import { useEffect, useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { onTranslateTask } from 'expo-translate-text';
import { Platform } from 'react-native';
import { Waveform } from '@/components/waveform';

/**
 * Spike: validates the "stream raw EN text immediately, batch-translate to VI at a
 * sentence/word-count boundary" pipeline using stock APIs (SpeechRecognizer via
 * expo-speech-recognition + ML Kit Translate via expo-translate-text), before investing
 * in a custom sherpa-onnx + Qwen stack.
 */

const WATCHDOG_WORD_THRESHOLD = 25;
const WATCHDOG_TIMEOUT_MS = 9000;
const RESTART_DELAY_AFTER_END_MS = 0;

type Lang = 'en' | 'vi';
type LogEntry = {
  id: number;
  sourceLang: Lang;
  targetLang: Lang;
  source: string;
  translated: string;
};

export default function HomeScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [partialText, setPartialText] = useState('');
  const [draftTranslated, setDraftTranslated] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);

  const isRunningRef = useRef(false);
  const useOnDeviceRef = useRef(true);
  // Best-effort guess of who's currently talking; updated by the native 'languagedetection'
  // event. Only actually switches mid-session on Android 14+ on-device recognition - see
  // startSegment() below.
  const currentSourceLangRef = useRef<Lang>('en');
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTriggeredRef = useRef(false);
  const translateChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const logIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const volumeLevel = useSharedValue(0);
  // Some recognizer implementations never emit isFinal=true, even after stop() -
  // they just go straight to 'end'. Track the latest partial so 'end' can promote it.
  const lastPartialRef = useRef('');

  // Local-agreement incremental translation: the prefix that's stayed identical across
  // consecutive partial hypotheses is treated as "confirmed" and translated+locked; only
  // the still-changing tail is retranslated as a cheap draft. Reset per utterance.
  const stableWordsRef = useRef<string[]>([]);
  const stableTranslatedRef = useRef('');
  const tentativeTranslatedRef = useRef('');
  const previousPartialWordsRef = useRef<string[]>([]);
  const lastTentativeThrottleRef = useRef(0);

  // Pre-warm the ML Kit EN->VI model once at startup so the first real segment doesn't stall.
  // Goes through translateChainRef so it can't race with a real segment's translate call -
  // expo-translate-text throws TRANSLATION_IN_PROGRESS on overlapping calls.
  useEffect(() => {
    translateChainRef.current = translateChainRef.current
      .then(() =>
        onTranslateTask({
          input: 'hello',
          sourceLangCode: 'en',
          targetLangCode: 'vi',
          // expo-translate-text forwards every field as-is to the native bridge, and the
          // Android side chokes converting an `undefined` value to its Kotlin Map<String, Any> -
          // so every field must be given a concrete value, not omitted.
          preferredStrategy: 'lowLatency',
          requiresWifi: false,
          requireCharging: false,
        })
      )
      .then(() => setStatus('San sang. Nhan Start de bat dau.'))
      .catch((error: any) => setStatus(`Loi tai model dich: ${error?.message ?? error}`));

    if (Platform.OS === 'android') {
      for (const locale of ['en-US', 'vi-VN']) {
        ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale }).catch(() => {
          // Best-effort only; start() will still fall back to the network recognizer.
        });
      }
    }
  }, []);

  const clearWatchdog = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  const forceCheckpoint = () => {
    if (!isRunningRef.current || watchdogTriggeredRef.current) return;
    console.log('[LiveTranslate] forceCheckpoint -> stop()');
    watchdogTriggeredRef.current = true;
    ExpoSpeechRecognitionModule.stop();
  };

  const armWatchdog = () => {
    clearWatchdog();
    watchdogTriggeredRef.current = false;
    watchdogTimerRef.current = setTimeout(() => {
      console.log('[LiveTranslate] watchdog: timeout reached, forcing checkpoint');
      forceCheckpoint();
    }, WATCHDOG_TIMEOUT_MS);
  };

  const startSegment = () => {
    armWatchdog();
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      // Keeps the recognizer alive across natural pauses instead of stopping after every
      // isFinal result - avoids the stop()->start() dead zone that was dropping words right
      // at the cut point. We still restart manually when our own watchdog forces a stop().
      continuous: true,
      requiresOnDeviceRecognition: useOnDeviceRef.current,
      androidIntentOptions: {
        // Silence thresholds - loose enough that a mid-sentence breath pause doesn't
        // get mistaken for the end of a thought (these extras may be ignored entirely
        // by the network recognizer; the JS watchdog above is the real backstop).
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 900,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 700,
        // Auto-detect EN vs VI mid-session and switch the recognizer language.
        // Android 14+ only, requires the "com.google.android.as" on-device service with
        // both en-US and vi-VN offline packs downloaded - falls back to fixed EN-only
        // detection (no effect) on older Android or the network recognizer.
        EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        EXTRA_ENABLE_LANGUAGE_SWITCH: 'balanced',
        EXTRA_LANGUAGE_SWITCH_ALLOWED_LANGUAGES: ['en-US', 'vi-VN'],
        EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: ['en-US', 'vi-VN'],
      },
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 100,
      },
    });
  };

  const restartSegment = () => {
    if (!isRunningRef.current) return;
    setTimeout(() => {
      if (isRunningRef.current) startSegment();
    }, RESTART_DELAY_AFTER_END_MS);
  };

  const resetIncrementalTranslation = () => {
    stableWordsRef.current = [];
    stableTranslatedRef.current = '';
    tentativeTranslatedRef.current = '';
    previousPartialWordsRef.current = [];
    setDraftTranslated('');
  };

  const updateDraftDisplay = () => {
    setDraftTranslated(`${stableTranslatedRef.current} ${tentativeTranslatedRef.current}`.trim());
  };

  // Best-effort draft translation for a chunk of the in-progress utterance. Failures are
  // silently ignored - the confident translate in finalizeSegment is what actually counts.
  const translateDraftChunk = (chunkText: string, kind: 'stable' | 'tentative') => {
    if (!chunkText.trim()) return;
    const sourceLang = currentSourceLangRef.current;
    const targetLang: Lang = sourceLang === 'vi' ? 'en' : 'vi';
    translateChainRef.current = translateChainRef.current
      .then(() =>
        onTranslateTask({
          input: chunkText,
          sourceLangCode: sourceLang,
          targetLangCode: targetLang,
          preferredStrategy: 'lowLatency',
          requiresWifi: false,
          requireCharging: false,
        })
      )
      .then((result) => {
        const translated = Array.isArray(result.translatedTexts)
          ? result.translatedTexts.join(' ')
          : String(result.translatedTexts);
        if (kind === 'stable') {
          stableTranslatedRef.current = translated;
        } else {
          tentativeTranslatedRef.current = translated;
        }
        updateDraftDisplay();
      })
      .catch(() => {});
  };

  const queueTranslate = (
    entryId: number,
    text: string,
    sourceLang: Lang,
    targetLang: Lang
  ) => {
    console.log(`[LiveTranslate] queueTranslate: enqueue id=${entryId} ${sourceLang}->${targetLang}`);
    translateChainRef.current = translateChainRef.current
      .then(() =>
        onTranslateTask({
          input: text,
          sourceLangCode: sourceLang,
          targetLangCode: targetLang,
          preferredStrategy: 'lowLatency',
          requiresWifi: false,
          requireCharging: false,
        })
      )
      .then((result) => {
        const translated = Array.isArray(result.translatedTexts)
          ? result.translatedTexts.join(' ')
          : String(result.translatedTexts);
        console.log(`[LiveTranslate] translate OK id=${entryId} -> "${translated}"`);
        setLog((prev) =>
          prev.map((e) => (e.id === entryId ? { ...e, translated } : e))
        );
      })
      .catch((error: any) => {
        console.log(`[LiveTranslate] translate FAILED id=${entryId}: ${error?.code ?? ''} ${error?.message ?? error}`);
        setLog((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, translated: `[loi dich: ${error?.message ?? error}]` }
              : e
          )
        );
      });
  };

  const finalizeSegment = (text: string) => {
    setPartialText('');
    resetIncrementalTranslation();
    if (!text.trim()) {
      console.log('[LiveTranslate] finalizeSegment: blank text, skipping');
      return;
    }
    const id = ++logIdRef.current;
    console.log(`[LiveTranslate] finalizeSegment: id=${id} text="${text}"`);
    const sourceLang = currentSourceLangRef.current;
    const targetLang: Lang = sourceLang === 'vi' ? 'en' : 'vi';
    setLog((prev) => [
      ...prev,
      { id, sourceLang, targetLang, source: text, translated: '...dang dich...' },
    ]);
    queueTranslate(id, text, sourceLang, targetLang);
  };

  useSpeechRecognitionEvent('start', () => {
    console.log('[LiveTranslate] event: start');
    setStatus('Dang nghe...');
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('[LiveTranslate] event: end');
    clearWatchdog();
    volumeLevel.value = withTiming(0, { duration: 300 });
    if (lastPartialRef.current.trim()) {
      console.log(`[LiveTranslate] end: promoting last partial to final: "${lastPartialRef.current}"`);
      finalizeSegment(lastPartialRef.current);
      lastPartialRef.current = '';
    }
    restartSegment();
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    // event.value ranges roughly -2 (inaudible) to 10; normalize to 0..1.
    const normalized = Math.max(0, Math.min(1, (event.value + 2) / 12));
    volumeLevel.value = withTiming(normalized, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    console.log(
      `[LiveTranslate] result isFinal=${event.isFinal} len=${text.length} text="${text}"`
    );
    if (event.isFinal) {
      lastPartialRef.current = '';
      finalizeSegment(text);
      return;
    }
    // Some results come back blank mid-session (e.g. around a language switch) - ignore
    // those rather than clobbering the last good transcript we're buffering for 'end'.
    if (!text.trim()) {
      return;
    }
    setPartialText(text);
    lastPartialRef.current = text;

    const words = text.trim().split(/\s+/).filter(Boolean);
    const prevWords = previousPartialWordsRef.current;
    let commonLen = 0;
    while (
      commonLen < words.length &&
      commonLen < prevWords.length &&
      words[commonLen] === prevWords[commonLen]
    ) {
      commonLen++;
    }
    previousPartialWordsRef.current = words;

    if (commonLen > stableWordsRef.current.length) {
      stableWordsRef.current = words.slice(0, commonLen);
      translateDraftChunk(stableWordsRef.current.join(' '), 'stable');
    }

    const tentativeWords = words.slice(stableWordsRef.current.length);
    const now = Date.now();
    if (tentativeWords.length > 0 && now - lastTentativeThrottleRef.current > 400) {
      lastTentativeThrottleRef.current = now;
      translateDraftChunk(tentativeWords.join(' '), 'tentative');
    }

    const wordCount = words.length;
    if (wordCount >= WATCHDOG_WORD_THRESHOLD) {
      console.log(`[LiveTranslate] watchdog: word count ${wordCount} >= threshold, forcing checkpoint`);
      forceCheckpoint();
    }
  });

  useSpeechRecognitionEvent('languagedetection', (event) => {
    console.log(
      `[LiveTranslate] event: languagedetection detected=${event.detectedLanguage} confidence=${event.confidence}`
    );
    const lang: Lang = event.detectedLanguage.toLowerCase().startsWith('vi') ? 'vi' : 'en';
    currentSourceLangRef.current = lang;
    setStatus(
      `Dang nghe (${lang === 'vi' ? 'Tieng Viet' : 'English'}, ${Math.round(
        event.confidence * 100
      )}%)...`
    );
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log(`[LiveTranslate] event: error code=${event.error} message=${event.message}`);
    // On-device pack missing -> fall back to the network recognizer so the demo still works.
    if (
      useOnDeviceRef.current &&
      (event.error === 'language-not-supported' || event.error === 'service-not-allowed')
    ) {
      useOnDeviceRef.current = false;
      setStatus('Khong co goi offline, chuyen sang online...');
      return;
    }
    setStatus(`Loi: ${event.error} - ${event.message}`);
  });

  const onToggle = async () => {
    if (isRunning) {
      isRunningRef.current = false;
      setIsRunning(false);
      clearWatchdog();
      ExpoSpeechRecognitionModule.stop();
      setStatus('Da dung.');
      setPartialText('');
      resetIncrementalTranslation();
      volumeLevel.value = withTiming(0, { duration: 300 });
      return;
    }

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus('Chua duoc cap quyen microphone.');
      return;
    }

    isRunningRef.current = true;
    setIsRunning(true);
    startSegment();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.statusText}>{status}</Text>

        <Button
          title={isRunning ? 'Stop' : 'Start listening'}
          onPress={onToggle}
        />

        <Waveform volume={volumeLevel} />

        <View style={styles.divider} />

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {log.map((entry) => (
            <View key={entry.id} style={styles.logEntry}>
              <Text style={styles.logSource}>
                {entry.sourceLang.toUpperCase()}: {entry.source}
              </Text>
              <Text style={styles.logTranslated}>
                {entry.targetLang.toUpperCase()}: {entry.translated}
              </Text>
            </View>
          ))}
          {partialText.length > 0 && (
            <View style={styles.logEntry}>
              <Text style={styles.partialText}>{partialText}</Text>
              {draftTranslated.length > 0 && (
                <Text style={styles.draftTranslated}>{draftTranslated}</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#121212',
  },
  statusText: {
    fontSize: 14,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  logEntry: {
    marginBottom: 12,
  },
  logSource: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  logTranslated: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  partialText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#BBBBBB',
  },
  draftTranslated: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#5B9BD5',
  },
});
