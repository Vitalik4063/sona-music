import { useEffect, useRef } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoadingScreen } from "./components/Loading";
import { Logo } from "./components/Logo";
import { PublicLayout } from "./components/PublicLayout";
import { getStartParam } from "./telegram";
import { useAuth } from "./state/AuthContext";
import { HomePage } from "./pages/HomePage";
import { LikesPage } from "./pages/LikesPage";
import { LibraryPage } from "./pages/LibraryPage";
import { MixPage } from "./pages/MixPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlaylistPage } from "./pages/PlaylistPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicPlaylistPage } from "./pages/PublicPlaylistPage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ImportPage } from "./pages/ImportPage";
import { OfflinePage } from "./pages/OfflinePage";
import { NeuroSciencePage } from "./pages/NeuroSciencePage";

function AuthGate() {
  const { user, loading, error } = useAuth();

  if (loading) return <LoadingScreen />;
  if (error || !user) {
    return (
      <div className="auth-screen">
        <span className="auth-screen__rings" aria-hidden="true" />
        <Logo />
        <span className="eyebrow">Sona · Telegram Mini App</span>
        <h1>Не удалось открыть профиль</h1>
        <p>{error || "Сессия не создалась. Попробуй открыть приложение ещё раз."}</p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
        <small>
          Sona открывается внутри Telegram. Проверь, что бот настроен и соединение
          с сервером доступно.
        </small>
      </div>
    );
  }
  return <AppShell />;
}

function StartParamRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const param = getStartParam();
    const match = /^u_([A-Za-z0-9-]+)(?:_p_(\d+))?$/.exec(param);
    if (!match) return;
    handled.current = true;
    const target = `/u/${match[1]}${match[2] ? `/p/${match[2]}` : ""}`;
    if (pathname !== target) navigate(target, { replace: true });
  }, [navigate, pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <StartParamRedirect />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/u/:token" element={<PublicProfilePage />} />
          <Route path="/u/:token/p/:playlistId" element={<PublicPlaylistPage />} />
          <Route path="/u/:token/playlist/:playlistId" element={<PublicPlaylistPage />} />
        </Route>

        <Route element={<AuthGate />}>
          <Route index element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/likes" element={<LikesPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/science" element={<NeuroSciencePage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/mix/:id" element={<MixPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
