import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="not-found">
      <span className="not-found__rings" aria-hidden="true" />
      <span className="not-found__code">404</span>
      <span className="eyebrow">
        <Compass size={14} /> Потерялись в звуке
      </span>
      <h1>Такой страницы нет</h1>
      <p>Возможно, ссылка устарела или трек уже нашёл новый дом.</p>
      <Link to="/" className="btn btn--primary">
        Вернуться на главную
      </Link>
    </div>
  );
}
