
-- Update trigger: admin role ONLY for the designated email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'y2005azab@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reconcile existing admin roles: only the designated email may be admin
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (SELECT id FROM auth.users WHERE lower(email) = 'y2005azab@gmail.com');

-- Promote the designated email if it already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'y2005azab@gmail.com'
ON CONFLICT DO NOTHING;

-- Pro upgrade requests
CREATE TABLE public.pro_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  emailed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pro_requests TO authenticated;
GRANT ALL ON public.pro_requests TO service_role;

ALTER TABLE public.pro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert own pro request" ON public.pro_requests
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "read own pro request" ON public.pro_requests
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
