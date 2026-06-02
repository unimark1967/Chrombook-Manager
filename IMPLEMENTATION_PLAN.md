# План за реализация: Chromebook Management Web Application за училища

## Платформа: Google Workspace for Education Plus

---

## 1. Продуктово резюме

Приложението е уеб-базирана платформа за управление на Chromebook устройства в училищна среда, използваща Google Workspace for Education Plus. Целта е да даде на учителите пълен контрол върху устройствата на учениците в реално време — без да се налага администраторска намеса за всяко действие.

**Основни потребители:**
- Учители — управляват класната стая от браузъра
- Ученици — работят на Chromebook, контролиран от учителя
- Училищни администратори — конфигурират политики, групи и разрешения на системно ниво

**Ключова стойност:**
- Учителят вижда екраните на всички ученици в реално време
- Може да блокира/разблокира сайтове с едно кликване
- Може да заключи устройства, да изпрати съобщение, да сподели екран
- Всичко се случва без ученикът да може да го заобиколи, тъй като контролът идва от Chrome Policy API на ниво домейн

---

## 2. Технически стек

### Frontend
- **Framework:** Next.js 14+ (App Router) — SSR/SSG + React компоненти
- **UI библиотека:** shadcn/ui + Tailwind CSS — модерен, достъпен интерфейс
- **Реално време:** Socket.IO (клиент) или native WebSocket
- **WebRTC:** simple-peer или нативен RTCPeerConnection API
- **Управление на стейт:** Zustand (лек, подходящ за реални обновявания)
- **Charts/Graphs:** Recharts (за Timeline и Dashboard статистики)

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Fastify (препоръчително заради скорост)
- **Реално време:** Socket.IO (сървър)
- **WebRTC Signaling:** отделен lightweight WebSocket сървър (може в същия процес)
- **Task Queue:** BullMQ + Redis (за фонови задачи — изпращане на имейли, история)
- **Автентикация:** NextAuth.js (Google OAuth 2.0 Provider) + JWT сесии

### База данни
- **Основна БД:** PostgreSQL 16 (Supabase или самостоятелна инстанция)
- **ORM:** Prisma (типизирани заявки, лесни миграции)
- **Кеш / Pub-Sub:** Redis (Socket.IO adapter за хоризонтално мащабиране, BullMQ)
- **Файлове/Снимки:** Supabase Storage или Google Cloud Storage (за screenshot буфери)

### Hosting
- **Основно приложение:** Railway.app или Render.com (по-евтино от GCP за старт)
- **Алтернатива:** Google Cloud Run (контейнерно, pay-per-use — подходящо при Scale)
- **БД:** Supabase (управлявана PostgreSQL + Storage + Realtime като бонус)
- **Redis:** Upstash Redis (serverless Redis, безплатен tier достатъчен за MVP)
- **CDN:** Cloudflare (DNS, DDoS защита, edge caching)

### Chrome Extension
- **Manifest Version:** MV3 (задължително от Google)
- **Комуникация:** WebSocket към backend + chrome.* APIs
- **Разпространение:** Google Admin Console (force-install по домейн) + Chrome Web Store

---

## 3. Архитектура

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        CHROMEBOOK MANAGER                                ║
╚══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────┐
│                          УЧИТЕЛ (браузър)                                │
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │            Next.js Web App (Teacher Dashboard)                    │  │
│   │  Dashboard │ Screen Grid │ Chat │ Scenes │ Timeline │ Groups      │  │
│   └───────────────────────┬───────────────────────────────────────────┘  │
│                           │ HTTPS / WebSocket / WebRTC                   │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │      BACKEND           │
                │  ┌──────────────────┐  │
                │  │  Fastify API     │  │◄──── Google OAuth 2.0
                │  │  (REST + WS)     │  │
                │  └────────┬─────────┘  │
                │           │            │
                │  ┌────────▼─────────┐  │
                │  │  Socket.IO       │  │◄──── Chrome Extension (студенти)
                │  │  (Realtime Hub)  │  │
                │  └────────┬─────────┘  │
                │           │            │
                │  ┌────────▼─────────┐  │
                │  │  BullMQ Workers  │  │
                │  │  (email, history)│  │
                │  └────────┬─────────┘  │
                └───────────┼────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
    ┌─────▼──────┐   ┌──────▼─────┐   ┌───────▼──────┐
    │ PostgreSQL │   │   Redis    │   │   Storage    │
    │ (Prisma)   │   │ (Cache +   │   │ (Screenshots │
    │            │   │  Pub-Sub)  │   │  + Files)    │
    └────────────┘   └────────────┘   └──────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
    ┌─────▼──────┐   ┌──────▼─────┐   ┌───────▼────────────┐
    │  Google    │   │  Chrome    │   │  Chrome Extension  │
    │ Admin SDK  │   │ Policy API │   │  (MV3, на всеки    │
    │ Directory  │   │ Mgmt API   │   │   Chromebook)      │
    │ Reports    │   │            │   │                    │
    └────────────┘   └────────────┘   └────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      УЧЕНИК (Chromebook)                                 │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │              Chrome Extension (background service worker)       │   │
