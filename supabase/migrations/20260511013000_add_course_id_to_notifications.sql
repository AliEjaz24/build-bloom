
ALTER TABLE public.notifications ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

-- Update RLS for notifications to allow reading if the user is registered for the course
CREATE POLICY "notif read if registered" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    course_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.registrations 
      WHERE student_id = auth.uid() 
      AND course_id = public.notifications.course_id
    )
  );
