import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Sliders,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { EQ_FREQUENCIES, EQ_PRESETS, usePlayer } from "../state/PlayerContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useTrackLike } from "../hooks/useTrackLike";
import { useUI } from "../state/UIContext";
import { useToast } from "../state/ToastContext";
import { shareTrackToTelegram, shareUniversal } from "../telegram";
import { cn, formatDuration } from "../utils";
import { Cover } from "./Cover";
import { Equalizer } from "./Equalizer";

export function PlayerSheet() {
  const player = usePlayer();
  const { closePlayer, togglePlay } = player;
  const { openPlaylistPicker, setQueueOpen } = useUI();
  const { toast } = useToast();
  const { liked, toggle } = useTrackLike(player.current);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showEq, setShowEq] = useState(false);

  useBodyScrollLock(player.expanded && Boolean(player.current));

  useEffect(() => {
    if (!player.expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePlayer();
      if (event.key === " " && event.target === document.body) {
        event.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePlayer, player.expanded, togglePlay]);

  if (!player.expanded || !player.current) return null;
  const track = player.current;
  const duration = player.duration || track.duration_ms / 1000 || 185;
  const value = scrubbing ? scrubValue : Math.min(player.progress, duration);
  const percent = duration ? (value / duration) * 100 : 0;

  const share = async () => {
    const fallbackUrl = `${window.location.origin}/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}`;
    const url =
      track.external_url ||
      track.links?.deezer ||
      track.links?.itunes ||
      track.links?.soundcloud ||
      fallbackUrl;

    if (shareTrackToTelegram(track.id)) {
      return;
    }

    const res = await shareUniversal({
      url,
      title: `${track.artist} — ${track.title}`,
      text: `Слушаю в Sona: ${track.artist} — ${track.title}`,
    });
    toast(
      res.copied
        ? `Ссылка на «${track.title}» скопирована`
        : "Не удалось скопировать ссылку",
      res.copied ? "success" : "error",
    );
  };

  return createPortal(
    <div
      className="player-expanded"
      role="dialog"
      aria-modal="true"
      aria-label={`Плеер: ${track.title}`}
    >
      <div
        className="player-expanded__backdrop"
        style={
          track.artwork_url
            ? { backgroundImage: `url(${track.artwork_url})` }
            : undefined
        }
        aria-hidden="true"
      />
      <div className="player-expanded__noise" aria-hidden="true" />

      <div className="player-expanded__inner">
        <header className="player-expanded__top">
          <button
            type="button"
            className="icon-btn icon-btn--on-dark"
            onClick={player.closePlayer}
            aria-label="Свернуть плеер"
          >
            <ChevronDown size={22} />
          </button>
          <div className="player-expanded__label">
            <span className="player-expanded__eyebrow">Сейчас играет</span>
            <span className="player-expanded__source">{track.album || "Sona"}</span>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--on-dark"
            onClick={share}
            aria-label="Поделиться треком"
          >
            <Share2 size={20} />
          </button>
        </header>

        <div className="player-expanded__body">
          <div className="player-expanded__art-column">
            <div className="player-expanded__art-wrap">
              <span className="player-expanded__orbit player-expanded__orbit--one" />
              <span className="player-expanded__orbit player-expanded__orbit--two" />
              <Cover
                src={track.artwork_url}
                seed={track.title + track.artist}
                alt={track.title}
                className={cn("player-expanded__art", player.isPlaying && "is-playing")}
                loading="eager"
              />
              <span className="player-expanded__art-chip">320 kbps · HQ</span>
            </div>
          </div>

          <div className="player-expanded__info">
            <div className="player-expanded__title-row">
              <div className="player-expanded__heading">
                <h1>{track.title}</h1>
                <p>{track.artist}</p>
              </div>
              <button
                type="button"
                className={cn("icon-btn icon-btn--on-dark player-expanded__like", liked && "is-liked")}
                onClick={() => void toggle()}
                aria-label={liked ? "Убрать из избранного" : "В избранное"}
                aria-pressed={liked}
              >
                <Heart size={22} fill={liked ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="player-expanded__timeline">
              <div className="range-wrap">
                <div className="range-track" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={value}
                  onChange={(event) => {
                    const nextVal = Number(event.target.value);
                    setScrubbing(true);
                    setScrubValue(nextVal);
                    player.seek(nextVal);
                  }}
                  onMouseUp={(event) => {
                    player.seek(Number(event.currentTarget.value));
                    setScrubbing(false);
                  }}
                  onTouchEnd={(event) => {
                    player.seek(Number(event.currentTarget.value));
                    setScrubbing(false);
                  }}
                  onKeyUp={(event) => {
                    player.seek(Number(event.currentTarget.value));
                    setScrubbing(false);
                  }}
                  aria-label="Позиция воспроизведения"
                />
              </div>
              <div className="player-expanded__times">
                <span>{formatDuration(value * 1000)}</span>
                <span>{formatDuration(duration * 1000)}</span>
              </div>
            </div>

            <div className="player-expanded__controls">
              <button
                type="button"
                className={cn("player-control", player.shuffle && "is-active")}
                onClick={() => player.setShuffle(!player.shuffle)}
                aria-label="Перемешать"
                aria-pressed={player.shuffle}
              >
                <Shuffle size={19} />
              </button>
              <button
                type="button"
                className="player-control player-control--skip"
                onClick={player.previous}
                aria-label="Предыдущий трек"
              >
                <SkipBack size={26} fill="currentColor" />
              </button>
              <button
                type="button"
                className="player-control player-control--play"
                onClick={player.togglePlay}
                aria-label={player.isPlaying ? "Пауза" : "Играть"}
              >
                {player.isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                className="player-control player-control--skip"
                onClick={player.next}
                aria-label="Следующий трек"
              >
                <SkipForward size={26} fill="currentColor" />
              </button>
              <button
                type="button"
                className={cn("player-control", player.repeat !== "off" && "is-active")}
                onClick={player.cycleRepeat}
                aria-label="Повтор"
              >
                {player.repeat === "one" ? <Repeat1 size={19} /> : <Repeat size={19} />}
              </button>
            </div>

            {/* Volume Control Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <button
                type="button"
                className="icon-btn icon-btn--on-dark"
                onClick={player.toggleMute}
                aria-label={player.muted || player.volume === 0 ? "Включить звук" : "Выключить звук"}
                style={{ width: "32px", height: "32px", flexShrink: 0 }}
              >
                {player.muted || player.volume === 0 ? (
                  <VolumeX size={18} />
                ) : player.volume < 0.5 ? (
                  <Volume1 size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={player.muted ? 0 : player.volume}
                onChange={(e) => player.setVolume(parseFloat(e.target.value))}
                aria-label="Громкость воспроизведения"
                style={{
                  flex: 1,
                  accentColor: "var(--lime)",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: 700, minWidth: "38px", textAlign: "right" }}>
                {Math.round((player.muted ? 0 : player.volume) * 100)}%
              </span>
            </div>

            <div className="player-expanded__extras">
              <button
                type="button"
                className="player-extra"
                onClick={() => openPlaylistPicker(track)}
              >
                <Plus size={17} />
                В плейлист
              </button>
              <button
                type="button"
                className="player-extra"
                onClick={() => setQueueOpen(true)}
              >
                <ListMusic size={17} />
                Очередь
                <span className="player-extra__badge">{player.queue.length}</span>
              </button>
              <button
                type="button"
                className={cn("player-extra", showEq && "is-active")}
                onClick={() => setShowEq((v) => !v)}
                style={{
                  borderColor: showEq ? "var(--lime)" : undefined,
                  color: showEq ? "var(--lime)" : undefined,
                }}
              >
                <Sliders size={17} />
                Эквалайзер
              </button>
            </div>

            {/* Interactive 5-Band Equalizer Panel */}
            {showEq && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  background: "rgba(10, 12, 18, 0.85)",
                  border: "1px solid var(--line-strong)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--lime)" }}>
                    5-полосный эквалайзер (Web Audio DSP)
                  </span>
                  <button
                    type="button"
                    className="btn btn--small btn--ghost"
                    onClick={() => player.setEqEnabled(!player.eqEnabled)}
                    style={{ padding: "4px 10px", fontSize: "11px" }}
                  >
                    {player.eqEnabled ? "Активен" : "Выключен"}
                  </button>
                </div>

                {/* Preset Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {EQ_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => player.applyEqPreset(preset.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background:
                          player.eqPreset === preset.id
                            ? "var(--lime)"
                            : "rgba(255, 255, 255, 0.07)",
                        color: player.eqPreset === preset.id ? "#000" : "#fff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 5 Band Sliders */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", textAlign: "center" }}>
                  {EQ_FREQUENCIES.map((band, idx) => {
                    const gain = player.eqBands[idx] || 0;
                    return (
                      <div
                        key={band.freq}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 4px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.03)",
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 700, color: gain !== 0 ? "var(--lime)" : "var(--muted)" }}>
                          {gain > 0 ? `+${gain}` : gain} дБ
                        </span>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={gain}
                          onChange={(e) => player.setEqBand(idx, parseFloat(e.target.value))}
                          aria-label={`Частота ${band.label}`}
                          style={{
                            width: "100%",
                            accentColor: "var(--lime)",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: "11px", fontWeight: 600 }}>{band.label}</span>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>{band.sub}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="player-expanded__status">
              <Equalizer paused={!player.isPlaying} />
              <span>
                Потоковое воспроизведение · Полная версия (320 kbps)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
