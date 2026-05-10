
CREATE TABLE IF NOT EXISTS public.notification_reads (
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own read status" ON public.notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see their own read status" ON public.notification_reads
  FOR SELECT USING (auth.uid() = user_id);
