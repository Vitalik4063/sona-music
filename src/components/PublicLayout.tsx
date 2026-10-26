import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { PlayerLayer } from "./PlayerLayer";

export function PublicLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="public-shell">
      <header className="public-header">
        <Logo />
        <div className="public-header__right">
          <span className="public-header__label">музыкальный профиль</span>
          <Link to="/" className="btn btn--small btn--ghost">
            В Sona
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer">
        <div>
          <span className="public-footer__mark">sona</span>
          <span>музыка, которая звучит как ты</span>
        </div>
        <span>
          <a
            href="https://t.me/vvc667"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--lime)", fontWeight: 600 }}
          >
            По всем вопросам TG @vvc667
          </a>
        </span>
      </footer>
      <PlayerLayer />
    </div>
  );
}
