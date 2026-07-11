# Supabase Migration Guide

This guide walks you through migrating EventMind AI to your own independent Supabase instance.

## Prerequisites

- A Supabase account (free at https://supabase.com)
- The database migrations already configured in `supabase/migrations/`
- Your API keys ready to configure

---

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Select your organization and fill in:
   - **Name**: `eventmind-ai` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free (you can upgrade later)
4. Click **"Create new project"** and wait for it to initialize (5-10 minutes)

---

## Step 2: Retrieve Your API Keys

Once your project is created:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Public Key** → `VITE_SUPABASE_ANON_KEY`

3. Save these for Step 5

---

## Step 3: Apply Database Migrations

The migrations in `supabase/migrations/` are already set up for your database. They create:

- `events` table with full event data
- `event_tags` join table for event categorization
- Row-level security (RLS) policies for user data isolation
- User roles (admin, pro, user) with permission hierarchy

### Apply Migrations Automatically (Recommended)

The Supabase CLI will apply these automatically when you deploy:

```bash
npm install -g supabase
supabase link --project-ref YOUR_PROJECT_REF
or :
npx supabase link --project-ref ivrgyeayqsjfwoxbksjk


supabase db push
```

Replace `YOUR_PROJECT_REF` with your project ref (find it in Supabase → Settings → API).

### Apply Migrations Manually

If you prefer, you can copy-paste each migration SQL into the Supabase SQL editor:

1. Go to Supabase → **SQL Editor**
2. For each file in `supabase/migrations/`:
   - Open the file (e.g., `20260711151242_*.sql`)
   - Copy the entire SQL
   - Paste into Supabase SQL Editor
   - Click **"Run"**
3. Repeat for all migration files in order

---

## Step 4: Configure Google OAuth (Optional but Recommended)

To enable "Continue with Google" authentication:

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google+ API**
4. Create OAuth 2.0 credentials (OAuth consent screen):
   - Application type: Web
   - Authorized redirect URIs:
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/v1/callback` (for local dev)
5. Copy your **Client ID** and **Client Secret**
6. In Supabase → **Authentication** → **Providers** → **Google**:
   - Enable Google
   - Paste your Client ID and Client Secret
   - Click **"Save"**

---

## Step 5: Update Your Environment Variables

Create a `.env.local` file in the project root (copy from `.env.example`):

```bash
# AI Provider (choose one: gemini, openai, anthropic, openrouter)
VITE_AI_PROVIDER=gemini
VITE_AI_API_KEY=your_api_key_here

# Supabase (from Step 2)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important**: Never commit `.env.local` to git. It contains sensitive credentials.

---

## Step 6: Verify Everything Works

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:5173/auth`

3. Test:
   - **Email/Password signup**: Create an account with your email
   - **Email/Password signin**: Sign in with your credentials
   - **Google OAuth**: Click "Continue with Google" (if configured)

4. After signing in, you should see the dashboard

---

## Step 7: Configure Your AI Provider

Choose one AI provider and get your API key:

### Option A: Google Gemini (Recommended for Free Tier)

1. Go to [https://ai.google.dev/](https://ai.google.dev/)
2. Click **"Get API Key"**
3. Create a new API key
4. Copy it to `VITE_AI_API_KEY` in `.env.local`
5. Set `VITE_AI_PROVIDER=gemini`

### Option B: OpenAI

1. Go to [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2. Create a new API key
3. Copy it to `VITE_AI_API_KEY` in `.env.local`
4. Set `VITE_AI_PROVIDER=openai`

### Option C: Anthropic Claude

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Create a new API key
3. Copy it to `VITE_AI_API_KEY` in `.env.local`
4. Set `VITE_AI_PROVIDER=anthropic`

### Option D: OpenRouter (Multi-Provider)

1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Create a new API key
3. Copy it to `VITE_AI_API_KEY` in `.env.local`
4. Set `VITE_AI_PROVIDER=openrouter`

---

## Step 8: Test Event Extraction

1. In your dashboard, try adding an event via AI:
   - Click **"+ Add Event"** or the AI import button
   - Paste text like: `"Lunch with John on Friday 2pm at Downtown Café"`
   - The AI should extract: Title, date, time, location
   - If it works, your AI provider is correctly configured!

---

## Troubleshooting

### "Cannot find module '@integrations/supabase'"

- Run `npm install` again to ensure all dependencies are installed

### "VITE_SUPABASE_URL missing"

- Check `.env.local` exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your dev server: `npm run dev`

### "Invalid API key for Google Gemini"

- Verify your `VITE_AI_API_KEY` is correct
- Make sure you're using the right provider key (OpenAI keys won't work with Gemini, etc.)
- Check API key hasn't been revoked in the provider console

### "Google OAuth not working"

- Verify redirect URIs are correct in Google Cloud Console
- Make sure OAuth is enabled in Supabase Authentication settings
- Test with email/password first to isolate OAuth issues

### "Database migrations failed"

- Make sure you applied all migrations in order
- Check Supabase SQL Editor for error messages
- Verify you have the correct project ref

---

## Next Steps

After Supabase is set up:

1. **Configure for Vercel**: Set environment variables in Vercel → Project Settings → Environment Variables
2. **Deploy**: Push to your GitHub repo connected to Vercel
3. **Scale**: Monitor usage and upgrade Supabase plan if needed

---

## Support

If you encounter issues:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review [EventMind AI README](./README.md)
3. Check environment variables are correctly set
4. Verify API keys haven't been revoked
