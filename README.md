# EventMind AI

**Turn anything into a calendar event.** Paste text, drop an image, upload a PDF, or share an email — EventMind extracts the event details with AI and exports a perfect entry to Apple, Google, or Outlook Calendar.

Live preview: run `npm run dev` and open http://localhost:8080

---

## ✨ Features

- **Universal input** — plain text, images (OCR via vision), PDFs, emails, URLs
- **AI extraction** — single or multi-event, powered by your choice of AI provider (Google Gemini, OpenAI, Anthropic, OpenRouter)
- **Smart review** — duplicate + conflict detection before you save
- **Dashboard** — history, search, favorites, usage stats
- **Natural-language editing** — "move this to Friday at 3pm" via chat assistant
- **Calendar export** — `.ics` download + Google/Outlook one-click URLs
- **Auth** — email/password (auto-confirmed) and Google OAuth
- **Roles** — `admin` (single fixed account), `pro` (unlimited), `user` (20 free extractions)
- **Pro requests** — free users open a pre-filled mailto to the admin; admin can grant/revoke Pro by email from the dashboard
- **PWA** — installable on iOS/Android with browser notifications for upcoming events
- **Responsive** — phone, tablet, desktop

## 🧱 Tech Stack

- **Framework:** TanStack Start v1 (React 19 + Vite 8, SSR on Vercel)
- **Routing/Data:** TanStack Router + TanStack Query
- **UI:** Tailwind CSS v4, shadcn/ui, Lucide icons, Sora + Inter fonts
- **Backend:** Supabase (Postgres, Auth, RLS)
- **AI:** Provider abstraction layer (default: Google Gemini, supports OpenAI, Anthropic, OpenRouter)
- **Package manager:** Bun (fallback: npm)

## 📁 Project Layout

```
src/
├── routes/                    # File-based routing
│   ├── __root.tsx             # Root shell (head, PWA meta, providers)
│   ├── index.tsx              # Landing + universal extractor
│   ├── auth.tsx               # Sign in / sign up
│   ├── _authenticated/        # Protected subtree
│   │   ├── route.tsx          # Auth gate
│   │   └── dashboard.tsx      # History, Pro request, admin panel, PWA install
│   └── sitemap[.]xml.ts
├── lib/
│   ├── ai-provider.ts         # Provider abstraction (Gemini, OpenAI, Anthropic, OpenRouter)
│   ├── extract.functions.ts   # AI extraction (server fn)
│   ├── events.functions.ts    # Event CRUD + quota
│   ├── chat.functions.ts      # Natural-language edit
│   ├── pro.functions.ts       # Pro requests + admin grant
│   ├── calendar.ts            # .ics + Google/Outlook URL builders
│   ├── pwa.ts                 # Install prompt + notifications
│   └── auth.ts
├── components/                # AppHeader, EventCard, EventChatDialog, ui/*
├── integrations/supabase/     # Auto-generated clients (do NOT edit)
└── styles.css                 # Design tokens (oklch), animations
public/                        # PWA icons, manifest, robots.txt
supabase/                      # Migrations + config
```

## 🚀 Local Setup

### Prerequisites

- **Node.js** ≥ 20 (or **Bun** ≥ 1.1)
- **Supabase** account (free tier is fine) — [see full setup guide](./SUPABASE_MIGRATION.md)
- **AI API key** from your chosen provider:
  - **Google Gemini** — https://ai.google.dev/
  - **OpenAI** — https://platform.openai.com/api-keys
  - **Anthropic** — https://console.anthropic.com/
  - **OpenRouter** — https://openrouter.ai/keys

### 1. Clone & Install

```bash
git clone <your-repo-url> eventmind
cd eventmind
npm install  # or: bun install
```

### 2. Set up Supabase

See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) for full instructions. You'll need:

1. Create a Supabase project
2. Get your API keys
3. Apply database migrations
4. (Optional) Set up Google OAuth

### 3. Environment variables

Create `.env.local` in the project root (copy from `.env.example`):

```env
# AI Provider (choose: gemini, openai, anthropic, openrouter)
VITE_AI_PROVIDER=gemini
VITE_AI_API_KEY=your_api_key_here

# Supabase (from your project → Settings → API)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** Never commit `.env.local` to git — it contains sensitive credentials.

### 4. Run

```bash
npm run dev        # http://localhost:8080 with auto-reload
npm run build      # Production build
npm run preview    # Preview production build locally
```

## 👤 Roles

| Role  | How it's granted                                | Quota          |
| ----- | ----------------------------------------------- | -------------- |
| admin | Fixed to `y2005azab@gmail.com` (via DB trigger) | Unlimited      |
| pro   | Granted by admin in the dashboard (by email)    | Unlimited      |
| user  | Default on signup                               | 20 extractions |
| anon  | No account                                      | 2 extractions  |

## 📱 PWA + Notifications

- Manifest at `public/manifest.webmanifest`, icons in `public/`.
- Dashboard shows an **Install** button (Chrome/Edge/Android) or instructions (iOS Safari → Share → Add to Home Screen).
- After install, users can enable browser notifications; reminders are scheduled client-side before each saved event.
- iOS: web push works only when the app is installed to the Home Screen (iOS 16.4+).

## 🔧 Configuration

### Switching AI Providers

Change `VITE_AI_PROVIDER` and `VITE_AI_API_KEY` in `.env.local`:

```env
# Google Gemini (default, free tier available)
VITE_AI_PROVIDER=gemini
VITE_AI_API_KEY=your_gemini_key

# OpenAI (GPT-4)
VITE_AI_PROVIDER=openai
VITE_AI_API_KEY=sk_...

# Anthropic Claude
VITE_AI_PROVIDER=anthropic
VITE_AI_API_KEY=sk-ant-...

# OpenRouter (multiple providers)
VITE_AI_PROVIDER=openrouter
VITE_AI_API_KEY=sk-or-...
```

Restart dev server for changes to take effect.

### Admin Email

The admin role is hard-coded to `y2005azab@gmail.com` in the database trigger. To change it:

1. `supabase/migrations/*_handle_new_user*.sql` (update the trigger)
2. `src/routes/_authenticated/dashboard.tsx` (update `ADMIN_EMAIL` constant)

### Email Confirmation

By default, emails are auto-confirmed (fine for prototyping). For production:

1. In Supabase → Authentication → Providers → Email
2. Turn on **Confirm email**
3. Wire up a real email provider (Resend, SendGrid, etc.)

---

## 📝 Notes for Developers

1. **Auto-generated files** (`src/integrations/supabase/*`, `src/routeTree.gen.ts`) should not be manually edited. They'll be regenerated on route/schema changes.

2. **Environment variables prefixed with `VITE_`** are exposed to the client (keep API keys in non-VITE variables on the server).

3. **Server functions** (marked with `createServerFn`) run on Vercel and cannot use Node-only APIs (`fs.watch`, `child_process`, `sharp`, native bindings).

4. **TanStack Start routing** requires files in `src/routes/`. Do not create `src/pages/` or use Next.js patterns.

5. **PWA icons** live in `public/` with absolute paths (`/icon-192.png`). Don't move them to `src/assets/`.

6. **Fonts** load from Google Fonts via `<link>` in `src/routes/__root.tsx`.

7. **Pro requests** open the user's mail client (no server-side email). Add Resend/SendGrid for real transactional email.

8. **Web Push on iOS** requires the app to be installed to the Home Screen (iOS 16.4+). Otherwise, reminders use `setTimeout` and only work when the tab is open.

## 📜 License

This project is a fully independent, production-ready repository. See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) for setup instructions.

MIT — do whatever you want, no warranty.
