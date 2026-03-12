/**
 * useVoiceInput - Dual-mode voice-to-text hook
 *
 * MODE 1: "browser" - Web Speech API with low-latency interim results
 * MODE 2: "whisper" - MediaRecorder -> server transcription
 *
 * Both modes now expose `audioLevel` so the UI can render a live mic meter.
 */

import { useState, useRef, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useStreamingTranscription } from './useStreamingTranscription';

export type VoiceMode = 'browser' | 'whisper' | 'streaming';

interface UseVoiceInputOptions {
    onTranscript: (text: string) => void;
    onEnd?: (finalText: string) => void;
    lang?: string;
    continuous?: boolean;
    mode?: VoiceMode;
}

interface UseVoiceInputReturn {
    isListening: boolean;
    isSupported: boolean;
    start: () => void;
    toggle: () => void;
    stop: () => void;
    mode: VoiceMode;
    isTranscribing: boolean;
    error: string | null;
    latencyMs: number | null;
    audioLevel: number;
    /** Streaming mode only: interim (unstable) text */
    interimText: string;
    /** Streaming mode only: accumulated stable text */
    stableText: string;
    /** Streaming mode only: speech state */
    speechState: string;
    /** Streaming mode only: confidence 0-1 */
    confidence: number;
}

export function useVoiceInput({
    onTranscript,
    onEnd,
    lang = 'en-US',
    continuous = true,
    mode = 'browser',
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);

    const recognitionRef = useRef<any>(null);
    const finalTextRef = useRef('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const meterFrameRef = useRef<number | null>(null);

    const whisperTranscribe = useAction(api.domains.ai.whisperTranscribe.transcribe);

    // Streaming transcription (OpenAI Realtime via WebRTC)
    const streaming = useStreamingTranscription({
        onTranscript,
        onUtterance: onEnd,
        onEnd,
        lang: lang.split('-')[0],
    });

    const hasSpeechApi = typeof window !== 'undefined' &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasMediaRecorder = typeof window !== 'undefined' && !!window.MediaRecorder;
    const isSupported = mode === 'streaming'
        ? streaming.isSupported
        : mode === 'browser' ? hasSpeechApi : hasMediaRecorder;

    const stopAudioMeter = useCallback(() => {
        if (meterFrameRef.current !== null) {
            cancelAnimationFrame(meterFrameRef.current);
            meterFrameRef.current = null;
        }
        try {
            sourceRef.current?.disconnect();
        } catch {
            // Ignore disconnect issues from partially initialized nodes.
        }
        try {
            analyserRef.current?.disconnect();
        } catch {
            // Ignore disconnect issues from partially initialized nodes.
        }
        sourceRef.current = null;
        analyserRef.current = null;
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            void audioContextRef.current.close().catch(() => undefined);
        }
        audioContextRef.current = null;
        setAudioLevel(0);
    }, []);

    const stopMediaStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const startAudioMeter = useCallback(async (stream: MediaStream) => {
        if (typeof window === 'undefined') return;
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;

        stopAudioMeter();

        try {
            const ctx = new AudioContextCtor();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.82;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = ctx;
            analyserRef.current = analyser;
            sourceRef.current = source;

            const data = new Uint8Array(analyser.fftSize);
            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteTimeDomainData(data);

                let sumSquares = 0;
                for (let i = 0; i < data.length; i += 1) {
                    const normalized = (data[i] - 128) / 128;
                    sumSquares += normalized * normalized;
                }

                const rms = Math.sqrt(sumSquares / data.length);
                const boosted = Math.min(1, rms * 4.2);
                setAudioLevel((current) => Math.max(boosted, current * 0.72));
                meterFrameRef.current = requestAnimationFrame(updateLevel);
            };

            updateLevel();
        } catch {
            setAudioLevel(0);
        }
    }, [stopAudioMeter]);

    const stopBrowser = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        stopMediaStream();
        stopAudioMeter();
        setIsListening(false);
    }, [stopAudioMeter, stopMediaStream]);

    const toggleBrowser = useCallback(async () => {
        if (isListening) {
            stopBrowser();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        setError(null);
        finalTextRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            });
            streamRef.current = stream;
            await startAudioMeter(stream);
        } catch (err: any) {
            setError(err?.message || 'Microphone access denied');
            stopMediaStream();
            stopAudioMeter();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = 0; i < event.results.length; i += 1) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            finalTextRef.current = finalTranscript;
            onTranscript(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
            setIsListening(false);
            recognitionRef.current = null;
            stopMediaStream();
            stopAudioMeter();
            if (event?.error !== 'aborted') {
                setError(`Speech error: ${event?.error ?? 'unknown'}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
            stopMediaStream();
            stopAudioMeter();
            onEnd?.(finalTextRef.current);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            setIsListening(true);
        } catch (err: any) {
            recognitionRef.current = null;
            stopMediaStream();
            stopAudioMeter();
            setError(err?.message || 'Speech recognition failed to start');
            setIsListening(false);
        }
    }, [continuous, isListening, lang, onEnd, onTranscript, startAudioMeter, stopAudioMeter, stopBrowser, stopMediaStream]);

    const stopWhisper = useCallback(async () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
    }, []);

    const toggleWhisper = useCallback(async () => {
        if (isListening) {
            stopWhisper();
            return;
        }

        setError(null);
        setLatencyMs(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            });
            streamRef.current = stream;
            await startAudioMeter(stream);

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                stopMediaStream();
                stopAudioMeter();
                setIsListening(false);

                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = [];

                if (audioBlob.size < 1000) {
                    setError('No speech detected - try speaking louder or closer to the mic');
                    onTranscript('');
                    onEnd?.('');
                    return;
                }

                onTranscript('Transcribing...');
                setIsTranscribing(true);

                try {
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

                    const result = await whisperTranscribe({
                        audioBase64: base64,
                        mimeType: mimeType.split(';')[0],
                        language: lang.split('-')[0],
                    });

                    setLatencyMs(result.durationMs);
                    onTranscript(result.text);
                    onEnd?.(result.text);
                } catch (err: any) {
                    const msg = err?.message || 'Transcription failed';
                    setError(msg);
                    onTranscript('');
                    onEnd?.('');
                } finally {
                    setIsTranscribing(false);
                }
            };

            recorder.start(250);
            setIsListening(true);
            onTranscript('Listening...');
        } catch (err: any) {
            setError(err?.message || 'Microphone access denied');
            stopMediaStream();
            stopAudioMeter();
            setIsListening(false);
        }
    }, [isListening, lang, onEnd, onTranscript, startAudioMeter, stopAudioMeter, stopMediaStream, stopWhisper, whisperTranscribe]);

    const toggle = mode === 'streaming' ? streaming.toggle : mode === 'browser' ? toggleBrowser : toggleWhisper;

    const start = useCallback(() => {
        if (isListening || isTranscribing) return;
        if (mode === 'streaming') {
            streaming.start();
            return;
        }
        if (mode === 'browser') {
            void toggleBrowser();
            return;
        }
        void toggleWhisper();
    }, [isListening, isTranscribing, mode, streaming, toggleBrowser, toggleWhisper]);

    const stop = useCallback(() => {
        if (mode === 'streaming') {
            streaming.stop();
            return;
        }
        if (mode === 'browser') {
            stopBrowser();
            return;
        }
        void stopWhisper();
    }, [mode, streaming, stopBrowser, stopWhisper]);

    // In streaming mode, delegate state to the streaming hook
    const effectiveListening = mode === 'streaming' ? streaming.isListening : isListening;
    const effectiveAudioLevel = mode === 'streaming' ? streaming.audioLevel : audioLevel;
    const effectiveError = mode === 'streaming' ? streaming.error : error;
    const effectiveLatency = mode === 'streaming' ? streaming.latencyMs : latencyMs;

    return {
        isListening: effectiveListening,
        isSupported,
        start,
        toggle,
        stop,
        mode,
        isTranscribing: mode === 'streaming' ? streaming.speechState === 'connecting' : isTranscribing,
        error: effectiveError,
        latencyMs: effectiveLatency,
        audioLevel: effectiveAudioLevel,
        // Streaming-only fields (empty strings for other modes)
        interimText: mode === 'streaming' ? streaming.interimText : '',
        stableText: mode === 'streaming' ? streaming.stableText : '',
        speechState: mode === 'streaming' ? streaming.speechState : 'idle',
        confidence: mode === 'streaming' ? streaming.confidence : 0,
    };
}
