-- ============================================================================
-- PrepPulse Initial Database Schema Migration
-- Migration: 20260824000001_initial_schema.sql
-- ============================================================================

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Modules Table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for public demo modules
  title TEXT NOT NULL,
  description TEXT,
  module_type TEXT CHECK (module_type IN ('quiz', 'exam')) NOT NULL,
  subject TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_json JSONB NOT NULL,
  source_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Questions Table (Relational decomposition for indexing & querying)
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  checkpoint_tier INT DEFAULT 1 NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'multi_select', 'true_false')) NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of { id: string, text: string }
  correct_option_ids JSONB NOT NULL, -- Array of string IDs
  explanation TEXT NOT NULL,
  source_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Test Sessions Table (Log of completed or in-progress attempts)
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for guest sessions if synced
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT CHECK (session_type IN ('quiz', 'exam')) NOT NULL,
  status TEXT CHECK (status IN ('in_progress', 'passed', 'failed', 'completed')) NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL DEFAULT 0,
  score_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  checkpoint_reached INT DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- 5. Indexes for Performance & Scalability
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_modules_user_id ON public.modules(user_id);
CREATE INDEX IF NOT EXISTS idx_modules_module_type ON public.modules(module_type);
CREATE INDEX IF NOT EXISTS idx_questions_module_id ON public.questions(module_id);
CREATE INDEX IF NOT EXISTS idx_questions_module_checkpoint ON public.questions(module_id, checkpoint_tier);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON public.test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_module_id ON public.test_sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON public.test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_module ON public.test_sessions(user_id, module_id);

-- ============================================================================
-- 6. Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Modules Policies (Supports private user modules + public demo modules where user_id IS NULL)
CREATE POLICY "Users can view own or public demo modules"
  ON public.modules FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own modules"
  ON public.modules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own modules"
  ON public.modules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own modules"
  ON public.modules FOR DELETE
  USING (auth.uid() = user_id);

-- Questions Policies
CREATE POLICY "Users can view questions of accessible modules"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = questions.module_id
        AND (modules.user_id = auth.uid() OR modules.user_id IS NULL)
    )
  );

CREATE POLICY "Users can insert questions to own modules"
  ON public.questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = questions.module_id
        AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions of own modules"
  ON public.questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = questions.module_id
        AND modules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions of own modules"
  ON public.questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE modules.id = questions.module_id
        AND modules.user_id = auth.uid()
    )
  );

-- Test Sessions Policies
CREATE POLICY "Users can view own test sessions"
  ON public.test_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert test sessions"
  ON public.test_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own test sessions"
  ON public.test_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- 7. Trigger Functions (Auth Sync & Updated At)
-- ============================================================================

-- Automatically create profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_modules_updated_at ON public.modules;
CREATE TRIGGER handle_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
