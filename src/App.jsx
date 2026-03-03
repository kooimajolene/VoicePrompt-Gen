import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Eraser,
  LoaderCircle,
  Mic,
  Sparkles,
  Square,
  Waves,
} from 'lucide-react';

const STATUS_META = {
  idle: {
    label: '空闲',
    tone: 'bg-cream-card text-cocoa',
  },
  listening: {
    label: '录音中',
    tone: 'bg-blush text-cocoa',
  },
  processing: {
    label: '处理中',
    tone: 'bg-butter text-cocoa',
  },
  unsupported: {
    label: '当前浏览器不支持',
    tone: 'bg-cream-card text-cocoa/70',
  },
};

const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
];

const STORAGE_KEYS = {
  transcript: 'voiceprompt_gen_transcript',
  prompt: 'voiceprompt_gen_prompt',
  language: 'voiceprompt_gen_language',
};

function App() {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState(() => localStorage.getItem(STORAGE_KEYS.transcript) || '');
  const [prompt, setPrompt] = useState(() => localStorage.getItem(STORAGE_KEYS.prompt) || '');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [modelName, setModelName] = useState('deepseek-chat');
  const [recognitionLang, setRecognitionLang] = useState(
    () => localStorage.getItem(STORAGE_KEYS.language) || 'zh-CN',
  );

  const recognitionRef = useRef(null);
  const transcriptPanelRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const transcriptRef = useRef('');
  const shouldOptimizeOnEndRef = useRef(false);
  const shouldKeepListeningRef = useRef(false);
  const restartTimerRef = useRef(null);

  const handleOptimize = async (sourceText = transcript) => {
    const normalizedText = sourceText.trim();

    if (!normalizedText) {
      return;
    }

    setStatus('processing');
    setError('');

    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: normalizedText,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(data.error || `优化失败，请稍后再试。HTTP ${response.status}`);
      }

      if (!data.prompt) {
        throw new Error('接口返回成功，但没有生成 Prompt 内容。');
      }

      setPrompt(data.prompt);
      setModelName(data.model || 'deepseek-chat');
    } catch (requestError) {
      setPrompt('');
      setError(requestError instanceof Error ? requestError.message : '优化失败，请稍后再试。');
    } finally {
      setStatus('idle');
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus('unsupported');
      setError('当前浏览器未提供 Web Speech API，建议使用最新版 Chrome。');
      return;
    }

    setSpeechSupported(true);

    const recognition = new SpeechRecognition();
    recognition.lang = recognitionLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus('listening');
      setError('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current}${text} `;
        } else {
          interimTranscript += text;
        }
      }

      const nextTranscript = `${finalTranscriptRef.current}${interimTranscript}`.trim();
      transcriptRef.current = nextTranscript;
      setTranscript(nextTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldKeepListeningRef.current = false;
        shouldOptimizeOnEndRef.current = false;
        setStatus('idle');
        setError('麦克风权限被拒绝。请在浏览器地址栏打开麦克风权限后重试。');
        return;
      }

      if (event.error === 'audio-capture') {
        shouldKeepListeningRef.current = false;
        setStatus('idle');
        setError('没有检测到可用麦克风。请检查系统输入设备。');
        return;
      }

      if (event.error === 'no-speech') {
        setError('没有识别到语音。请确认说话语言与“识别语言”一致，并检查麦克风输入设备。');
        return;
      }

      setStatus('idle');
      setError(`语音识别失败：${event.error}`);
    };

    recognition.onend = async () => {
      if (shouldOptimizeOnEndRef.current) {
        shouldOptimizeOnEndRef.current = false;
        shouldKeepListeningRef.current = false;
        await handleOptimize(transcriptRef.current);
        return;
      }

      if (shouldKeepListeningRef.current) {
        restartTimerRef.current = window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setStatus('idle');
          }
        }, 150);
        return;
      }

      setStatus('idle');
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      shouldOptimizeOnEndRef.current = false;
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [recognitionLang]);

  useEffect(() => {
    if (!transcriptPanelRef.current) {
      return;
    }

    transcriptPanelRef.current.scrollTop = transcriptPanelRef.current.scrollHeight;
  }, [transcript]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.transcript, transcript);
  }, [transcript]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.prompt, prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, recognitionLang);
  }, [recognitionLang]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const statusMeta = STATUS_META[speechSupported ? status : 'unsupported'];
  const hasTranscript = transcript.trim().length > 0;

  const startRecording = async () => {
    if (!recognitionRef.current || status === 'listening' || status === 'processing') {
      return;
    }

    try {
      await navigator.mediaDevices?.getUserMedia?.({ audio: true });
    } catch {
      setError('无法访问麦克风。请检查浏览器权限和系统麦克风设置。');
      return;
    }

    transcriptRef.current = transcript;
    finalTranscriptRef.current = transcript ? `${transcript} ` : '';
    shouldOptimizeOnEndRef.current = false;
    shouldKeepListeningRef.current = true;
    setPrompt('');
    setError('');

    try {
      recognitionRef.current.start();
    } catch {
      setError('录音启动失败。请稍后重试，或刷新页面后再试。');
      shouldKeepListeningRef.current = false;
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current || status !== 'listening') {
      return;
    }

    shouldKeepListeningRef.current = false;
    shouldOptimizeOnEndRef.current = true;
    recognitionRef.current.stop();
  };

  const clearAll = () => {
    if (recognitionRef.current && status === 'listening') {
      shouldKeepListeningRef.current = false;
      shouldOptimizeOnEndRef.current = false;
      recognitionRef.current.stop();
    }

    finalTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    setPrompt('');
    setError('');
    setCopied(false);
    setStatus(speechSupported ? 'idle' : 'unsupported');
    localStorage.removeItem(STORAGE_KEYS.transcript);
    localStorage.removeItem(STORAGE_KEYS.prompt);
  };

  const copyPrompt = async () => {
    if (!prompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch (clipboardError) {
      const message = clipboardError instanceof Error ? clipboardError.message : '未知错误';
      setError(`复制失败：${message}`);
    }
  };

  const handleTranscriptChange = (event) => {
    const nextTranscript = event.target.value;
    transcriptRef.current = nextTranscript;
    finalTranscriptRef.current = nextTranscript ? `${nextTranscript} ` : '';
    setTranscript(nextTranscript);
  };

  const handleLanguageChange = (event) => {
    const nextLang = event.target.value;

    if (status === 'listening' && recognitionRef.current) {
      shouldKeepListeningRef.current = false;
      shouldOptimizeOnEndRef.current = false;
      recognitionRef.current.stop();
      setStatus('idle');
    }

    setRecognitionLang(nextLang);
    setError('');
  };

  return (
    <div className="panel-grid min-h-screen px-6 py-6 text-cocoa">
      <div className="background-art" />
      <div className="ambient-blob ambient-blob-left" />
      <div className="ambient-blob ambient-blob-right" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1600px] flex-col overflow-hidden rounded-[36px] border-[3px] border-cocoa/75 bg-cream-main/62 shadow-panel backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/30 to-transparent" />

        <header className="relative flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-cocoa/60 bg-cream-soft/58 px-8 py-5 backdrop-blur-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cocoa/50">
              VoicePrompt-Gen
            </p>
            <h1 className="title-pop mt-2 text-[2.2rem] font-extrabold leading-none tracking-[0.04em] text-cocoa-soft md:text-[2.7rem]">
              语音转 Prompt 工作台
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`rounded-full border-[3px] border-cocoa/80 px-4 py-2 text-sm font-bold shadow-chip ${statusMeta.tone}`}>
              {status === 'processing' ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {statusMeta.label}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Waves className="h-4 w-4" />
                  {statusMeta.label}
                </span>
              )}
            </div>

            <label className="inline-flex items-center gap-2 rounded-full border-[3px] border-cocoa/80 bg-cream-card px-4 py-3 text-sm font-bold text-cocoa shadow-chip">
              <span>识别语言</span>
              <select
                value={recognitionLang}
                onChange={handleLanguageChange}
                disabled={status === 'processing'}
                className="bg-transparent text-sm outline-none"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={clearAll}
              disabled={status === 'processing'}
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-cocoa/80 bg-cream-card px-5 py-3 text-sm font-bold text-cocoa shadow-chip transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eraser className="h-4 w-4" />
              清空
            </button>

            <button
              type="button"
              onClick={status === 'listening' ? stopRecording : startRecording}
              disabled={!speechSupported || status === 'processing'}
              className="inline-flex items-center gap-2 rounded-full border-[3px] border-cocoa/80 bg-cocoa px-5 py-3 text-sm font-bold text-cream-main shadow-chip transition hover:-translate-y-0.5 hover:bg-cocoa-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'listening' ? (
                <>
                  <Square className="h-4 w-4" />
                  停止录音
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  开始录音
                </>
              )}
            </button>
          </div>
        </header>

        <main className="grid flex-1 gap-0 lg:grid-cols-2">
          <section className="relative flex min-h-[420px] flex-col border-b-[3px] border-cocoa/60 bg-cocoa/86 lg:border-b-0 lg:border-r-[3px] backdrop-blur-sm">
            <div className="flex items-center justify-between border-b-[3px] border-cocoa/60 bg-cocoa/88 px-6 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cream-main/55">
                  Raw Input
                </p>
                <h2 className="subtitle-pop mt-2 text-[1.4rem] font-bold text-cream-main">
                  实时语音转录 / 文本输入
                </h2>
              </div>
              <div className="rounded-full border-[3px] border-cream-main/25 bg-cocoa-soft px-3 py-1 text-xs font-bold text-cream-main/70">
                Web Speech API
              </div>
            </div>

            <div className="absolute inset-0 top-[81px] opacity-10">
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_28%)]" />
            </div>

            <div ref={transcriptPanelRef} className="relative flex-1 overflow-y-auto px-6 py-6">
              <textarea
                value={transcript}
                onChange={handleTranscriptChange}
                placeholder="点击顶部按钮开始录音，或直接在这里输入需求。请先确认“识别语言”与你说话的语言一致。"
                className="min-h-[320px] w-full resize-none rounded-[28px] border-[3px] border-cream-main/20 bg-cocoa-soft/80 px-5 py-5 font-mono text-[15px] leading-7 text-cream-main outline-none placeholder:text-cream-main/40"
              />
            </div>
          </section>

          <section className="relative flex min-h-[420px] flex-col bg-cream-main/42 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-cocoa/60 bg-cream-soft/46 px-6 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cocoa/45">
                  AI Refined
                </p>
                <h2 className="subtitle-pop mt-2 text-[1.4rem] font-bold text-cocoa">
                  Vibe Coding Prompt
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border-[3px] border-cocoa/80 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cocoa/70 shadow-chip">
                  {modelName}
                </div>

                <button
                  type="button"
                  onClick={() => handleOptimize()}
                  disabled={status === 'processing' || !hasTranscript}
                  className="inline-flex items-center gap-2 rounded-full border-[3px] border-cocoa/80 bg-mint px-4 py-2 text-sm font-bold text-cocoa shadow-chip transition hover:-translate-y-0.5 hover:bg-mint-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  一键优化
                </button>

                <button
                  type="button"
                  onClick={copyPrompt}
                  disabled={!prompt}
                  className="inline-flex items-center gap-2 rounded-full border-[3px] border-cocoa/80 bg-white/75 px-4 py-2 text-sm font-bold text-cocoa shadow-chip transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? '已复制' : '复制到剪贴板'}
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-6 py-6">
              <div className="absolute right-6 top-5 h-20 w-20 rounded-full bg-mint/45 blur-2xl" />
              <div className="absolute bottom-8 left-10 h-16 w-16 rounded-full bg-butter/55 blur-2xl" />

              <div className="relative min-h-full rounded-[28px] border-[3px] border-cocoa/75 bg-white/48 p-5 shadow-inner-soft backdrop-blur-sm">
                {prompt ? (
                  <pre className="whitespace-pre-wrap break-words text-[15px] leading-7 text-cocoa">
                    {prompt}
                  </pre>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-center text-cocoa/45">
                    停止录音后会自动生成 Prompt，你也可以手动点击“一键优化”调用 DeepSeek 模型。
                  </div>
                )}
              </div>

              {error ? (
                <div className="relative mt-4 rounded-[22px] border-[3px] border-cocoa/80 bg-blush px-4 py-3 text-sm font-medium text-cocoa shadow-chip">
                  {error}
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
