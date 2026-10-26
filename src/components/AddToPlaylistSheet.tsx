import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListMusic, Plus, Sparkles } from "lucide-react";
import { api } from "../api";
import { useUI } from "../state/UIContext";
import { useToast } from "../state/ToastContext";
import { cn } from "../utils";
import { PlaylistArtwork } from "./Cover";
import { Sheet } from "./Sheet";

export function AddToPlaylistSheet() {
  const { pickerTrack, closePlaylistPicker, openCreatePlaylist } = useUI();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<number | null>(null);

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ["playlists"],
    queryFn: api.playlists,
    enabled: Boolean(pickerTrack),
    staleTime: 20_000,
  });

  useEffect(() => {
    if (pickerTrack) setAdded(new Set());
  }, [pickerTrack?.id]);

  if (!pickerTrack) return null;

  const add = async (playlistId: number, title: string) => {
    if (pending) return;
    setPending(playlistId);
    try {
      await api.addTrackToPlaylist(playlistId, pickerTrack.id, pickerTrack);
      setAdded((current) => new Set(current).add(playlistId));
      toast(`Добавлено в «${title}»`, "success");
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Не удалось добавить трек",
        "error",
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <Sheet
      open
      onClose={closePlaylistPicker}
      title="Добавить в плейлист"
      subtitle={`«${pickerTrack.title}» · ${pickerTrack.artist}`}
      className="picker-sheet"
    >
      <button
        type="button"
        className="picker-create"
        onClick={() => {
          closePlaylistPicker();
          openCreatePlaylist(async (playlist) => {
            await api.addTrackToPlaylist(playlist.id, pickerTrack.id, pickerTrack);
            queryClient.invalidateQueries({ queryKey: ["playlists"] });
            queryClient.invalidateQueries({ queryKey: ["home"] });
            toast(`Трек добавлен в «${playlist.title}»`, "success");
          });
        }}
      >
        <span className="picker-create__icon">
          <Plus size={20} />
        </span>
        <span>
          <strong>Новый плейлист</strong>
          <small>Создать и сразу добавить трек</small>
        </span>
        <Sparkles size={17} className="picker-create__spark" />
      </button>

      {isLoading && (
        <div className="picker-loading">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="picker-row-skeleton" />
          ))}
        </div>
      )}

      {!isLoading && playlists.length === 0 && (
        <div className="picker-empty">
          <ListMusic size={26} />
          <p>Плейлистов пока нет. Создай первый — он появится в коллекции.</p>
        </div>
      )}

      <div className="picker-list">
        {playlists.map((playlist) => {
          const isAdded = added.has(playlist.id);
          return (
            <button
              key={playlist.id}
              type="button"
              className={cn("picker-row", isAdded && "is-added")}
              onClick={() => void add(playlist.id, playlist.title)}
              disabled={Boolean(pending) || isAdded}
            >
              <PlaylistArtwork
                images={playlist.collage}
                cover={playlist.cover_url}
                seed={playlist.title}
                className="picker-row__art"
              />
              <span className="picker-row__meta">
                <span className="picker-row__title">{playlist.title}</span>
                <span className="picker-row__sub">
                  {playlist.track_count} треков · {playlist.is_public ? "публичный" : "скрытый"}
                </span>
              </span>
              <span className={cn("picker-row__check", isAdded && "is-checked")}>
                {isAdded ? <Check size={17} /> : <Plus size={18} />}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