│   │  • WebSocket → Backend (получава команди)                       │   │
│   │  • chrome.tabs API (отваря/затваря/фокусира табове)             │   │
│   │  • chrome.desktopCapture / getDisplayMedia (скрийншот)          │   │
│   │  • chrome.notifications (показва съобщения от учителя)          │   │
│   │  • Прилага локални правила за блокиране                         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Chrome Browser ─── Managed by Chrome Policy API (Admin Console)       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Потоци на данни:**

```
[Учител натиска "Заключи всички"]
        │
        ▼
[Next.js изпраща POST /api/session/lock-all]
        │
        ▼
[Fastify API → Socket.IO emit('lock', {roomId}) → всички extension клиенти в стаята]
        │
        ▼
[Chrome Extension получава 'lock' → chrome.tabs.create({url: 'lock-screen.html'})]
        │
        ▼
[Резултатът се логва в PostgreSQL за Timeline]

[Screen Monitoring поток]
        │
[Extension → getDisplayMedia() → canvas.toBlob() → WebSocket binary → Backend → Socket.IO → Teacher Grid]
```

---

## 4. Пълна документация на функционалностите

---

### 4.1 Dashboard с Workspace настройки

**Описание:** Централен панел за управление на политики за цялата организация или конкретни организационни единици (OU).

#### Keyboard Layout управление
- Зарежда текущите keyboard layouts за избрана OU чрез Chrome Policy API
- Позволява избор от предефиниран списък (BG phonetic, BG traditional, EN US, и др.)
- При промяна — изпраща PATCH заявка към Chrome Policy API за съответната OU
- Промяната влиза в сила при следващо device policy refresh (до 90 секунди)

```
GET /api/policies/keyboard?orgUnit=/schools/grade5
  → Chrome Policy API: GET customers/{customerId}/policies
  → Връща JSON с текущи настройки

PATCH /api/policies/keyboard
  Body: { orgUnit: "/schools/grade5", layout: "bg-phonetic" }
  → Chrome Policy API: POST customers/{customerId}/policies:batchModify
```

#### Site Blocking / Allowing
- **URL Allowlist / Blocklist** се управлява чрез Chrome Policy `URLBlocklist` и `URLAllowlist`
- Dashboard показва текущите списъци, разделени по OU
- Поддържат се wildcards: `*.example.com`, `https://example.com/*`
- За незабавно действие — Chrome Extension прилага `chrome.declarativeNetRequest` правила локално

**Приоритет на правилата:**
```
1. Chrome Policy API (Admin Console ниво) — трайни, за цял домейн/OU
2. Chrome Extension declarativeNetRequest — временни, само за текущата сесия/урок
3. Scenes — предефинирани комбинации от горните два
```

#### Usage Policies
- Конфигурация на: времеви ограничения, idle timeout, screenshot честота
- Съхранява се в PostgreSQL (таблица `org_policies`)
- Влияе на поведението на Extension

---

### 4.2 Screen Monitoring

**Описание:** Учителят вижда решетка от миниатюри на екраните на всички ученици в реално време.

#### Режим A: Screenshot Polling (MVP)
- Extension прави `chrome.tabs.captureVisibleTab()` на всеки N секунди (default: 5 сек)
- Компресира до JPEG (quality: 0.5, max 800x600) чрез canvas
- Изпраща binary blob чрез WebSocket към backend
- Backend препраща към Socket.IO стаята на учителя

