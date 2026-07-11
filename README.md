# EventMind AI

> **The ultimate AI-powered calendar assistant.** Transform raw text, screenshots, meeting transcripts, emails, or PDFs into perfectly formatted calendar events in seconds.

[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge)](https://event-mind-ai-joo.vercel.app/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge)](https://vercel.com/)

EventMind AI bridges the gap between unstructured schedules (emails, timetables, message threads, screenshots) and your calendar. It leverages state-of-the-art Generative AI to extract dates, times, descriptions, and locations, checks for conflicts, and lets you export directly to your preferred calendar provider.

🔗 **Try it live:** [https://event-mind-ai-joo.vercel.app/](https://event-mind-ai-joo.vercel.app/)

---

## 🚀 Key Features

*   **🤖 Smart AI Extraction**
    *   Extracts single or multiple events simultaneously (ideal for itineraries, flight confirmations, or exam schedules).
    *   Intelligent date inference (handles missing years, relative days like "next Friday", and platform links).
    *   Automatically categorizes events and suggests logical reminder times (e.g., flights get 24-hour reminders, meetings get 30-minute reminders).
*   **💬 Interactive Natural Language Refinement**
    *   Refine extracted events dynamically using a chat assistant (e.g., *"Move the meeting to next Tuesday at 3 PM and set the location to Zoom"*).
*   **📅 Seamless Sync & Export**
    *   One-click links to pre-fill **Google Calendar**, **Outlook Calendar**, and **Yahoo Calendar**.
    *   Instantly generate and download **universal `.ics` files** for Apple Calendar, Windows Mail, and offline clients.
*   **🛡️ Conflict & Duplicate Detection**
    *   Queries your existing schedules to check for time overlaps or duplicate events before saving.
*   **👥 Role-Based Access Control**
    *   **Admin Panel:** Grant or revoke Pro access by user email, check total extractions, and manage global system stats.
    *   **Pro Users:** Unlimited AI extractions.
    *   **Free Users:** 20 AI extractions per month (with pre-filled request forms for Pro access).
*   **📱 Native Progressive Web App (PWA)**
    *   Fully installable on iOS, Android, and desktop.
    *   Supports offline operation capabilities and schedules client-side reminders.

---

## 🛠️ Tech Stack & Architecture

### Frontend & Routing
*   **Framework:** [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (React 19 + Vite 8, featuring server-side rendering (SSR) and server functions).
*   **Routing:** TanStack Router (fully type-safe, file-based routing).
*   **Styling:** Tailwind CSS v4 with custom `oklch` color systems, smooth transitions, and premium dark/light themes.
*   **Components:** Custom components built on Radix UI primitives.

### Backend & Integrations
*   **Database:** Supabase PostgreSQL with robust Row-Level Security (RLS) policies.
*   **Auth:** Supabase Auth supporting Email/Password (auto-confirm optional) and Google OAuth login.
*   **Server Engine:** Nitro (powers the compiled build and hooks directly into Vercel Serverless Functions).
*   **AI Engine:** Direct API integration with `gemini-3.5-flash` via structured JSON outputs.

---

## 📁 Repository Structure

```
├── public/                    # PWA icons, webmanifest, robots.txt
├── src/
│   ├── routes/                # File-based routing (TanStack Router)
│   │   ├── __root.tsx         # HTML shell, PWA setup, globally loaded assets
│   │   ├── index.tsx          # Landing page & core universal extractor
│   │   ├── auth.tsx           # Email sign-in/up and Google OAuth handler
│   │   └── _authenticated/    # Protected route sub-tree
│   │       ├── route.tsx      # Authentication gate middleware
│   │       └── dashboard.tsx  # Event history, profile, and Admin Control Panel
│   ├── components/            # Reusable UI parts & custom Shadcn primitives
│   ├── integrations/supabase/ # Generated types and clients (auth & DB queries)
│   ├── lib/
│   │   ├── ai-provider.ts     # Safe, client-guarded AI API client wrapper
│   │   ├── calendar.ts        # Direct-link generators (.ics file builder)
│   │   ├── extract.functions.ts # AI parsing server functions
│   │   └── pro.functions.ts   # Admin tools (bypasses RLS using service keys)
│   └── styles.css             # Design tokens, themes, animations
├── supabase/                  # Local config and database migrations
├── vercel.json                # Vercel deployment configuration
└── vite.config.ts             # Vite/Nitro configuration
```

---

## 🚀 Local Development Setup

Follow these steps to run the project locally on your machine:

### 1. Prerequisites
*   Node.js ≥ 20 (or Bun ≥ 1.1)
*   A free [Supabase](https://supabase.com) account
*   A free [Google AI Studio API Key](https://aistudio.google.com/)

### 2. Clone the Repository
```bash
git clone https://github.com/joo156/EventMind-ai.git
cd EventMind-ai
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root of the project (copy from `.env.example`):
```env
# AI API Key (Gemini)
VITE_AI_PROVIDER=gemini
VITE_AI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Supabase Credentials (from Settings -> API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Server-side Keys
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Apply Database Schema
Apply the SQL migration scripts located in the `supabase/migrations/` directory directly into your Supabase SQL Editor, or use the Supabase CLI:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 5. Start the Application
```bash
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 🌐 Production Deployment

This project is optimized to run as a serverless application on **Vercel**:

1.  Connect your GitHub account to **Vercel**.
2.  Import your **`EventMind-ai`** repository.
3.  Set the **Framework Preset** to **`TanStack Start`**.
4.  Add all variables from your local `.env.local` file under **Environment Variables**.
5.  Click **Deploy**.
6.  Update your **Redirect URLs** in your Supabase Auth settings to match your Vercel domain (`https://your-app.vercel.app/auth`).

---

## 📜 License

This project is a fully independent, production-ready repository.

Distributed under the MIT License. See `LICENSE` for more information.
