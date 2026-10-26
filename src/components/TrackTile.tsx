import { MoreHorizontal, Pause, Play } from "lucide-react";
import type { Track } from "../types";
import { usePlayer } from "../state/PlayerContext";
import { useUI } from "../state/UIContext";
import { cn } from "../utils";
import { Cover } from "./Cover";
import { Equalizer } from "./Equalizer";

interface TrackTileProps {
  track: Track;
  queue?: Track[];
  className?: string;
  size?: "default" | "large";
}

export function TrackTile({ track, queue, className, size = "default" }: TrackTileProps) {
  const player = usePlayer();
  const { openTrack } = useUI();
  const isCurrent = player.current?.id === track.id;
  const isPlaying = isCurrent && player.isPlaying;

  return (
    <article className={cn("track-tile", size === "large" && "track-tile--large", className)}>
      <div className="track-tile__art-wrap">
        <button
          type="button"
          className="track-tile__art-btn"
          onClick={() => player.playTrack(track, queue)}
          aria-label={isCurrent && isPlaying ? `Пауза: ${track.title}` : `Слушать: ${track.title}`}
        >
          <Cover
            src={track.artwork_url}
            seed={track.title + track.artist}
            alt={track.title}
            className="track-tile__art"
          />
          <span className={cn("track-tile__play", isCurrent && "is-current")}>
            {isCurrent && isPlaying ? (
              <Pause size={21} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
          </span>
          {isCurrent && (
            <span className="track-tile__live">
              <Equalizer paused={!isPlaying} />
            </span>
          )}
        </button>
        <button
          type="button"
          className="icon-btn track-tile__more"
          onClick={() => openTrack(track)}
          aria-label={`О треке «${track.title}»`}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div className="track-tile__meta">
        <div className="track-tile__title" title={track.title}>
          {track.title}
        </div>
        <div className="track-tile__artist" title={track.artist}>
          {track.artist}
        </div>
      </div>
    </article>
  );
}
