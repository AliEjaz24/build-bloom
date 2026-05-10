
ALTER TABLE public.notifications ADD COLUMN batch text;
ALTER TABLE public.notifications ADD COLUMN section text;

-- Update RLS: Students can see notifications where audience is 'student' AND (batch/section are null OR match their profile)
DROP POLICY IF EXISTS "notif read if student audience" ON public.notifications;
CREATE POLICY "notif read student personalized" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (audience = 'student') AND
    (batch IS NULL OR batch = (SELECT batch::text FROM public.profiles WHERE id = auth.uid())) AND
    (section IS NULL OR section = (SELECT section FROM public.profiles WHERE id = auth.uid()))
  );