**Bandwidth изчисление:**
```
30 ученика × 1 screenshot/5сек × ~50KB = ~60KB/сек upload
При съхранение (Timeline): 30 × 720 screenshots/час × 50KB = ~1GB/час
→ Изисква политика за retention
```

#### Режим B: WebRTC Streaming (V2)
- Extension използва `navigator.mediaDevices.getDisplayMedia({video: true})`
- WebRTC peer connection чрез Signaling Server
- Teacher вижда живо видео в `<video>` елемент

**Socket.IO Events:**
```
Extension → Server: emit('screen:frame', { deviceId, classroomId, imageBlob, timestamp })
Server → Teacher:   emit('screen:update', { deviceId, imageBlob, timestamp })
```

**Redis кеш:** `SETEX screen:{deviceId} 30 {base64image}` — не се пише в БД в реално време

**Frontend Grid:**
- CSS Grid с автоматично наредени плочки
- Всяка плочка: снимка, име, активен URL, статус (online/offline/locked)
- Клик → fullscreen изглед
- Цветова индикация: зелено (активен), жълто (idle), червено (заключен), сиво (офлайн)

---

### 4.3 Tab & Browse Control

**Описание:** Учителят управлява дистанционно табовете в браузъра на ученика.

| Команда | Socket.IO Event | Chrome API |
|---|---|---|
| Отвори URL | `tab:open` | `chrome.tabs.create({url})` |
| Затвори таб | `tab:close` | `chrome.tabs.remove(tabId)` |
| Фокусирай таб | `tab:focus` | `chrome.tabs.update(tabId, {active: true})` |
| Затвори всички | `tab:closeAll` | `chrome.tabs.query({}) → remove([ids])` |
| Отвори за всички | `tab:openAll` | broadcast към всички в класа |
| Вземи списък | `tab:list` | `chrome.tabs.query({})` |

**Tab синхронизация:**
- Extension изпраща `tab:list:update` при всяка промяна (onCreated, onRemoved, onUpdated)
- Кеш в Redis: `SETEX tabs:{deviceId} 60 {JSON}`
- Teacher вижда иконка и заглавие на всеки таб в реално време

---

### 4.4 Scenes

**Описание:** Предефинирани конфигурации, прилагани с едно кликване за целия клас или група.

**Примерни Scene-ове:**
- "Тест режим" — блокира всичко освен конкретен URL
- "Свободна работа" — позволява образователни сайтове
- "Без интернет" — блокира всички URL
- "Пълен достъп" — премахва всички ограничения

**БД структура:**
```sql
Table: scenes
  id            UUID PRIMARY KEY
  name          VARCHAR(100)
  created_by    UUID → users.id
  org_id        UUID → organizations.id
  is_global     BOOLEAN

Table: scene_rules
  id            UUID PRIMARY KEY
  scene_id      UUID → scenes.id
  rule_type     ENUM('url_block', 'url_allow', 'tab_limit', 'lock')
  value         JSONB
  priority      INTEGER
```

**Прилагане:**
```
POST /api/classroom/{id}/scene → { sceneId }
Backend:
1. Зарежда scene_rules от БД
2. Chrome Policy API batchModify (за трайни правила)
3. Socket.IO emit('scene:apply', { rules }) → Extension-ите
4. Extension: chrome.declarativeNetRequest.updateDynamicRules()
5. Логва scene_activation в session_events
```

---

### 4.5 Device Lock

**Описание:** Учителят заключва едно или всички устройства незабавно.

| Вид | Описание | Имплементация |
|---|---|---|
| Soft Lock | Overlay в браузъра | Extension → fullscreen HTML page |
| Hard Lock | ChromeOS screen lock | Chrome Policy API |
| Tab Lock | Само определени табове | Extension → затваря всички, оставя един |

**Soft Lock поток:**
```
POST /api/classroom/{id}/lock → { target: 'all' | deviceId, message }
→ Socket.IO emit('device:lock', { message })
→ Extension:
   a. chrome.tabs.create({ url: chrome-extension://[id]/lock.html, active: true })
   b. Мониторира onActivated — незабавно се връща при смяна на таб
   c. Мониторира onFocusChanged — заключва нови прозорци
```

**Защита срещу заобикаляне:**
- `chrome.tabs.onCreated` — всеки нов таб получава lock overlay
- `chrome.windows.onCreated` — нови прозорци също се заключват
- При загуба на WebSocket — остава в locked state докато не получи unlock

