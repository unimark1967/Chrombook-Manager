# Chromebook Manager

Система за управление на Chromebook устройства в класната стая в реално време.

## Архитектура

Монорепо с три части:

| Директория  | Технология            | Порт  |
|-------------|----------------------|-------|
| `web/`      | Next.js 14           | 3000  |
| `api/`      | Fastify + Socket.IO  | 3001  |
| `extension/`| Chrome MV3           | —     |

## Изисквания

- Node.js 20+
- npm 10+
- Redis (локален или Upstash)
- Supabase проект (вече е конфигуриран: `vabswywpsrlelxbixdun`)
- Google Workspace акаунт с Admin SDK достъп

## Бърз старт

### 1. Инсталиране на зависимости

```bash
npm install
```

### 2. Конфигурация на средата

```bash
cp web/.env.example web/.env.local
cp api/.env.example api/.env
```

Попълнете всички стойности в двата `.env` файла.

### 3. Инициализиране на базата данни

```bash
cd web
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Стартиране в режим разработка

```bash
# В главната директория
npm run dev
```

Това стартира едновременно `web` (порт 3000) и `api` (порт 3001).

## Конфигурация на Google OAuth

1. Отидете в [Google Cloud Console](https://console.cloud.google.com/)
2. Създайте OAuth 2.0 credentials
3. Добавете `http://localhost:3000/api/auth/callback/google` като Authorized redirect URI
4. Копирайте Client ID и Client Secret в `web/.env.local`

## Конфигурация на Google Admin SDK

1. Създайте Service Account в Google Cloud Console
2. Активирайте Domain-Wide Delegation
3. Добавете следните scopes в Google Workspace Admin Console:
   - `https://www.googleapis.com/auth/admin.directory.device.chromeos`
   - `https://www.googleapis.com/auth/chrome.management.policy`
4. Запазете ключа като `api/service-account.json`

## Инсталиране на разширението

1. Отворете `chrome://extensions/`
2. Включете "Developer mode"
3. Натиснете "Load unpacked" и изберете директорията `extension/`

За продуктивна среда публикувайте разширението в Chrome Web Store или разпространете чрез Google Admin Console (Force Install).

## Структура на проекта

```
chromebook-manager/
├── web/                    # Next.js приложение
│   ├── src/
│   │   ├── app/            # App Router страници
│   │   ├── components/     # React компоненти
│   │   └── lib/            # Помощни функции (auth, prisma, supabase)
│   └── prisma/
│       └── schema.prisma   # Схема на базата данни
├── api/                    # Fastify API сървър
│   └── src/
│       ├── socket/         # Socket.IO handlers
│       ├── routes/         # REST endpoints
│       └── services/       # Google Admin SDK
└── extension/              # Chrome MV3 разширение
    ├── background/         # Service Worker
    ├── content-scripts/    # Chat overlay
    ├── pages/              # Lock страница
    └── rules/              # declarativeNetRequest rules
```

## Deployment

- **Web**: Vercel (автоматичен деплой от main branch)
- **API**: Railway / Render / Docker
- **Redis**: Upstash (безсървърен Redis)
- **DB**: Supabase PostgreSQL (eu-central-1, Frankfurt)
