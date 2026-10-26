import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import type { PlaylistSummary } from "../types";
import { trackCount } from "../utils";
import { PlaylistArtwork } from "./Cover";

interface PlaylistCardProps {
  playlist: PlaylistSummary;
  to?: string;
  showOwner?: boolean;
}

export function PlaylistCard({ playlist, to, showOwner = false }: PlaylistCardProps) {
  return (
    <Link to={to || `/playlist/${playlist.id}`} className="playlist-card">
      <div className="playlist-card__art">
        <PlaylistArtwork
          images={playlist.collage}
          cover={playlist.cover_url}
          seed={playlist.title}
          alt={playlist.title}
        />
        <span className="playlist-card__play" aria-hidden="true">
          <Play size={20} fill="currentColor" />
        </span>
      </div>
      <div className="playlist-card__title">{playlist.title}</div>
      <div className="playlist-card__meta">
        {showOwner && playlist.owner?.display_name
          ? playlist.owner.display_name
          : trackCount(playlist.track_count)}
        {!playlist.is_public && <span className="tag tag--mini">скрыт</span>}
      </div>
    </Link>
  );
}