---

### 4.6 Custom Groups

**Описание:** Учениците се организират в подгрупи с различни правила.

**БД структура:**
```sql
Table: groups
  id          UUID PRIMARY KEY
  name        VARCHAR(100)
  classroom_id UUID → classrooms.id
  scene_id    UUID → scenes.id
  color       VARCHAR(7)

Table: group_members
  group_id    UUID → groups.id
  device_id   UUID → devices.id
  student_id  UUID → users.id
```

**Dashboard:**
- Ученици в Screen Grid с цветен бордър по група
- Drag-and-drop за преместване между групи
- Команди (lock, navigate, chat) към конкретна група

**Socket.IO routing:**
```
Всеки device е в room `device:{id}` и `classroom:{id}`
Групова команда → emit само към device_ids от group_members
```

---

### 4.7 Two-Way Chat

**Описание:** Учителят комуникира с отделни ученици или с целия клас.

| Тип | Описание |
|---|---|
| Announcement | Broadcast до целия клас — Chrome notification |
| Private message | До конкретен ученик — overlay панел |
| Quick reactions | "имам въпрос", "готов съм", "нужна ми е помощ" |

**Events:**
```
Teacher → Server: emit('chat:send', { to: 'all'|studentId, message, type })
Server → Extension: emit('chat:receive', { from, message, type, timestamp })

Extension:
  announcement → chrome.notifications.create(...)
  private → content script overlay в активния таб
```

**БД:**
```sql
Table: chat_messages
  id, session_id, from_user, to_user (NULL=broadcast),
  message, type ENUM('announcement','private','reaction'),
  sent_at, read_at
```

---

### 4.8 Screen Share

**Описание:** Учителят споделя своя екран към класа. Опционално — ученик споделя към класа.

**Архитектура: LiveKit SFU** (за 30+ ученика P2P не е подходящо)

**Варианти:**
- **LiveKit** (self-hosted или cloud) — препоръчително, open-source
- **Mediasoup** — self-hosted, пълен контрол
- **Daily.co** — managed, платено

**Поток Teacher → Class:**
```
1. Teacher: navigator.mediaDevices.getDisplayMedia()
2. Свързва се с LiveKit room (JWT от backend)
3. Публикува video track
4. Backend → emit('screenshare:start', { roomToken }) → Extension-ите
5. Extension отваря viewer.html?token={JWT} → fullscreen видео
```

**STUN/TURN:**
```
STUN (безплатно): stun:stun.l.google.com:19302
TURN (задължително в училищни мрежи с firewall):
  - Coturn self-hosted (~$10/мес)
  - Metered.ca (50GB безплатно)
```

---

### 4.9 Teacher Override

**Описание:** Временен достъп до конкретен сайт за определено време, без IT намеса.

```
POST /api/classroom/{id}/override
Body: { target: 'student'|'all', studentId?, url, duration: 300 }

Backend:
1. Записва в teacher_overrides таблица
2. emit('override:add', { url, expiresAt }) → Extension
3. Extension: declarativeNetRequest — allow правило с висок приоритет
4. BullMQ delayed job за след N секунди
5. При изтичане: emit('override:remove') → Extension премахва правилото
```

**БД:**
```sql
Table: teacher_overrides
  id, session_id, granted_by, target_device (NULL=all),
  url_pattern, granted_at, expires_at, revoked_at
```

**Dashboard:** Списък с активни override-и + countdown + бутон "Отмени"

---

### 4.10 Timeline / Session History

**Описание:** Запис на всички активности по време на урока. Изпращане на отчет до родители.

**Събирани данни:**
- URL на всеки посетен сайт (`chrome.tabs.onUpdated`)
- Продължителност на визита
- Screenshot при посещение (опционално)
- Приложени Scene-ове, Override-и, Lock/Unlock, Chat

**Extension събиране:**
```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    socket.emit('history:visit', { deviceId, url, title, timestamp, tabId })
  }
})
```

**БД:**
```sql
Table: browsing_history
  id, session_id, device_id, student_id,
  url, page_title, visited_at, left_at, screenshot_url

Table: session_events
  id, session_id, event_type ENUM('lock','unlock','scene_change','override','tab_open','chat'),
  actor_id, target_id, payload JSONB, occurred_at
```

