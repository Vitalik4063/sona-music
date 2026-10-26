import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Globe2,
  Headphones,
  Link2,
  Lock,
  MailPlus,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { useToast } from "../state/ToastContext";
import {
  confirmDialog,
  copyText,
  shareUniversal,
} from "../telegram";
import { cn, privacyLabel, sourceLabel } from "../utils";
import { Avatar } from "../components/Avatar";
import { ErrorState, PageSkeleton } from "../components/Loading";
import { Toggle } from "../components/Toggle";

const privacyOptions = [
  {
    value: "public" as const,
    icon: Globe2,
    title: "Открыт всем",
    text: "Любой, у кого есть ссылка, увидит любимые треки и публичные плейлисты.",
    tag: "просто",
  },
  {
    value: "selected" as const,
    icon: Users,
    title: "По заявке",
    text: "Профиль скрыт. Гости могут попросить доступ, а ты одобришь каждого.",
    tag: "баланс",
  },
  {
    value: "private" as const,
    icon: Lock,
    title: "Закрыт",
    text: "Никто не увидит профиль, даже по ссылке. Заявки отключены.",
    tag: "только я",
  },
];

const accents = [
  { value: "lime" as const, label: "Lime", color: "#c8ff4d" },
  { value: "coral" as const, label: "Coral", color: "#ff7a59" },
  { value: "sky" as const, label: "Sky", color: "#8bd7ff" },
  { value: "lilac" as const, label: "Lilac", color: "#cbb7ff" },
  { value: "sun" as const, label: "Sun", color: "#ffd36e" },
];

