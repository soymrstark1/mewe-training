
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'superadmin');

-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create presentation_slides table
CREATE TABLE public.presentation_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('es', 'en')),
  slide_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.presentation_slides ENABLE ROW LEVEL SECURITY;

-- Create global_settings table
CREATE TABLE public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_presentation_slides_updated_at BEFORE UPDATE ON public.presentation_slides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_global_settings_updated_at BEFORE UPDATE ON public.global_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: users table
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Block anon users" ON public.users FOR SELECT TO anon USING (false);

-- RLS: user_roles table
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Superadmins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Block anon from roles" ON public.user_roles FOR SELECT TO anon USING (false);

-- RLS: presentation_slides table
CREATE POLICY "Anyone can view slides" ON public.presentation_slides FOR SELECT USING (true);
CREATE POLICY "Superadmins can insert slides" ON public.presentation_slides FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins can update slides" ON public.presentation_slides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins can delete slides" ON public.presentation_slides FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS: global_settings table
CREATE POLICY "Anyone can view settings" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated can update settings" ON public.global_settings FOR UPDATE TO authenticated USING (true);

-- Storage bucket for presentation slides
INSERT INTO storage.buckets (id, name, public) VALUES ('presentation-slides', 'presentation-slides', true);

-- Storage policies
CREATE POLICY "Public can view presentation slides" ON storage.objects FOR SELECT USING (bucket_id = 'presentation-slides');
CREATE POLICY "Superadmins can upload slides" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'presentation-slides' AND public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins can update slides" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'presentation-slides' AND public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins can delete slides" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'presentation-slides' AND public.has_role(auth.uid(), 'superadmin'));