**Email до родители:**
```
POST /api/sessions/{id}/report
Body: { studentIds: [...], includeScreenshots: false }

Backend:
1. Генерира HTML отчет (Handlebars template)
2. Guardian email от Directory API → student profile
3. BullMQ job → Gmail API или Resend.com
4. Записва report_sent в БД
```

---

## 5. Пълен списък с необходими API-та

### 5.1 Google Admin SDK — Directory API

**Base URL:** `https://admin.googleapis.com/admin/directory/v1`

| Endpoint | Използване | Scope |
|---|---|---|
| `GET /users` | Ученици и учители | `auth/admin.directory.user.readonly` |
| `GET /orgUnits` | Списък с OU | `auth/admin.directory.orgunit.readonly` |
| `GET /devices/chromeos` | Списък с устройства | `auth/admin.directory.device.chromeos.readonly` |
| `POST /devices/chromeos/{id}/action` | Lock/Unlock на OS ниво | `auth/admin.directory.device.chromeos` |

### 5.2 Chrome Policy API

**Base URL:** `https://chromepolicy.googleapis.com/v1`

| Endpoint | Използване | Scope |
|---|---|---|
| `POST /customers/{id}/policies:resolve` | Четене на политики | `auth/chrome.management.policy.readonly` |
| `POST /customers/{id}/policies:batchModify` | Промяна на политики | `auth/chrome.management.policy` |
| `POST /customers/{id}/policies:batchInherit` | Наследяване от parent OU | `auth/chrome.management.policy` |
| `GET /customers/{id}/policySchemas` | Налични политики | `auth/chrome.management.policy.readonly` |

**Важни Policy namespaces:**
```
chrome.users.UrlBlocking     → URLBlocklist
chrome.users.UrlAllowlist    → URLAllowlist
chrome.users.SafeBrowsing    → Safe Browsing
chrome.devices.kiosk         → Kiosk mode
chrome.users.apps            → App permissions
```

### 5.3 Chrome Management API

**Base URL:** `https://chromemanagement.googleapis.com/v1`

| Endpoint | Използване | Scope |
|---|---|---|
| `GET /customers/{id}/telemetry/devices` | Hardware, battery, CPU | `auth/chrome.management.telemetry.readonly` |
| `GET /customers/{id}/reports/countChromeVersions` | Chrome OS версии | `auth/chrome.management.reports.readonly` |
| `GET /customers/{id}/apps` | Инсталирани приложения | `auth/chrome.management.appdetails.readonly` |

### 5.4 Admin SDK Reports API

**Base URL:** `https://admin.googleapis.com/admin/reports/v1`

| Endpoint | Използване | Scope |
|---|---|---|
| `GET /activity/users/{email}/applications/chrome` | Chrome activity log | `auth/admin.reports.audit.readonly` |
| `GET /usage/dates/{date}` | Usage statistics | `auth/admin.reports.usage.readonly` |

### 5.5 Пълен списък OAuth Scopes

```
# Организация — четене
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/admin.directory.orgunit.readonly
https://www.googleapis.com/auth/admin.directory.device.chromeos.readonly
https://www.googleapis.com/auth/admin.directory.group.readonly

# Управление на устройства
https://www.googleapis.com/auth/admin.directory.device.chromeos

# Chrome Policy
https://www.googleapis.com/auth/chrome.management.policy
https://www.googleapis.com/auth/chrome.management.policy.readonly

# Телеметрия и отчети
https://www.googleapis.com/auth/chrome.management.telemetry.readonly
https://www.googleapis.com/auth/admin.reports.audit.readonly
https://www.googleapis.com/auth/admin.reports.usage.readonly

# Gmail (отчети до родители)
https://www.googleapis.com/auth/gmail.send

# OAuth Login
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
openid
```

---

## 6. Регистрации и акаунти — Стъпка по стъпка

### Стъпка 1: Google Cloud Console Project

1. Отвори `console.cloud.google.com`
2. "New Project" → Дай му название (напр. "Chromebook Manager Prod")
3. Запиши **Project ID**
4. "APIs & Services" → "Enable APIs" → активирай:
   - Admin SDK API
   - Chrome Management API
   - Chrome Policy API
   - Gmail API
   - People API

### Стъпка 2: OAuth Consent Screen

