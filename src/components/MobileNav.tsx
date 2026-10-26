import { NavLink } from "react-router-dom";
import { Heart, House, Library, Search, UserRound } from "lucide-react";
import { cn } from "../utils";

const items = [
  { to: "/", label: "Главная", icon: House, end: true },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/library", label: "Коллекция", icon: Library },
  { to: "/likes", label: "Избранное", icon: Heart },
  { to: "/profile", label: "Профиль", icon: UserRound },
];

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Мобильная навигация">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn("mobile-nav__item", isActive && "is-active")}
        >
          <Icon size={21} strokeWidth={1.9} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
