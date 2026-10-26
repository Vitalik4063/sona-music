import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api";
import type { Track } from "../types";
import { haptic } from "../telegram";
import { useToast } from "./ToastContext";

import {
  saveTrackOffline,
  removeTrackOffline,
  getOfflineTracks,
  getOfflineAudioUrl,
} from "../utils/offlineStore";

type RepeatMode = "off" | "all" | "one";

export interface EqPreset {
  id: string;
  label: string;
  gains: [number, number, number, number, number]; // 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
}

export const EQ_FREQUENCIES = [
  { freq: 60, label: "60 Гц", sub: "Суб-бас" },
  { freq: 230, label: "230 Гц", sub: "Низкие" },
  { freq: 910, label: "910 Гц", sub: "Средние" },
  { freq: 3600, label: "3.6 кГц", sub: "Вокал" },
  { freq: 14000, label: "14 кГц", sub: "Воздух" },
] as const;

export const EQ_PRESETS: EqPreset[] = [
  { id: "flat", label: "Чистый (Flat)", gains: [0, 0, 0, 0, 0] },
  { id: "bass", label: "Bass Boost", gains: [8, 5, 0, 1, 2] },
  { id: "electronic", label: "Electronic", gains: [6, 3, -1, 3, 6] },
  { id: "vocal", label: "Вокал & Акустика", gains: [-2, 0, 4, 5, 2] },
  { id: "rock", label: "Рок & Драйв", gains: [5, 3, -2, 4, 6] },
  { id: "night", label: "Ночной режим", gains: [4, 2, -2, -1, -3] },
];

