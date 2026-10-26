import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getLocalLikes } from "../api";
import type { Track } from "../types";
import { useToast } from "../state/ToastContext";

export function useTrackLike(track: Track | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [liked, setLiked] = useState(() =>
    Boolean(track?.liked || (track && getLocalLikes().some((t) => t.id === track.id))),
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(
      Boolean(track?.liked || (track && getLocalLikes().some((t) => t.id === track.id))),
    );
  }, [track?.id, track?.liked]);

  const toggle = useCallback(async () => {
    if (!track || pending) return;
    const next = !liked;
    setLiked(next);
    setPending(true);
    try {
      await (next ? api.like(track.id, track) : api.unlike(track.id));
      toast(next ? "Добавлено в избранное" : "Убрано из избранного", "success");
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["likes"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    } catch (error) {
      setLiked(!next);
      toast(error instanceof Error ? error.message : "Не удалось обновить избранное", "error");
    } finally {
      setPending(false);
    }
  }, [liked, pending, queryClient, toast, track]);

  return { liked, toggle, pending };
}
