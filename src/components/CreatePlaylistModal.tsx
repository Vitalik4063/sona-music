import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Globe2, Lock, Sparkles } from "lucide-react";
import { api } from "../api";
import { useUI } from "../state/UIContext";
import { useToast } from "../state/ToastContext";
import { cn } from "../utils";
import { Sheet } from "./Sheet";

export function CreatePlaylistModal() {
  const { createIntent, closeCreatePlaylist } = useUI();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (createIntent) {
      setTitle("");
      setDescription("");
      setIsPublic(true);
    }
  }, [createIntent]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) {
      toast("Дай плейлисту название", "info");
      return;
    }
    setPending(true);
    try {
      const playlist = await api.createPlaylist({
        title: clean,
        description: description.trim(),
        is_public: isPublic,
      });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast(`Плейлист «${playlist.title}» создан`, "success");
      await createIntent?.afterCreate?.(playlist);
      closeCreatePlaylist();
      if (!createIntent?.afterCreate) navigate(`/playlist/${playlist.id}`);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Не удалось создать плейлист",
        "error",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet
      open={Boolean(createIntent)}
      onClose={closeCreatePlaylist}
      title="Новый плейлист"
      subtitle="Название можно изменить в любой момент"
    >
      <form className="create-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="playlist-title">Название</label>
          <input
            id="playlist-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, «Тихие вечера»"
            maxLength={120}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="playlist-description">
            Описание <span className="field__optional">необязательно</span>
          </label>
          <textarea
            id="playlist-description"
            className="input input--textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="О чём этот плейлист?"
            maxLength={500}
            rows={3}
          />
        </div>

        <button
          type="button"
          className={cn("visibility-toggle", isPublic && "is-public")}
          onClick={() => setIsPublic((value) => !value)}
          aria-pressed={isPublic}
        >
          <span className="visibility-toggle__icon">
            {isPublic ? <Globe2 size={19} /> : <Lock size={19} />}
          </span>
          <span className="visibility-toggle__text">
            <strong>{isPublic ? "Виден в профиле" : "Скрыт в профиле"}</strong>
            <small>
              {isPublic
                ? "Друзья увидят плейлист, если профиль открыт"
                : "Плейлист останется только у тебя"}
            </small>
          </span>
          <span className={cn("toggle", isPublic && "is-on")} aria-hidden="true">
            <span />
          </span>
        </button>

        <div className="create-form__footer">
          <span className="create-form__hint">
            <Sparkles size={14} /> Плейлисты можно делать публичными и скрытыми
          </span>
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Создаём…" : "Создать плейлист"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
