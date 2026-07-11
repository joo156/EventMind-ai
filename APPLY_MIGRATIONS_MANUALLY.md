# EventMind AI - Manual Supabase Migration Guide

**IMPORTANT**: Apply these migrations in order (by file name). Copy-paste each SQL block into the Supabase SQL Editor.

---

## ✅ Setup Complete

- Your `.env.local` has been created with your Supabase credentials
- All migration SQL files are below
- Follow these steps to apply them

---

## 📋 Steps to Apply Migrations

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com
   - Select your project: `ivrgyeayqsjfwoxbksjk`

2. **Open SQL Editor**
   - Left sidebar → **SQL Editor**
   - Click **"New Query"**

3. **Apply Each Migration** (in this exact order):
   - Copy the SQL below
   - Paste it into the SQL Editor
   - Click **"Run"** (top right)
   - Wait for "Success!" message
   - Then move to the next migration

---

## 🔧 Migration 1 of 6

**File**: `20260711151242_7f033ae9-3e6f-43e9-ab37-fa624a1184ec.sql`

Copy and paste this entire SQL block:

```sql
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  monthly_imports_used INT NOT NULL DEFAULT 0,
  monthly_period TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Extractions (import batches)
CREATE TABLE public.extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_text TEXT,
  source_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  event_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extractions TO authenticated;
GRANT ALL ON public.extractions TO service_role;
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own extractions" ON public.extractions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES public.extractions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  start_date DATE,
  start_time TEXT,
  end_date DATE,
  end_time TEXT,
  all_day BOOLEAN DEFAULT false,
  timezone TEXT,
  location TEXT,
  meeting_link TEXT,
  meeting_platform TEXT,
  organizer TEXT,
  guests TEXT[],
  description TEXT,
  category TEXT,
  priority TEXT,
  confidence INT,
  reminder_minutes INT,
  repeat_rule TEXT,
  tags TEXT[],
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_exported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events" ON public.events FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX events_user_start_idx ON public.events(user_id, start_date);

-- Event chat (AI assistant edits)
CREATE TABLE public.event_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.event_chats TO authenticated;
GRANT ALL ON public.event_chats TO service_role;
ALTER TABLE public.event_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chats" ON public.event_chats FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto profile + first-user-admin trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Monthly quota helpers
CREATE OR REPLACE FUNCTION public.increment_monthly_import(_user_id uuid) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_period TEXT := to_char(now(), 'YYYY-MM'); new_count INT;
BEGIN
  UPDATE public.profiles
  SET monthly_imports_used = CASE WHEN monthly_period = current_period THEN monthly_imports_used + 1 ELSE 1 END,
      monthly_period = current_period
  WHERE id = _user_id
  RETURNING monthly_imports_used INTO new_count;
  RETURN new_count;
END $$;
```

✅ After clicking "Run", you should see: **Query executed successfully**

---

## 🔧 Migration 2 of 6

**File**: `20260711151249_9e496b22-31af-4b5f-ab1d-a4402d23d5ab.sql`

```sql
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_monthly_import(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
```

---

## 🔧 Migration 3 of 6

**File**: `20260711151300_8033897c-8637-4cc2-ae9d-edb7945e6e6f.sql`

```sql
CREATE TABLE public.pro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.pro_requests TO authenticated;
GRANT ALL ON public.pro_requests TO service_role;
ALTER TABLE public.pro_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pro_requests" ON public.pro_requests FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.grant_pro(_email TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = _email;
  IF user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (user_id, 'pro') ON CONFLICT DO NOTHING;
    DELETE FROM public.pro_requests WHERE user_id = user_id;
  END IF;
END $$;
```

---

## 🔧 Migration 4 of 6

**File**: `20260711161122_97cfcbaa-32e5-4d31-9d86-28e44ea9aa45.sql`

```sql
-- Update admin only to specific email (you can change this to your email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'y2005azab@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 🔧 Migration 5 of 6

**File**: `20260711161938_c5f6d18e-2d7c-424b-82e1-fdd22751a613.sql`

```sql
CREATE TYPE public.app_role_extended AS ENUM ('admin', 'pro', 'user');

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role_extended public.app_role_extended;

UPDATE public.user_roles SET role_extended = role::text::public.app_role_extended
WHERE role_extended IS NULL;

-- Optional: Create RLS policy for roles
CREATE POLICY "anyone can check if user is pro" ON public.user_roles
FOR SELECT USING (true);
```

---

## 🔧 Migration 6 of 6

**File**: `20260711185809_add_users_table.sql`

```sql
-- This migration adds additional user tracking
-- Leave this migration if it conflicts with your existing setup
-- It's optional but recommended for advanced features
```

---

## ✅ After All Migrations Are Applied

1. **Verify Tables Were Created**
   - Go to **Data** (left sidebar)
   - You should see: `profiles`, `events`, `user_roles`, `extractions`, `event_chats`, `pro_requests`

2. **Test Your Setup**
   - Return to terminal
   - Run: `npm run dev`
   - Navigate to: http://localhost:5173/auth
   - Try signing up with an email

3. **If You Need Help**
   - Check the [Troubleshooting](#troubleshooting) section below

---

## 🐛 Troubleshooting

### "Relation already exists"

- One of the migrations was already applied
- That's fine! Skip that migration and continue with the next one

### "Invalid input syntax for type uuid"

- Make sure you're copying the exact SQL (no extra characters)
- Try pasting into a text editor first, then to Supabase SQL editor

### "Permission denied for schema public"

- Your Supabase role might not have permissions
- Try connecting as the service role (via Supabase dashboard)
- Or ask support@supabase.io for help

### Still getting errors?

- Copy the exact error message
- Contact Supabase support or check their documentation

---

## ✨ Next Steps

1. **Get an AI API Key** (from Google Gemini, OpenAI, Anthropic, or OpenRouter)
2. **Add it to `.env.local`**:
   ```
   VITE_AI_API_KEY=your_key_here
   VITE_AI_PROVIDER=gemini
   ```
3. **Run dev server**: `npm run dev`
4. **Test event extraction** by pasting text in the app

---

Good luck! 🚀
