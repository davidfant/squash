import { useAuthHeaders } from "@/hooks/api";
import { useCallback, useRef, useState } from "react";

export type DictationStatus = "idle" | "recording" | "transcribing";

/**
 * useDictation — a React hook that records microphone audio, surfaces live
 * amplitude samples every 200 ms for waveform bars, and posts the final
 * recording to `/transcribe` for speech‑to‑text.
 */
export function useDictation(onTranscription?: (text: string) => void): {
  status: DictationStatus;
  /** Root‑mean‑square amplitude samples in the range 0‑1 (updated every 200 ms) */
  levels: number[];
  start: () => Promise<void>;
  cancel: () => void;
  stop: () => Promise<void>;
} {
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [levels, setLevels] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sampleIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  /** Clean up tracks, audio context, buffers & timers */
  const resetMedia = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    if (sampleIntervalRef.current !== null) {
      clearInterval(sampleIntervalRef.current);
      sampleIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    chunksRef.current = [];
    setLevels([]);
  };

  /** Begin a brand‑new recording session */
  const start = useCallback(async (): Promise<void> => {
    if (status === "recording") return; // ignore if already recording

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // ---------- MediaRecorder (for final blob)
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;

    // ---------- Web Audio (for live level sampling)
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256; // gives 128 time‑domain samples
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;

    // sample RMS every 200 ms
    sampleIntervalRef.current = window.setInterval(() => {
      if (!analyserRef.current) return;
      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Root‑mean‑square amplitude (0‑1)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i]! - 128) / 16; // normalise to –1…1
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength); // 0…1
      setLevels((prev) => [...prev, rms].slice(-20));
    }, 50);

    setStatus("recording");
  }, [status]);

  /** Abort and discard current recording */
  const cancel = useCallback((): void => {
    if (status !== "recording") return;
    mediaRecorderRef.current?.stop();
    resetMedia();
    setStatus("idle");
  }, [status]);

  /**
   * Stop recording, upload the audio blob and resolve when finished.
   * The transcription text (if any) is emitted through `onTranscription`.
   */
  const headers = useAuthHeaders();
  const stop = useCallback(async (): Promise<void> => {
    if (status !== "recording") return;

    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        resetMedia();
        setStatus("idle");
        resolve();
        return;
      }

      setStatus("transcribing");

      mediaRecorderRef.current.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });

          const formData = new FormData();
          formData.append("file", blob, "audio.webm");

          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/transcribe`,
            { method: "POST", body: formData, headers: await headers() }
          );

          if (!res.ok) throw new Error("Transcription failed");
          const text = await res.text();
          onTranscription?.(text);
        } catch (err) {
          console.error(err);
        } finally {
          resetMedia();
          setStatus("idle");
          resolve();
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [status, onTranscription]);

  return { status, levels, start, cancel, stop };
}