1. "APIs & Services" → "OAuth consent screen"
2. Избери **"Internal"** (само потребители от домейна на училището)
3. Попълни: App name, support email, authorized domains
4. Добави всички scopes от Секция 5.5
5. При "Internal" — не е нужен Google review процес
6. За продажба на различни домейни → "External" → Google review (2-4 седмици)

### Стъпка 3: OAuth 2.0 Client ID

1. "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: **Web application**
3. Authorized JavaScript origins:
   ```
   https://yourdomain.com
   http://localhost:3000
   ```
4. Authorized redirect URIs:
   ```
   https://yourdomain.com/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```
5. Запиши **Client ID** и **Client Secret** → добави в `.env`

### Стъпка 4: Service Account

1. "Credentials" → "Create Credentials" → "Service Account"
2. Name: "chromebook-manager-sa"
3. След създаването: "Keys" → "Add Key" → **JSON**
4. Запиши JSON файла сигурно (**никога не го commit-вай в git!**)
5. Запиши **Service Account Email**

### Стъпка 5: Domain-Wide Delegation (КРИТИЧНО)

Позволява на Service Account-а да действа от името на всеки потребител в домейна.

1. **Google Admin Console** (`admin.google.com`) като Super Admin
2. "Security" → "Access and data control" → "API controls"
3. "Manage Domain Wide Delegation" → "Add new"
4. Client ID: от Service Account JSON (полето `client_id`)
5. OAuth Scopes — всички от Секция 5.5 като comma-separated:
   ```
   https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.device.chromeos,https://www.googleapis.com/auth/chrome.management.policy,https://www.googleapis.com/auth/chrome.management.policy.readonly,https://www.googleapis.com/auth/admin.reports.audit.readonly,https://www.googleapis.com/auth/gmail.send
   ```
6. "Authorize" → изчакай 15-30 минути

### Стъпка 6: Chrome Web Store Developer Account

1. `chrome.google.com/webstore/devconsole`
2. Еднократна такса **$5 USD** с кредитна карта
3. Попълни профила на разработчика
4. При публикуване: Privacy Policy URL (задължително), icons, screenshots

**Алтернатива без Web Store:** Force-install с .crx файл или external update URL — за затворени домейни

### Стъпка 7: Force-Install Extension от Admin Console

1. Admin Console → "Devices" → "Chrome" → "Apps & Extensions"
2. Избери OU (например /Students)
3. "+" → "Add from Chrome Web Store" (или "Add by ID")
4. "Force install"
5. Extension се инсталира автоматично при следващ login

### Стъпка 8: Hosting регистрации

**Railway.app:**
1. `railway.app` → Sign up with GitHub
2. "New Project" → "Deploy from GitHub repo"
3. Добави Redis plugin
4. Конфигурирай environment variables

**Supabase:**
1. `supabase.com` → "New Project" → регион **EU - Frankfurt** (GDPR!)
2. Запиши: Database URL, API URL, anon key, service_role key
3. Enable Row Level Security (RLS) на всички таблици

**Cloudflare:**
1. `cloudflare.com` → Add Site
2. Промени nameservers при домейн регистратора
3. Enable "Always Use HTTPS", "HSTS"

### Стъпка 9: Email Service

**Вариант A: Gmail API** (препоръчително — вече е конфигуриран)
- Изпраща от школски имейл
- Безплатно, лимит 2000 имейла/ден

**Вариант B: Resend.com**
1. `resend.com` → Sign up
2. "Add Domain" → верифицирай с DNS записи
3. Генерирай API Key
4. Безплатен tier: 3000 имейла/месец

---

## 7. Chrome Extension план

### Структура

```
chrome-extension/
├── manifest.json
├── background/
│   └── service-worker.js    ← Основна логика, WebSocket, команди
├── content-scripts/
│   ├── chat-overlay.js      ← Overlay за чат съобщения
│   └── lock-overlay.js      ← Overlay при заключване
├── pages/
│   ├── lock.html            ← Fullscreen lock страница
│   ├── viewer.html          ← Screen share viewer
│   └── share.html           ← Screen share presenter
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── rules/
    └── static_rules.json
```

### manifest.json — пълни permissions

