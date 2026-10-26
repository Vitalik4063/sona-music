import {
  ArrowUpRight,
  Download,
  Heart,
  ListPlus,
  Play,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";
import { usePlayer } from "../state/PlayerContext";
import { useTrackLike } from "../hooks/useTrackLike";
import { useUI } from "../state/UIContext";
import { useToast } from "../state/ToastContext";
import { openExternal, shareTrackToTelegram, shareUniversal } from "../telegram";
import { cn, formatDuration, sourceLabel } from "../utils";
import { Cover } from "./Cover";
import { Sheet } from "./Sheet";

const knownLinks = [
  "deezer",
  "itunes",
  "spotify",
  "youtube",
  "soundcloud",
  "yandex",
  "vk",
];

export function TrackSheet() {
  const { selectedTrack: track, closeTrack, openPlaylistPicker } = useUI();
  const player = usePlayer();
  const { toast } = useToast();
  const { liked, toggle } = useTrackLike(track);

  if (!track) return null;

  const links = Object.entries(track.links || {}).filter(
    ([key, value]) => knownLinks.includes(key) && Boolean(value),
  );

  const play = () => {
    player.playTrack(track, [track]);
    closeTrack();
  };

  const share = async () => {
    if (shareTrackToTelegram(track.id)) {
      closeTrack();
      return;
    }
    const fallbackUrl = `${window.location.origin}/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}`;
    const url = track.external_url || (links[0]?.[1] ? String(links[0][1]) : fallbackUrl);
    const res = await shareUniversal({
      url,
      title: `${track.artist} — ${track.title}`,
      text: `Слушаю в Sona: ${track.artist} — ${track.title}`,
    });
    toast(
      res.copied ? `Ссылка на «${track.title}» скопирована` : "Не удалось скопировать ссылку",
      res.copied ? "success" : "error",
    );
  };

  return (
    <Sheet open onClose={closeTrack} hideClose className="track-sheet">
      <div className="track-sheet__top">
        <span className="eyebrow">Трек</span>
        <button
          type="button"
          className="icon-btn"
          onClick={closeTrack}
          aria-label="Закрыть"
        >
          <span className="sheet-close-x" aria-hidden="true" />
        </button>
      </div>

      <div className="track-sheet__hero">
        <Cover
          src={track.artwork_url}
          seed={track.title + track.artist}
          alt={track.title}
          className="track-sheet__art"
          loading="eager"
        />
        <div className="track-sheet__headline">
          <h2>{track.title}</h2>
          <p>{track.artist}</p>
          <div className="track-sheet__meta">
            <span>{formatDuration(track.duration_ms)}</span>
            <span className="dot-sep" />
            <span>{track.album || track.provider}</span>
          </div>
        </div>
      </div>

      <div className="track-sheet__actions">
        <button type="button" className="btn btn--primary track-sheet__play" onClick={play}>
          <Play size={18} fill="currentColor" />
          Слушать трек
        </button>
        <button
          type="button"
          className={cn("action-circle", liked && "is-liked")}
          onClick={() => void toggle()}
          aria-label={liked ? "Убрать из избранного" : "В избранное"}
          aria-pressed={liked}
        >
          <Heart size={20} fill={liked ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          className="action-circle"
          onClick={() => openPlaylistPicker(track)}
          aria-label="Добавить в плейлист"
        >
          <Plus size={21} />
        </button>
        <button
          type="button"
          className="action-circle"
          onClick={() => void share()}
          aria-label="Поделиться"
        >
          <Share2 size={19} />
        </button>
      </div>

      <div className="track-sheet__shortcuts">
        <button
          type="button"
          className="track-shortcut"
          onClick={() => {
            player.addToQueue(track);
            closeTrack();
          }}
        >
          <ListPlus size={18} />
          <span>
            <strong>В очередь</strong>
            <small>сыграет следом</small>
          </span>
        </button>
        <button
          type="button"
          className="track-shortcut"
          onClick={() => openPlaylistPicker(track)}
        >
          <Plus size={18} />
          <span>
            <strong>В плейлист</strong>
            <small>сохранить себе</small>
          </span>
        </button>
        <button
          type="button"
          className="track-shortcut"
          onClick={async () => {
            await player.downloadTrack(track);
            closeTrack();
          }}
        >
          <Download size={18} />
          <span>
            <strong>Скачать офлайн</strong>
            <small>доступ без сети</small>
          </span>
        </button>
      </div>

      {links.length > 0 && (
        <div className="track-sheet__section">
          <h3>
            <Sparkles size={15} />
            Внешние площадки
          </h3>
          <div className="provider-links">
            {links.map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="provider-link"
                onClick={() => openExternal(String(value))}
              >
                <span>{sourceLabel(key)}</span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
