import { useEffect, useState } from "react";
import {
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sliders,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "../state/PlayerContext";
import { useTrackLike } from "../hooks/useTrackLike";
import { cn, formatDuration } from "../utils";
import { Cover } from "./Cover";
import { Equalizer } from "./Equalizer";

export function MiniPlayer() {
  const player = usePlayer();
  const { liked, toggle } = useTrackLike(player.current);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  useEffect(() => {
    setScrubbing(false);
    setScrubValue(0);
  }, [player.current?.id]);

  if (!player.current) return null;
  const track = player.current;
  const duration = Math.max(
    1,
    player.duration || (track.duration_ms ? track.duration_ms / 1000 : 185),
  );
  const currentSeconds = scrubbing
    ? scrubValue
    : Math.min(player.progress || 0, duration);
  const percent = duration
    ? Math.min(100, Math.max(0, (currentSeconds / duration) * 100))
    : 0;

  return (
    <div
      className={cn("mini-player", player.expanded && "mini-player--hidden")}
      role="region"
      aria-label="Плеер"
    >
      <div className="mini-player__top">
        <button
          type="button"
          className="mini-player__main"
          onClick={player.openPlayer}
          aria-label="Открыть плеер"
        >
          <span className="mini-player__art">
            <Cover src={track.artwork_url} seed={track.title + track.artist} alt="" />
            {player.isPlaying && (
              <span className="mini-player__eq">
                <Equalizer paused={false} />
              </span>
            )}
          </span>
          <span className="mini-player__meta">
            <span className="mini-player__title">{track.title}</span>
            <span className="mini-player__artist">
              {track.artist}
              {track.album && <span className="mini-player__preview"> · {track.album}</span>}
            </span>
          </span>
        </button>

        <div className="mini-player__controls">
          <div className="mini-player__volume">
            <button
              type="button"
              className="icon-btn"
              onClick={player.toggleMute}
              aria-label={player.muted || player.volume === 0 ? "Включить звук" : "Выключить звук"}
              style={{ width: "30px", height: "30px" }}
            >
              {player.muted || player.volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={player.muted ? 0 : player.volume}
              onChange={(e) => player.setVolume(parseFloat(e.target.value))}
              aria-label="Громкость"
              style={{
                width: "68px",
                accentColor: "var(--lime)",
                cursor: "pointer",
              }}
            />
          </div>

          <button
            type="button"
            className="icon-btn mini-player__eq-btn"
            onClick={player.openPlayer}
            title="Эквалайзер и настройки звука"
            aria-label="Открыть эквалайзер"
          >
            <Sliders size={17} />
          </button>

          <button
            type="button"
            className={cn("icon-btn mini-player__like", liked && "is-liked")}
            onClick={() => void toggle()}
            aria-label={liked ? "Убрать из избранного" : "В избранное"}
            aria-pressed={liked}
          >
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            className="icon-btn mini-player__prev"
            onClick={player.previous}
            aria-label="Предыдущий трек"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button
            type="button"
            className="mini-player__play"
            onClick={player.togglePlay}
            aria-label={player.isPlaying ? "Пауза" : "Играть"}
          >
            {player.isPlaying ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            className="icon-btn mini-player__next"
            onClick={player.next}
            aria-label="Следующий трек"
          >
            <SkipForward size={19} fill="currentColor" />
          </button>
        </div>
      </div>

      <div
        className="mini-player__seek-row"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mini-player__time">
          {formatDuration(currentSeconds * 1000)}
        </span>
        <div className="mini-player__range-wrap">
          <div className="mini-player__range-track" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <span
            className="mini-player__range-thumb"
            style={{ left: `${percent}%` }}
            aria-hidden="true"
          />
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentSeconds}
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
            onBlur={() => setScrubbing(false)}
            aria-label="Перемотка трека"
          />
        </div>
        <span className="mini-player__time">
          {formatDuration(duration * 1000)}
        </span>
      </div>
    </div>
  );
}