```json
{
  "manifest_version": 3,
  "name": "Chromebook Manager Student Agent",
  "version": "1.0.0",
  "description": "Управление на Chromebook за образователни цели",
  
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  
  "permissions": [
    "tabs",
    "tabCapture",
    "desktopCapture",
    "activeTab",
    "storage",
    "notifications",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "scripting",
    "windows",
    "alarms",
    "offscreen",
    "identity"
  ],
  
  "host_permissions": ["<all_urls>"],
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-scripts/chat-overlay.js"],
      "run_at": "document_idle"
    }
  ],
  
  "declarative_net_request": {
    "rule_resources": [
      { "id": "static_ruleset", "enabled": true, "path": "rules/static_rules.json" }
    ]
  },
  
  "web_accessible_resources": [
    { "resources": ["pages/*.html", "icons/*"], "matches": ["<all_urls>"] }
  ],
  
  "externally_connectable": {
    "matches": ["https://yourdomain.com/*"]
  }
}
```

### Service Worker — команди

| Socket.IO Event | Действие |
|---|---|
| `device:lock` | Отваря lock.html, мониторира tabs/windows |
| `device:unlock` | Затваря lock.html |
| `tab:open` | `chrome.tabs.create({ url })` |
| `tab:close` | `chrome.tabs.remove(tabId)` |
| `tab:closeAll` | Затваря всички освен Extension pages |
| `tab:focus` | `chrome.tabs.update(tabId, {active: true})` |
| `scene:apply` | `chrome.declarativeNetRequest.updateDynamicRules()` |
| `override:add` | Добавя allow правило с висок приоритет |
| `override:remove` | Премахва allow правилото |
| `chat:receive` | `chrome.notifications.create()` или overlay |
| `screenshare:start` | Отваря viewer.html с LiveKit token |
| `screenshot:request` | `chrome.tabs.captureVisibleTab()` → emit frame |

**Heartbeat (MV3 Service Worker не е persistent):**
```javascript
chrome.alarms.create('heartbeat', { periodInMinutes: 0.5 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') {
    if (!wsConnected) reconnectWebSocket()
    sendHeartbeat()
  }
})
```

**Managed Policy от Admin Console:**
```json
{
  "serverUrl": { "Value": "wss://api.yourdomain.com" },
  "deviceId": { "Value": "{{device_id}}" },
  "orgUnit": { "Value": "{{device_ou}}" }
}
```

---

## 8. Фази на разработка

### Фаза 0: Подготовка (1-2 седмици)
- Всички регистрации по Секция 6
- Setup на development среда
- Prisma схема + initial migrations
- NextAuth.js с Google Provider
- CI/CD pipeline (GitHub Actions → Railway)
- Monorepo структура: `/web`, `/api`, `/extension`

### Фаза 1: MVP (6-8 седмици)

| Функционалност | Оценка |
|---|---|
| Google Login + роли (teacher/student) | 3 дни |
| Chrome Extension базов (WebSocket + heartbeat) | 4 дни |
| Screen Monitoring (screenshot polling) | 5 дни |
| Tab Control (open/close/focus) | 3 дни |
| Device Lock (soft lock) | 3 дни |
| Basic Chat (broadcast announcements) | 3 дни |
| Dashboard базов (screen grid + device list) | 4 дни |
| URL Block/Allow (Extension declarativeNetRequest) | 3 дни |
| Classroom Session (старт/край) | 2 дни |

**Deliverable:** Учителят стартира урок, вижда екраните, заключва устройства, изпраща съобщения.

### Фаза 2: V1 — Пълни функции (8-10 седмици)

| Функционалност | Оценка |
|---|---|
| Chrome Policy API интеграция | 5 дни |
| Scenes (създаване, прилагане) | 5 дни |
| Custom Groups (drag-and-drop) | 4 дни |
| Teacher Override (countdown) | 3 дни |
| Two-Way Chat (private + reactions) | 4 дни |
| Timeline / Session History | 6 дни |
| Screen Share Teacher→Class (LiveKit) | 5 дни |
| Email отчети до родители | 3 дни |
| Admin Panel (учители, OU mapping) | 4 дни |
| Directory API синхронизация | 3 дни |

### Фаза 3: V2 — Разширени функции (6-8 седмици)