export function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setUser, isDev } = useAuth();
  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings,
  });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [viewerInput, setViewerInput] = useState("");
  const [addingViewer, setAddingViewer] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setName(settings.user.first_name);
    setBio(settings.user.bio);
  }, [settings?.user.first_name, settings?.user.bio]);

  if (isLoading) return <PageSkeleton />;
  if (error || !settings) {
    return (
      <ErrorState
        title="Настройки недоступны"
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const applySettings = async (
    patch: Parameters<typeof api.patchSettings>[0],
    message: string,
    key = "settings",
  ) => {
    setBusy(key);
    try {
      const fresh = await api.patchSettings(patch);
      queryClient.setQueryData(["settings"], fresh);
      setUser(fresh.user);
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast(message, "success");
      return fresh;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось сохранить настройку", "error");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast("Имя не может быть пустым", "info");
      return;
    }
    setSavingProfile(true);
    try {
      const fresh = await api.patchSettings({
        first_name: name.trim(),
        bio: bio.trim(),
      });
      queryClient.setQueryData(["settings"], fresh);
      setUser(fresh.user);
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      toast("Профиль обновлён", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось обновить профиль", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const addViewer = async (event: FormEvent) => {
    event.preventDefault();
    const value = viewerInput.trim();
    if (!value || addingViewer) return;
    setAddingViewer(true);
    try {
      const fresh = await api.addViewer(value);
      queryClient.setQueryData(["settings"], fresh);
      setViewerInput("");
      toast("Человек добавлен в список доступа", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось добавить человека", "error");
    } finally {
      setAddingViewer(false);
    }
  };

  const removeViewer = async (id: number) => {
    setBusy(`viewer-${id}`);
    try {
      const fresh = await api.removeViewer(id);
      queryClient.setQueryData(["settings"], fresh);
      toast("Доступ отозван", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось убрать доступ", "error");
    } finally {
      setBusy(null);
    }
  };

  const decideRequest = async (id: number, action: "approve" | "decline") => {
    setBusy(`request-${id}`);
    try {
      const fresh =
        action === "approve" ? await api.approveRequest(id) : await api.declineRequest(id);
      queryClient.setQueryData(["settings"], fresh);
      toast(action === "approve" ? "Доступ открыт" : "Заявка отклонена", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось обработать заявку", "error");
    } finally {
      setBusy(null);
    }
  };

  const profileShareUrl = `${window.location.origin}/u/${settings.share_token}`;

  const copyShare = async () => {
    const copied = await copyText(profileShareUrl);
    toast(
      copied ? "Ссылка на профиль скопирована" : "Не удалось скопировать",
      copied ? "success" : "error",
    );
  };

  const shareProfile = async () => {
    const res = await shareUniversal({
      url: profileShareUrl,
      title: `Профиль ${settings.user.display_name} в Sona`,
      text: "Мой музыкальный профиль в Sona",
    });
    toast(
      res.copied ? "Ссылка на профиль скопирована" : "Не удалось скопировать",
      res.copied ? "success" : "error",
    );
  };

  const rotate = async () => {
    const question =
      "Создать новую ссылку? Старая перестанет открывать профиль, а доступ по ней — работать.";
    const confirmed = await confirmDialog(question);
    if (!confirmed) return;
    setBusy("rotate");
    try {
      const fresh = await api.rotateShare();
      queryClient.setQueryData(["settings"], fresh);
      toast("Новая ссылка готова. Старая больше не работает", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Не удалось обновить ссылку", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page settings-page">
      <Link to="/profile" className="back-link">
        <ArrowLeft size={16} />
        Профиль
      </Link>

      <header className="page-heading settings-heading">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={14} /> Приватность и профиль
          </span>
          <h1>Настройки</h1>
          <p>Реши, как звучит твой профиль и кто может его слышать.</p>
        </div>
        <Link to="/profile" className="btn btn--ghost">
          Посмотреть профиль
          <ArrowUpRight size={16} />
        </Link>
      </header>

      <div className="settings-grid">
        <section className="settings-card settings-card--profile">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">01</span>
              <h2>Профиль</h2>
              <p>Имя и пара слов о твоём вкусе.</p>
            </div>
            <Avatar
              name={settings.user.display_name}
              src={settings.user.photo_url}
              size="lg"
              ring
            />
          </div>
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="field">
              <label htmlFor="profile-name">Имя</label>
              <input
                id="profile-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={64}
              />
            </div>
            <div className="field">
              <label htmlFor="profile-bio">
                О себе <span className="field__optional">{bio.length}/160</span>
              </label>
              <textarea
                id="profile-bio"
                className="input input--textarea"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={160}
                rows={3}
                placeholder="Что для тебя музыка?"
              />
            </div>
            <div className="settings-form__footer">
              <span className="settings-form__hint">
                {settings.user.username ? `@${settings.user.username}` : "Telegram username не задан"}
              </span>
              <button type="submit" className="btn btn--primary" disabled={savingProfile}>
                {savingProfile ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </form>
        </section>

        <section className="settings-card">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">02</span>
              <h2>Кто видит профиль</h2>
              <p>Меняется мгновенно для всех гостей.</p>
            </div>
            <span className="tag">{privacyLabel(settings.privacy)}</span>
          </div>
          <div className="privacy-options">
            {privacyOptions.map(({ value, icon: Icon, title, text, tag }) => {
              const active = settings.privacy === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={cn("privacy-option", active && "is-active")}
                  onClick={() =>
                    !active &&
                    void applySettings(
                      { privacy: value },
                      `Доступ обновлён: ${title.toLowerCase()}`,
                      "privacy",
                    )
                  }
                  disabled={busy === "privacy"}
                  aria-pressed={active}
                >
                  <span className="privacy-option__icon">
                    <Icon size={20} />
                  </span>
                  <span className="privacy-option__copy">
                    <span className="privacy-option__title">
                      {title}
                      <em>{tag}</em>
                    </span>
                    <span className="privacy-option__text">{text}</span>
                  </span>
                  <span className={cn("radio", active && "is-on")} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">03</span>
              <h2>Что показывать</h2>
              <p>Даже при открытом профиле можно спрятать детали.</p>
            </div>
          </div>
          <div className="settings-toggles">
            <div className="settings-toggle-row">
              <span className="settings-toggle-row__icon">
                <Headphones size={19} />
              </span>
              <div className="settings-toggle-row__copy">
                <strong>Любимые треки</strong>
                <span>Показывать избранное в публичном профиле</span>
              </div>
              <Toggle
                checked={settings.show_liked}
                onChange={(value) =>
                  void applySettings(
                    { show_liked: value },
                    value ? "Любимые треки снова видны" : "Любимые треки скрыты",
                    "liked",
                  )
                }
                label="Показывать любимые треки"
                disabled={busy === "liked"}
              />
            </div>
            <div className="settings-toggle-row">
              <span className="settings-toggle-row__icon">
                <Sparkles size={19} />
              </span>
              <div className="settings-toggle-row__copy">
                <strong>Плейлисты</strong>
                <span>Показывать публичные подборки в профиле</span>
              </div>
              <Toggle
                checked={settings.show_playlists}
                onChange={(value) =>
                  void applySettings(
                    { show_playlists: value },
                    value ? "Плейлисты снова видны" : "Плейлисты скрыты из профиля",
                    "playlists",
                  )
                }
                label="Показывать плейлисты"
                disabled={busy === "playlists"}
              />
            </div>
          </div>
        </section>

        <section className="settings-card settings-card--access">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">04</span>
              <h2>Доступ и заявки</h2>
              <p>Белый список работает, когда профиль открыт по заявке.</p>
            </div>
            {settings.incoming_requests.length > 0 && (
              <span className="tag tag--accent">{settings.incoming_requests.length} новых</span>
            )}
          </div>

          {settings.incoming_requests.length > 0 && (
            <div className="requests">
              <span className="inline-label">Заявки на просмотр</span>
              {settings.incoming_requests.map((request) => (
                <div key={request.id} className="request-row">
                  <Avatar
                    name={request.requester?.display_name || "Гость"}
                    src={request.requester?.photo_url}
                    size="sm"
                  />
                  <div className="request-row__copy">
                    <strong>{request.requester?.display_name || "Гость Sona"}</strong>
                    <span>
                      {request.requester?.username
                        ? `@${request.requester.username}`
                        : "хочет посмотреть профиль"}
                    </span>
                  </div>
                  <div className="request-row__actions">
                    <button
                      type="button"
                      className="btn btn--small btn--primary"
                      onClick={() => void decideRequest(request.id, "approve")}
                      disabled={busy === `request-${request.id}`}
                    >
                      <Check size={15} /> Пустить
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--soft"
                      onClick={() => void decideRequest(request.id, "decline")}
                      disabled={busy === `request-${request.id}`}
                      aria-label="Отклонить заявку"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form className="viewer-form" onSubmit={addViewer}>
            <label htmlFor="viewer" className="inline-label">
              Добавить по @username или Telegram ID
            </label>
            <div className="viewer-form__row">
              <span className="viewer-form__prefix">@</span>
              <input
                id="viewer"
                value={viewerInput}
                onChange={(event) => setViewerInput(event.target.value)}
                placeholder="username"
                autoComplete="off"
                maxLength={128}
              />
              <button
                type="submit"
                className="btn btn--primary btn--small"
                disabled={addingViewer || !viewerInput.trim()}
              >
                <UserPlus size={15} />
                {addingViewer ? "Добавляем…" : "Добавить"}
              </button>
            </div>
          </form>

          <div className="viewer-list">
            {settings.allowed_viewers.length === 0 ? (
              <div className="viewer-empty">
                <Users size={21} />
                <span>
                  Пока никого нет. Одобренные заявки появятся здесь автоматически.
                </span>
              </div>
            ) : (
              settings.allowed_viewers.map((viewer) => (
                <div key={viewer.id} className="viewer-row">
                  <span className="viewer-row__avatar">
                    {viewer.display_name?.slice(0, 1).toUpperCase() || "G"}
                  </span>
                  <div className="viewer-row__copy">
                    <strong>{viewer.display_name || viewer.identifier_value}</strong>
                    <span>
                      {viewer.identifier_type === "username"
                        ? `@${viewer.identifier_value}`
                        : `ID ${viewer.identifier_value}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn icon-btn--soft"
                    onClick={() => void removeViewer(viewer.id)}
                    disabled={busy === `viewer-${viewer.id}`}
                    aria-label="Убрать из списка доступа"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {settings.outgoing_requests.length > 0 && (
            <div className="outgoing">
              <span className="inline-label">Твои заявки</span>
              {settings.outgoing_requests.slice(0, 4).map((request) => (
                <div key={request.id} className="outgoing-row">
                  <span>{request.owner?.display_name || "Профиль"}</span>
                  <span className={cn("status-chip", `status-chip--${request.status}`)}>
                    {request.status === "pending"
                      ? "ждём ответа"
                      : request.status === "approved"
                        ? "доступ открыт"
                        : "отклонена"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="settings-card settings-card--link">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">05</span>
              <h2>Ссылка на профиль</h2>
              <p>Одна ссылка — и твоя музыка уже у друга в чате.</p>
            </div>
            <span className="link-orb">
              <Link2 size={20} />
            </span>
          </div>
          <div className="share-link">
            <span className="share-link__icon">
              <Globe2 size={17} />
            </span>
            <span className="share-link__value" title={profileShareUrl}>
              {profileShareUrl}
            </span>
            <button type="button" onClick={() => void copyShare()} aria-label="Скопировать ссылку">
              <Copy size={17} />
            </button>
          </div>
          <div className="settings-link-actions">
            <button type="button" className="btn btn--primary" onClick={() => void shareProfile()}>
              <Share2 size={16} />
              Поделиться ссылкой
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void copyShare()}>
              <Copy size={16} />
              Копировать
            </button>
            <Link
              to={`/u/${settings.share_token}`}
              className="btn btn--ghost"
            >
              <ArrowUpRight size={16} />
              Открыть
            </Link>
          </div>
          <div className="share-warning">
            <RefreshCcw size={16} />
            <p>
              Если ссылка попала не туда, создай новую — старая сразу перестанет
              работать.
            </p>
            <button type="button" onClick={() => void rotate()} disabled={busy === "rotate"}>
              {busy === "rotate" ? "Обновляем…" : "Создать новую"}
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">06</span>
              <h2>Акцент профиля</h2>
              <p>Цвет, которым звучит твоя витрина.</p>
            </div>
          </div>
          <div className="accent-picker">
            {accents.map((accent) => (
              <button
                key={accent.value}
                type="button"
                className={cn(
                  "accent-swatch",
                  settings.accent === accent.value && "is-active",
                )}
                onClick={() =>
                  !settings.accent ||
                  settings.accent !== accent.value
                    ? void applySettings(
                        { accent: accent.value },
                        `Акцент: ${accent.label}`,
                        "accent",
                      )
                    : undefined
                }
                style={{ ["--swatch" as string]: accent.color }}
                aria-label={accent.label}
                aria-pressed={settings.accent === accent.value}
              >
                <span />
                {settings.accent === accent.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card settings-card--about">
          <div className="settings-card__head">
            <div>
              <span className="settings-card__index">07</span>
              <h2>О Sona</h2>
              <p>Потоковое воспроизведение и личная медиатека в Telegram.</p>
            </div>
            <span className="about-mark">S</span>
          </div>
          <div className="about-providers">
            {["deezer", "itunes", "spotify", "youtube", "soundcloud"].map((provider) => (
              <span key={provider} className="source-pill">
                {sourceLabel(provider)}
              </span>
            ))}
          </div>
          <p className="about-text">
            Sona объединяет потоковое аудио полной длительности (320 kbps), локальное офлайн-хранилище
            IndexedDB и синхронизацию плейлистов между устройствами внутри Telegram WebApp.
          </p>
          <div className="about-meta">
            <a
              href="https://t.me/vvc667"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--lime)", fontWeight: 600 }}
            >
              По всем вопросам TG @vvc667
            </a>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <span className="settings-footer__mark">sona</span>
        <p>
          <a href="https://t.me/vvc667" target="_blank" rel="noopener noreferrer">
            По всем вопросам TG @vvc667
          </a>{" "}
          · <Link to="/profile">Вернуться в профиль</Link>
        </p>
      </div>
    </div>
  );
}
