# Sona Music — Полное руководство по запуску Telegram Бота и WebApp (Mini App)

Этот архив содержит полностью готовое к продакшену приложение **Sona** (Telegram Mini App + Сервер потокового аудио полной длительности + Serverless Webhook для `@BotFather`).

---

## 1. Как устроен Telegram Serverless в @BotFather?

Внутри `@BotFather` есть встроенная платформа **Telegram Mini Apps (WebApps)** и поддержка **Serverless Webhook**.
Сам Telegram **не хранит файлы вашего сайта на своих серверах** — он выступает как встроенный контейнер и авторизационный шлюз:
1. Фронтенд и Serverless-функции размещаются на бесплатном облачном хостинге с HTTPS (например, **Vercel**, **Cloudflare Pages/Workers**, **Render** или **HuggingFace Spaces**).
2. В `@BotFather` вы указываете ссылку на ваш хостинг (в разделе **Mini Apps / Menu Button**), а бот работает без постоянно включенного сервера (в режиме **Serverless Webhook** через `api/webhook.ts`), просыпаясь только в момент сообщения от пользователя.

---

## 2. Куда бесплатно загрузить бота и WebApp (Без Oracle Cloud)

### Вариант А: Vercel или Cloudflare Pages (Лучший для Serverless + Mini App)
- **Стоимость:** 100% бесплатно, банковская карта не требуется.
- **Плюсы:** Мгновенный HTTPS-домен `.vercel.app` или `.pages.dev`, автоматическая работа `api/webhook.ts` для Telegram бота.
- **Как загрузить:**
  1. Загрузите распакованную папку проекта в свой GitHub-репозиторий (или установите `npm i -g vercel` и выполните `vercel`).
  2. На сайте [vercel.com](https://vercel.com) нажмите **Add New Project** и выберите репозиторий.
  3. В разделе **Environment Variables** добавьте:
     - `TELEGRAM_BOT_TOKEN` = токен от `@BotFather`
     - `WEBAPP_URL` = ваш полученный адрес (например `https://sona-music.vercel.app`)
  4. Нажмите **Deploy**.

### Вариант Б: Render.com или Koyeb (Лучший для полного сервера `server.ts` + `ffmpeg`)
- **Стоимость:** Бесплатный тариф (Free Web Service / Docker).
- **Плюсы:** Запускает полноценный `server.ts` и `Dockerfile` вместе с `ffmpeg` и непрерывным потоковым аудио `/api/stream/:id`.
- **Как загрузить:**
  1. Зайдите на [render.com](https://render.com) -> **New +** -> **Web Service**.
  2. Подключите ваш репозиторий с этим проектом.
  3. Выберите среду **Docker** (в архиве уже лежит готовый `Dockerfile` с `ffmpeg`) или **Node** (`Build Command: npm install && npm run build`, `Start Command: npx tsx server.ts`).
  4. Укажите переменную окружения `TELEGRAM_BOT_TOKEN`.

### Вариант В: HuggingFace Spaces (Docker · 16 GB RAM бесплатно)
- **Стоимость:** Бесплатно навсегда, без привязки карты.
- **Плюсы:** Даёт мощный сервер 2 vCPU / 16 ГБ ОЗУ и прямой HTTPS-адрес `https://ваше-имя-sona.hf.space`.
- **Как загрузить:** Создайте новый Space на [huggingface.co/spaces](https://huggingface.co/spaces), выберите **Docker -> Blank**, укажите порт `3000` в `README.md` (`app_port: 3000`) и загрузите файлы из этого архива.

---

## 3. Пошаговая настройка бота в @BotFather (5 минут)

1. Откройте в Telegram официального бота **[@BotFather](https://t.me/BotFather)**.
2. Отправьте команду `/newbot`, придумайте имя (например, `Sona Music`) и юзернейм с окончанием `bot` (например, `SonaPlayer_bot`).
3. Скопируйте выданный **HTTP API Token** (`123456789:AAH...`).
4. Настройте кнопку запуска плеера (**Menu Button**):
   - Отправьте в `@BotFather` команду `/mybots` -> выберите вашего бота -> **Bot Settings** -> **Menu Button** -> **Configure menu button**.
   - Отправьте HTTPS-ссылку на ваш развернутый WebApp (или используйте готовый адрес предпросмотра).
   - Укажите текст кнопки: `Слушать музыку`.
5. Настройте запуск по прямой ссылке (**Direct Mini App Link**):
   - В `@BotFather` отправьте команду `/newapp`, выберите вашего бота, укажите название `Sona`, загрузите обложку и отправьте ту же HTTPS-ссылку.
   - Теперь ваше приложение открывается по прямой ссылке вида `https://t.me/ВашБот/sona`.
6. Привяжите Webhook в 1 клик:
   - Откройте раздел **«Код и Деплой бота» (`/bot`)** прямо внутри веб-приложения Sona, вставьте ваш токен от `@BotFather` и нажмите **«Привязать Webhook и Кнопку Mini App»** — приложение само вызовет методы Telegram API `setWebhook`, `setMyCommands` и `setChatMenuButton`!
