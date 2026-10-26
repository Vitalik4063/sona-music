import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Search, Settings2 } from "lucide-react";
import { canUseTelegramVersion, telegram } from "../telegram";
import { useAuth } from "../state/AuthContext";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { PlayerLayer } from "./PlayerLayer";
import { Sidebar } from "./Sidebar";
import { Link } from "react-router-dom";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    if (!canUseTelegramVersion("6.1")) return;
    const back = telegram?.BackButton;
    if (!back) return;
    const onBack = () => navigate(-1);
    const visible = location.pathname !== "/";
    if (visible) {
      back.show();
      back.onClick(onBack);
    } else {
      back.hide();
    }
    return () => {
      back.offClick(onBack);
    };
  }, [location.pathname, navigate]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="mobile-header">
          <Logo compact />
          <div className="mobile-header__actions">
            <Link to="/search" className="icon-btn" aria-label="Поиск">
              <Search size={20} />
            </Link>
            <Link to="/profile" className="mobile-header__avatar" aria-label="Профиль">
              <Avatar
                name={user?.display_name || "Sona"}
                src={user?.photo_url}
                size="sm"
              />
              <span className="mobile-header__status" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className="page">
          <Outlet />
          <footer
            style={{
              marginTop: "36px",
              padding: "18px 20px 28px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              fontSize: "12px",
              color: "var(--muted)",
            }}
          >
            <span>Sona · Музыкальное пространство в Telegram</span>
            <span>
              По всем вопросам TG{" "}
              <a
                href="https://t.me/vvc667"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--lime)", fontWeight: 600 }}
              >
                @vvc667
              </a>
            </span>
          </footer>
        </main>
      </div>
      <MobileNav />
      <PlayerLayer />
      <Link to="/settings" className="desktop-settings" aria-label="Настройки">
        <Settings2 size={17} />
      </Link>
    </div>
  );
}