export interface PlayerContextValue {
  current: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  volume: number;
  muted: boolean;
  eqBands: [number, number, number, number, number];
  eqPreset: string;
  eqEnabled: boolean;
  isOfflineMode: boolean;
  offlineTracks: Track[];
  setVolume: (val: number) => void;
  toggleMute: () => void;
  setEqBand: (index: number, gainDb: number) => void;
  applyEqPreset: (presetId: string) => void;
  setEqEnabled: (val: boolean) => void;
  setIsOfflineMode: (val: boolean) => void;
  refreshOffline: () => Promise<void>;
  downloadTrack: (track: Track) => Promise<boolean>;
  removeDownloadedTrack: (trackId: number) => Promise<boolean>;
  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setShuffle: (value: boolean) => void;
  cycleRepeat: () => void;
  openPlayer: () => void;
  closePlayer: () => void;
  addToQueue: (track: Track) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function mediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, window.location.origin).toString();
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current) {
    const el = new Audio();
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    audioRef.current = el;
  }

  // Web Audio API Equalizer & Master Gain nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const graphConnectedRef = useRef(false);

  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffleState] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [expanded, setExpanded] = useState(false);
  const [isOfflineMode, setIsOfflineModeState] = useState(false);
  const [offlineTracks, setOfflineTracks] = useState<Track[]>([]);

  const [volume, setVolumeState] = useState<number>(() => {
    const raw = localStorage.getItem("sona.volume");
    if (raw === null || raw === "") return 0.85;
    const saved = Number(raw);
    return Number.isFinite(saved) && saved > 0 && saved <= 1 ? saved : 0.85;
  });
  const [muted, setMutedState] = useState<boolean>(false);

  const [eqEnabled, setEqEnabledState] = useState<boolean>(true);
  const [eqPreset, setEqPresetState] = useState<string>(() => {
    return localStorage.getItem("sona.eq.preset") || "flat";
  });
  const [eqBands, setEqBandsState] = useState<[number, number, number, number, number]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("sona.eq.bands") || "null");
      if (Array.isArray(parsed) && parsed.length === 5) {
        return parsed as [number, number, number, number, number];
      }
    } catch {}
    return [0, 0, 0, 0, 0];
  });

  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || graphConnectedRef.current) {
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audio);

      const filters: BiquadFilterNode[] = EQ_FREQUENCIES.map((item, idx) => {
        const filter = ctx.createBiquadFilter();
        filter.type = idx === 0 ? "lowshelf" : idx === EQ_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
        filter.frequency.value = item.freq;
        filter.Q.value = 1.1;
        filter.gain.value = eqEnabled ? eqBands[idx] : 0;
        return filter;
      });

      const masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : volume;

      // Connect chain: source -> filter[0] -> ... -> filter[4] -> masterGain -> destination
      let prevNode: AudioNode = source;
      for (const f of filters) {
        prevNode.connect(f);
        prevNode = f;
      }
      prevNode.connect(masterGain);
      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      filtersRef.current = filters;
      gainNodeRef.current = masterGain;
      graphConnectedRef.current = true;
    } catch {
      // Fallback to native HTMLAudioElement volume if WebAudio is restricted
    }
  }, [eqBands, eqEnabled, muted, volume]);

  // Sync volume & mute to both native audio element and Web Audio GainNode
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = muted ? 0 : Math.max(0, Math.min(1, volume));
      audio.muted = muted;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        muted ? 0 : Math.max(0, Math.min(1, volume)),
        audioCtxRef.current.currentTime
      );
    }
  }, [volume, muted]);

  // Sync Equalizer filter bands
  useEffect(() => {
    if (!filtersRef.current.length || !audioCtxRef.current) return;
    filtersRef.current.forEach((filter, idx) => {
      const targetGain = eqEnabled ? (eqBands[idx] || 0) : 0;
      filter.gain.setValueAtTime(targetGain, audioCtxRef.current!.currentTime);
    });
  }, [eqBands, eqEnabled]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (clamped > 0) setMutedState(false);
    localStorage.setItem("sona.volume", String(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => !m);
  }, []);

  const setEqBand = useCallback((index: number, gainDb: number) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(gainDb * 2) / 2));
    setEqBandsState((prev) => {
      const next: [number, number, number, number, number] = [...prev] as any;
      next[index] = clamped;
      localStorage.setItem("sona.eq.bands", JSON.stringify(next));
      return next;
    });
    setEqPresetState("custom");
    localStorage.setItem("sona.eq.preset", "custom");
  }, []);

  const applyEqPreset = useCallback((presetId: string) => {
    const found = EQ_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setEqPresetState(found.id);
    setEqBandsState([...found.gains]);
    setEqEnabledState(true);
    localStorage.setItem("sona.eq.preset", found.id);
    localStorage.setItem("sona.eq.bands", JSON.stringify(found.gains));
    haptic("selection");
  }, []);

  const setEqEnabled = useCallback((val: boolean) => {
    setEqEnabledState(val);
    haptic("light");
  }, []);

  const refreshOffline = useCallback(async () => {
    const list = await getOfflineTracks();
    setOfflineTracks(list);
  }, []);

  useEffect(() => {
    refreshOffline();
  }, [refreshOffline]);

  const setIsOfflineMode = useCallback(
    (val: boolean) => {
      setIsOfflineModeState(val);
      if (val) {
        toast("Офлайн-режим активирован. Доступны только загруженные треки.", "info");
      } else {
        toast("Онлайн-режим. Поиск и облако снова доступны.", "success");
      }
    },
    [toast]
  );

  const downloadTrack = useCallback(
    async (track: Track): Promise<boolean> => {
      toast(`Загрузка «${track.title}» в офлайн...`, "info");
      const ok = await saveTrackOffline(track);
      if (ok) {
        toast(`«${track.title}» сохранён офлайн!`, "success");
        await refreshOffline();
        haptic("success");
        return true;
      } else {
        toast(`Не удалось сохранить «${track.title}»`, "error");
        haptic("error");
        return false;
      }
    },
    [refreshOffline, toast]
  );

  const removeDownloadedTrack = useCallback(
    async (trackId: number): Promise<boolean> => {
      const ok = await removeTrackOffline(trackId);
      if (ok) {
        toast("Трек удалён из загрузок", "info");
        await refreshOffline();
        return true;
      }
      return false;
    },
    [refreshOffline, toast]
  );

  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(-1);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("off");

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    indexRef.current = queueIndex;
  }, [queueIndex]);
  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  const current = queueIndex >= 0 ? queue[queueIndex] || null : null;

  const startAt = useCallback(
    async (tracks: Track[], index: number, shouldPlay = true) => {
      const audio = audioRef.current;
      if (!audio || tracks.length === 0) return;

      const targetIndex = Math.max(0, Math.min(index, tracks.length - 1));
      const track = tracks[targetIndex];
      if (!track) return;

      setQueue(tracks);
      queueRef.current = tracks;
      setQueueIndex(targetIndex);
      indexRef.current = targetIndex;
      setProgress(0);

      let sourceUrl: string | null = null;
      try {
        sourceUrl = await getOfflineAudioUrl(track.id);
      } catch {
        // ignore
      }

      if (!sourceUrl) {
        // Always route through our same-origin full-song stream endpoint (/api/stream/:id)
        // so full-length 320kbps audio and Web Audio Equalizer work seamlessly
        sourceUrl = mediaUrl(`/api/stream/${track.id}`);
      }

      audio.src = sourceUrl;
      audio.currentTime = 0;
      setDuration(Math.max(120, (track.duration_ms || 185_000) / 1000));

      if (shouldPlay) {
        ensureAudioGraph();
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            api.registerPlay(track.id).catch(() => undefined);
          })
          .catch(() => {
            if (track.preview_url) {
              audio.src = mediaUrl(track.preview_url);
              audio
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            } else {
              setIsPlaying(false);
            }
          });
        setIsPlaying(true);
        haptic("light");
      }
    },
    [ensureAudioGraph]
  );

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (!tracks.length) return;
      startAt(tracks, Math.max(0, Math.min(startIndex, tracks.length - 1)));
    },
    [startAt]
  );

  const playTrack = useCallback(
    (track: Track, nextQueue?: Track[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (current?.id === track.id) {
        ensureAudioGraph();
        if (audio.paused) {
          audio.play().then(() => setIsPlaying(true)).catch(() => undefined);
        } else {
          audio.pause();
          setIsPlaying(false);
        }
        return;
      }
      const sourceQueue = nextQueue?.length ? nextQueue : [track];
      const index = Math.max(
        0,
        sourceQueue.findIndex((item) => item.id === track.id)
      );
      startAt(sourceQueue, index);
    },
    [current?.id, ensureAudioGraph, startAt]
  );

  const next = useCallback(() => {
    const audio = audioRef.current;
    const tracks = queueRef.current;
    if (!audio || !tracks.length) return;
    if (repeatRef.current === "one") {
      audio.currentTime = 0;
      audio.play().catch(() => undefined);
      return;
    }
    if (shuffleRef.current && tracks.length > 1) {
      let nextIndex = indexRef.current;
      while (nextIndex === indexRef.current) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      }
      startAt(tracks, nextIndex);
      return;
    }
    const nextIndex = indexRef.current + 1;
    if (nextIndex >= tracks.length) {
      if (repeatRef.current === "all") {
        startAt(tracks, 0);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }
    startAt(tracks, nextIndex);
  }, [startAt]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    const tracks = queueRef.current;
    if (!audio || !tracks.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIndex = indexRef.current - 1;
    if (prevIndex < 0) {
      startAt(tracks, repeatRef.current === "all" ? tracks.length - 1 : 0);
      return;
    }
    startAt(tracks, prevIndex);
  }, [startAt]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      if (queue.length) startAt(queue, 0);
      return;
    }
    ensureAudioGraph();
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => undefined);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [current, ensureAudioGraph, queue, startAt]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setProgress(seconds);
  }, []);

  const setShuffle = useCallback(
    (value: boolean) => {
      setShuffleState(value);
      toast(value ? "Перемешивание включено" : "Перемешивание выключено", "info");
    },
    [toast]
  );

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) => {
      const nextMode = mode === "off" ? "all" : mode === "all" ? "one" : "off";
      toast(
        nextMode === "off"
          ? "Повтор выключен"
          : nextMode === "all"
            ? "Повтор очереди"
            : "Повтор трека",
        "info"
      );
      return nextMode;
    });
  }, [toast]);

  const addToQueue = useCallback(
    (track: Track) => {
      const tracks = queueRef.current;
      if (!tracks.length || indexRef.current < 0) {
        startAt([...tracks, track], tracks.length);
        return;
      }
      setQueue((current) => {
        const nextQueue = [...current, track];
        queueRef.current = nextQueue;
        return nextQueue;
      });
      toast(`«${track.title}» в очереди`, "success");
    },
    [startAt, toast]
  );

  const openPlayer = useCallback(() => setExpanded(true), []);
  const closePlayer = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setProgress(audio.currentTime || 0);
    const onDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 35) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      next();
    };
    const onError = () => {
      if (audio.src) setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [next]);

  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album || "Sona",
        artwork: current.artwork_url
          ? [{ src: current.artwork_url, sizes: "512x512" }]
          : [],
      });
      navigator.mediaSession.setActionHandler("play", () => togglePlay());
      navigator.mediaSession.setActionHandler("pause", () => togglePlay());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
      navigator.mediaSession.setActionHandler("previoustrack", () => previous());
    } catch {
      /* unsupported */
    }
  }, [current, next, previous, togglePlay]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    []
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      queue,
      queueIndex,
      isPlaying,
      progress,
      duration,
      shuffle,
      repeat,
      expanded,
      volume,
      muted,
      eqBands,
      eqPreset,
      eqEnabled,
      isOfflineMode,
      offlineTracks,
      setVolume,
      toggleMute,
      setEqBand,
      applyEqPreset,
      setEqEnabled,
      setIsOfflineMode,
      refreshOffline,
      downloadTrack,
      removeDownloadedTrack,
      playTrack,
      playQueue,
      togglePlay,
      next,
      previous,
      seek,
      setShuffle,
      cycleRepeat,
      openPlayer,
      closePlayer,
      addToQueue,
    }),
    [
      current,
      queue,
      queueIndex,
      isPlaying,
      progress,
      duration,
      shuffle,
      repeat,
      expanded,
      volume,
      muted,
      eqBands,
      eqPreset,
      eqEnabled,
      isOfflineMode,
      offlineTracks,
      setVolume,
      toggleMute,
      setEqBand,
      applyEqPreset,
      setEqEnabled,
      setIsOfflineMode,
      refreshOffline,
      downloadTrack,
      removeDownloadedTrack,
      playTrack,
      playQueue,
      togglePlay,
      next,
      previous,
      seek,
      setShuffle,
      cycleRepeat,
      openPlayer,
      closePlayer,
      addToQueue,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
