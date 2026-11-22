import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechLanguage = 'ar-EG' | 'ar-SA' | 'en-US';
type RecognitionErrorEvent = Event & { error?: string; message?: string };
type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative };
type SpeechResultEvent = Event & { resultIndex: number; results: ArrayLike<SpeechResult> };
type NativeRecognition = {
  lang: string; continuous: boolean; interimResults: boolean; processLocally?: boolean;
  onstart: (() => void) | null; onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';
type SpeechConstructor = { new(): NativeRecognition; available?: (options: { langs: string[]; processLocally?: boolean }) => Promise<Availability>; install?: (options: { langs: string[] }) => Promise<boolean> };
type SpeechWindow = Window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };

function removeRepeatedPrefix(previous: string, incoming: string) {
  const previousWords = previous.trim().split(/\s+/);
  const nextWords = incoming.trim().split(/\s+/);
  const normalize = (word: string) => word.toLocaleLowerCase().replace(/[.,!?،؛:]+$/u, '');
  for (let overlap = Math.min(previousWords.length, nextWords.length, 20); overlap > 0; overlap--) {
    const a = previousWords.slice(-overlap).map(normalize);
    const b = nextWords.slice(0, overlap).map(normalize);
    if (a.every((word, index) => word === b[index])) return nextWords.slice(overlap).join(' ');
  }
  return incoming;
}

export function useSpeechRecognition(language: SpeechLanguage, localOnly = false) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [availability, setAvailability] = useState<Availability | 'unsupported' | 'checking'>('unsupported');
  const recognition = useRef<NativeRecognition | null>(null);
  const constructor = useRef<SpeechConstructor | undefined>(undefined);
  const desired = useRef(false);
  const localMode = useRef(localOnly);
  const lang = useRef(language);
  const accumulated = useRef('');
  const finalRef = useRef('');
  const lastChunk = useRef('');
  const skipDuplicate = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const stopWaiters = useRef<Array<() => void>>([]);
  lang.current = language;
  localMode.current = localOnly;

  useEffect(() => { constructor.current = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition; setSupported(Boolean(constructor.current)); }, []);
  useEffect(() => { if (!listening) return; timer.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500); return () => window.clearInterval(timer.current); }, [listening]);

  const launch = useCallback(() => {
    if (!desired.current || !constructor.current) return;
    try {
      const instance = new constructor.current(); recognition.current = instance;
      instance.lang = lang.current; instance.continuous = true; instance.interimResults = true;
      if (localMode.current && 'processLocally' in instance) instance.processLocally = true;
      instance.onstart = () => { setListening(true); setPaused(false); setError(''); };
      instance.onresult = event => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index]; const text = result?.[0]?.transcript?.trim();
          if (!text) continue;
          if (result.isFinal) {
            const committed = skipDuplicate.current ? removeRepeatedPrefix(accumulated.current, text) : text;
            skipDuplicate.current = false;
            if (!committed) continue;
            accumulated.current = `${accumulated.current}${accumulated.current ? ' ' : ''}${committed}`;
            lastChunk.current = committed; finalRef.current = accumulated.current; setFinalTranscript(accumulated.current);
          } else interim += `${interim ? ' ' : ''}${text}`;
        }
        setInterimTranscript(interim);
      };
      instance.onerror = event => { if (event.error === 'no-speech') return; setError(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'تم رفض الوصول إلى الميكروفون أو التعرف الصوتي.' : event.error === 'network' ? 'تعذر على المتصفح الوصول إلى خدمة التعرف الصوتي.' : `خطأ في التعرف الصوتي: ${event.error || 'غير معروف'}`); };
      instance.onend = () => {
        setInterimTranscript(''); recognition.current = null;
        if (desired.current) { skipDuplicate.current = Boolean(lastChunk.current); window.setTimeout(launch, 300); }
        else { setListening(false); stopWaiters.current.splice(0).forEach(resolve => resolve()); }
      };
      instance.start();
    } catch (e) { desired.current = false; setListening(false); setError(e instanceof Error ? e.message : 'تعذر بدء التعرف الصوتي.'); }
  }, []);

  const start = useCallback((initial = '') => {
    if (!constructor.current) { setError('التعرف الصوتي غير مدعوم في هذا المتصفح. يمكنك كتابة الإجابة يدوياً.'); return; }
    if (desired.current) return;
    accumulated.current = initial.trim(); finalRef.current = accumulated.current; lastChunk.current = ''; skipDuplicate.current = false;
    setFinalTranscript(accumulated.current); setInterimTranscript(''); setError(''); setElapsed(0); startedAt.current = Date.now(); desired.current = true; launch();
  }, [launch]);
  const pause = useCallback(async () => { if (!desired.current) return; desired.current = false; setPaused(true); setListening(false); recognition.current?.stop(); await new Promise<void>(resolve => { if (!recognition.current) resolve(); else stopWaiters.current.push(resolve); }); }, []);
  const resume = useCallback(() => { if (!constructor.current || desired.current) return; skipDuplicate.current = Boolean(lastChunk.current); desired.current = true; startedAt.current = Date.now() - elapsed * 1000; launch(); }, [elapsed, launch]);
  const finish = useCallback(async () => { desired.current = false; setPaused(false); recognition.current?.stop(); await new Promise<void>(resolve => { if (!recognition.current) resolve(); else stopWaiters.current.push(resolve); }); return finalRef.current; }, []);
  const clear = useCallback(() => { desired.current = false; recognition.current?.abort(); recognition.current = null; accumulated.current = ''; finalRef.current = ''; lastChunk.current = ''; skipDuplicate.current = false; setFinalTranscript(''); setInterimTranscript(''); setError(''); setPaused(false); setListening(false); setElapsed(0); stopWaiters.current.splice(0).forEach(resolve => resolve()); }, []);
  const checkAvailability = useCallback(async () => {
    if (!constructor.current?.available) { setAvailability('unsupported'); return 'unsupported' as const; }
    setAvailability('checking'); try { const state = await constructor.current.available({ langs: [lang.current], processLocally: true }); setAvailability(state); return state; } catch { setAvailability('unavailable'); return 'unavailable' as const; }
  }, []);
  const installLanguagePack = useCallback(async () => {
    if (!constructor.current?.install) return false;
    setAvailability('downloading'); try { const installed = await constructor.current.install({ langs: [lang.current] }); setAvailability(installed ? 'available' : 'unavailable'); return installed; } catch (e) { setAvailability('unavailable'); setError(e instanceof Error ? e.message : 'تعذر تثبيت حزمة اللغة.'); return false; }
  }, []);

  return { supported, listening, paused, interimTranscript, finalTranscript, setFinalTranscript, error, elapsed, availability, start, pause, resume, finish, clear, checkAvailability, installLanguagePack, supportsOnDevice: Boolean(constructor.current && 'processLocally' in constructor.current.prototype && constructor.current.available && constructor.current.install) };
}
