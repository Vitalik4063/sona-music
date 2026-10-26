import type { KeyboardEvent } from "react";
import { Heart, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";
import type { Track } from "../types";
import { usePlayer } from "../state/PlayerContext";
import { useUI } from "../state/UIContext";
import { useTrackLike } from "../hooks/useTrackLike";
import { cn, formatDuration } from "../utils";
import { Cover } from "./Cover";
import { Equalizer } from "./Equalizer";

interface TrackRowProps {
  track: Track;
  queue?: Track[];
  index?: number;
  showAlbum?: boolean;
  onRemove?: (track: Track) => void;
  compact?: boolean;
  disableLike?: boolean;
}

export function TrackRow({
  track,
  queue,
  index,
  showAlbum = true,
  onRemove,
  compact = false,
  disableLike = false,
}: TrackRowProps) {
  const player = usePlayer();
  const { openTrack } = useUI();
  const { liked, toggle, pending } = useTrackLike(track);
  const isCurrent = player.current?.id === track.id;

  const play = () => player.playTrack(track, queue);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      play();
    }
  };

  return (
    <div
      className={cn(
        "track-row",
        isCurrent && "track-row--current",
        compact && "track-row--compact",
      )}
      role="button"
      tabIndex={0}
      aria-label={`${track.title} — ${track.artist}. Включить`}
      onClick={play}
      onKeyDown={onKeyDown}
    >
      <div className="track-row__identity">
        <div className="track-row__lead">
          {typeof index === "number" && (
            <span className="track-row__index">{index + 1}</span>
          )}
          <button
            type="button"
            className={cn("track-row__play", isCurrent && "track-row__play--visible")}
            onClick={(event) => {
              event.stopPropagation();
              play();
            }}
            aria-label={isCurrent && player.isPlaying ? "Пауза" : "Слушать"}
          >
            {isCurrent && player.isPlaying ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
          </button>
          <Cover
            src={track.artwork_url}
            seed={track.artist + track.title}
            alt=""
            className="track-row__art"
          />
        </div>

        <div className="track-row__main">
          <div className="track-row__title">
            {track.title}
            {isCurrent && <Equalizer paused={!player.isPlaying} />}
          </div>
          <div className="track-row__artist">
            {track.artist}
          </div>
        </div>
      </div>

      {showAlbum && (
        <div className="track-row__album">
          {track.album || "Сингл"}
          {track.sources?.length > 1 && (
            <span className="track-row__sources">{track.sources.slice(0, 2).join(" · ")}</span>
          )}
        </div>
      )}

      <div className="track-row__actions">
        {!disableLike && (
          <button
            type="button"
            className={cn("icon-btn icon-btn--soft track-row__like", liked && "is-liked")}
            onClick={(event) => {
              event.stopPropagation();
              void toggle();
            }}
            disabled={pending}
            aria-label={liked ? "Убрать из избранного" : "Добавить в избранное"}
            aria-pressed={liked}
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            className="icon-btn icon-btn--soft track-row__remove"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(track);
            }}
            aria-label="Убрать из плейлиста"
          >
            <Trash2 size={16} />
          </button>
        )}
        <span className="track-row__duration">{formatDuration(track.duration_ms)}</span>
        <button
          type="button"
          className="icon-btn icon-btn--soft track-row__more"
          onClick={(event) => {
            event.stopPropagation();
            openTrack(track);
          }}
          aria-label="Подробнее о треке"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
