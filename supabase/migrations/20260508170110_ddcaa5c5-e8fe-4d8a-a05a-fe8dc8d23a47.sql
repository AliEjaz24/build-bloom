
-- Dedupe room conflicts (keep newest)
DELETE FROM public.timetable_slots a
USING public.timetable_slots b
WHERE a.room_id IS NOT NULL
  AND a.room_id = b.room_id
  AND a.day = b.day
  AND a.slot_index = b.slot_index
  AND a.id <> b.id
  AND a.created_at < b.created_at;

-- Dedupe teacher conflicts (keep newest)
DELETE FROM public.timetable_slots a
USING public.timetable_slots b
WHERE a.teacher_id IS NOT NULL
  AND a.teacher_id = b.teacher_id
  AND a.day = b.day
  AND a.slot_index = b.slot_index
  AND a.id <> b.id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS timetable_room_slot_unique
  ON public.timetable_slots (room_id, day, slot_index)
  WHERE room_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS timetable_teacher_slot_unique
  ON public.timetable_slots (teacher_id, day, slot_index)
  WHERE teacher_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  start_date date,
  end_date date,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.term_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  section text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.term_datesheet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('midterm','final')),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_date date,
  slot_index int,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.term_week_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  week int NOT NULL CHECK (week BETWEEN 1 AND 16),
  day int NOT NULL CHECK (day BETWEEN 0 AND 4),
  label text NOT NULL DEFAULT 'Regular Classes',
  color text DEFAULT 'green',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term_id, week, day)
);

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_datesheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_week_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terms read" ON public.terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "terms admin write" ON public.terms FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "term_courses read" ON public.term_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "term_courses admin write" ON public.term_courses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "term_datesheet read" ON public.term_datesheet FOR SELECT TO authenticated USING (true);
CREATE POLICY "term_datesheet admin write" ON public.term_datesheet FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "term_week_plan read" ON public.term_week_plan FOR SELECT TO authenticated USING (true);
CREATE POLICY "term_week_plan admin write" ON public.term_week_plan FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.terms (code, label) VALUES
  ('F22-S','F22 Spring'), ('F22-F','F22 Fall'),
  ('F23-S','F23 Spring'), ('F23-F','F23 Fall'),
  ('F24-S','F24 Spring'), ('F24-F','F24 Fall'),
  ('F25-S','F25 Spring'), ('F25-F','F25 Fall')
ON CONFLICT (code) DO NOTHING;