| Функционалност | Оценка |
|---|---|
| WebRTC Screen Monitoring (живо видео) | 7 дни |
| Student→Class Screen Share | 4 дни |
| Quick Poll / Quiz | 5 дни |
| Mobile App за учителя (PWA) | 10 дни |
| Advanced Analytics | 5 дни |
| Multi-school SaaS (tenant изолация) | 8 дни |
| AI (автоматично детектиране off-task) | 8 дни |

**Обща времева линия:**
```
Месец 1:   Фаза 0 + MVP
Месец 2-3: V1
Месец 4-5: V2
Месец 6+:  SaaS и мащабиране
```

---

## 9. Сигурност и GDPR

### Автентикация и авторизация
- Само потребители от одобрения Workspace домейн (OAuth "hd" claim проверка)
- JWT токени (15 мин) + refresh tokens в HttpOnly cookies
- RBAC: `super_admin`, `school_admin`, `teacher`, `student`
- Extension токени: краткотрайни, device-bound

### GDPR — Задължителни мерки

**Категории данни:**
- Имена и имейли на ученици
- История на сърфиране (чувствителни — непълнолетни)
- Снимки на екрана

**Мерки:**
1. **Родителско съгласие** преди Screen Monitoring и История
2. **Политика за задържане:**
   ```
   История на сърфиране: 30 дни
   Screenshots: 7 дни
   Chat: 90 дни
   Session events: 1 година
   ```
3. **Право на достъп** — родителите могат да поискат report
4. **Право на изтриване** — Admin изтрива всички данни за ученик
5. **DPA** с всеки доставчик (Supabase, Railway, Google)
6. **Хостинг в ЕС** — EU Frankfurt задължително

### Технически мерки
- TLS 1.3 навсякъде (HTTPS, WSS)
- WebSocket auth: JWT при handshake
- Rate limiting: 100 req/мин API, 10 req/мин auth
- Prisma parameterized queries (SQL injection защита)
- Content Security Policy headers
- CORS само за одобрени origins
- Secrets в environment variables, никога в код
- Audit log за всяко admin действие
- Service Account key ротация на 90 дни

---

## 10. Estimated Costs

### Google APIs
Всички **безплатни** при Education Plus лиценз.
Chrome Web Store Developer акаунт: **$5 еднократно**

### Hosting (MVP — до 500 ученика)

| Услуга | Цена/месец |
|---|---|
| Railway.app (Backend) | $5 |
| Supabase Pro (PostgreSQL + Storage) | $25 |
| Upstash Redis | ~$0-5 |
| LiveKit Cloud Starter | $0 (25GB included) |
| Cloudflare Free | $0 |
| Домейн (.com) | ~$1 (amortized) |
| **Общо MVP** | **~$35-40/мес** |

### Hosting (Production — 5000 ученика)

| Услуга | Цена/месец |
|---|---|
| Railway Team / Cloud Run | $50-100 |
| Supabase Pro + compute | $50-100 |
| Upstash Redis Pro | $20 |
| LiveKit Cloud Scale | $50-100 |
| Coturn self-hosted TURN | $10 |
| Resend.com Pro (email) | $20 |
| Cloudflare Pro | $25 |
| **Общо Production** | **~$225-375/мес** |

### SaaS Pricing пример
```
Starter (до 100 ученика):  €99/месец
School  (до 500 ученика):  €299/месец
District(до 5000 ученика): €799/месец

Break-even: 2-3 "School" плана покриват Production разходите
```

---

## Обобщение — следващи стъпки

```
1. [ВЕДНАГА]    Регистрирай Google Cloud Project + OAuth
2. [ВЕДНАГА]    Регистрирай Chrome Web Store ($5)
3. [ВЕДНАГА]    Създай Supabase проект в EU регион
4. [СЕДМИЦА 1]  Service Account + Domain-Wide Delegation с IT администратора
5. [СЕДМИЦА 1]  Next.js проект + NextAuth.js Google Login
6. [СЕДМИЦА 2]  Базов Extension (WebSocket + heartbeat)
7. [СЕДМИЦА 3]  Screen Grid (screenshot polling)
8. [СЕДМИЦА 4]  Device Lock + Tab Control
9. [СЕДМИЦА 5-6] Тест с реален клас
10. [СЛЕД ТЕСТ] Итерирай по feedback → V1
```

---

*Документ версия 1.0 — Юни 2026*
*Google API endpoints и scopes са актуални към датата на документа.*
